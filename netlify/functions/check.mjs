// /.netlify/functions/check   ("Make it fail": two different AIs check each other, PRD FR10)
//   POST ?id=...&step=check  -> { checks }
//       A second AI (NVIDIA, or Claude Haiku as the backup) checks every summary point, warning and
//       plan step Claude wrote against its clause, and lists risky clauses no warning covers.
//   POST ?id=...&step=fix    -> { checks, summary, risks, tailored }
//       Claude rewrites what was found wrong and writes warnings for the missed clauses. The code
//       checks (verify.mjs) look at every fix first, then the second AI checks the fixes once more.
//       Anything still not right shows its clause with "We couldn't explain this one clearly…".
// Each step is its own function call, so neither goes near the 30s limit, and runs after the
// results are already on screen. A warning is never dropped, and warnings keep their positions
// (marks on "You decide" and "Why this matters" lines refer to them).

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { jsonFrom, timeBudget, SECOND_CHECKER, NVIDIA_CHECK_MODEL, CLAUDE_CHECK_MODEL } from '../lib/ai.mjs';
import { checkSystem, FIX_SYSTEM, clausesForPrompt, NOT_SURE_BY_LANG } from '../lib/prompts.mjs';
import { clauseLookup, withReferencedParts } from '../lib/contract-task.mjs';
import { cleanText, cleanAdvice } from '../lib/wording.mjs';
import { checkPoint, locateQuote, unsupportedFacts, norm } from '../lib/verify.mjs';
import { CATEGORIES, SCAM_EVIDENCE, DEFAULT_TITLES, clauseOnly } from './risks.mjs';

// How long to wait for NVIDIA before using Claude's check (started at the same time). The app waits
// at most 20s for the whole double check, so the first check gets 10s and the second look 7s.
const CHECK_MS = 10000;
const RECHECK_MS = 7000;
// Only the most serious missed risks become new warnings, so the list stays focused.
const MAX_MISSED = 2;
const FIELDS = 'contract_type,language,raw_text,clauses,summary,risks,tailored,situation,checks,translations';
const PART_NAME = { summary: 'summary point', risks: 'warning', plan: 'plan step' };
// The problem each existing warning is about, so the missed-risk check can tell that a warning
// about who receives a payment (or when) does not cover having to pay it at all.
const PROBLEM = {
  pay_to_start: 'having to pay to get or start the job', personal_account: "paying into a person's own account",
  pressure: 'pressure to sign or pay quickly', credentials: 'asking for passwords or OTPs', company_details: 'company details missing',
  non_compete: 'limits on working elsewhere', probation: 'probation terms', one_sided_change: 'the other side changing the terms',
  fee: 'a fee or charge you must pay', renewal: 'automatic renewal', cancellation: 'the cost of leaving early', other: 'other',
};

// Everything Claude wrote that can be checked against a clause. The "No UEN" / "company details"
// warning comes from a rule in code (about what is missing), so it is not sent.
function itemsToCheck(row) {
  const items = [];
  (row.summary || []).forEach((s, i) => {
    if (s.found !== false && s.plain_text && s.checked !== 'unclear') {
      items.push({ id: `summary:${i}`, part: 'summary', index: i, label: s.label, text: s.plain_text, clause_numbers: s.clause_numbers || [] });
    }
  });
  (row.risks?.items || []).forEach((r, i) => {
    if (r.category !== 'company_details' && r.checked !== 'unclear') {
      items.push({ id: `risk:${i}`, part: 'risks', index: i, label: r.title, text: `${r.title}. ${r.explanation || ''}`.trim(), clause_numbers: r.clause_numbers || [], kind: r.kind });
    }
  });
  (row.tailored?.plan || []).forEach((p, i) => {
    if (p.checked !== 'unclear') items.push({ id: `plan:${i}`, part: 'plan', index: i, label: `Step ${i + 1}`, text: p.text, clause_numbers: p.clause_numbers || [] });
  });
  return items;
}

// Claude goes through every item and notes each fact before its verdict; NVIDIA lists only what is
// wrong (a shorter answer, so it fits in its 15s).
const itemsPrompt = (lang) => (provider) => checkSystem(lang, 'items', { notesFirst: provider === 'claude' });

const itemLine = (it) => `ID ${it.id} (${it.part === 'summary' ? `summary point "${it.label}"` : PART_NAME[it.part]}, cites ${it.clause_numbers.join(', ') || 'nothing'}): ${it.text}`;

// Each "wrong" must come with evidence code can check, like every other AI output in the app:
// the item really says the words called wrong, the contract words are copied exactly, and for a
// changed fact the two differ; an "invented" fact must not be in the item's own clauses after all.
// -> '' if the evidence holds up, else why not.
function evidenceProblem(v, it, clauses) {
  const type = ['changed', 'invented', 'missing'].includes(v?.type) ? v.type : 'changed';
  const itemSays = String(v?.item_says ?? '').trim();
  const clauseSays = String(v?.clause_says ?? '').trim();
  if (type !== 'missing' && (!itemSays || !norm(it.text).includes(norm(itemSays)))) return 'the words it calls wrong are not in the item';
  if (type !== 'invented' && (!clauseSays || !locateQuote(clauses, clauseSays))) return 'its contract words are not in the contract';
  if (type === 'changed' && norm(itemSays) === norm(clauseSays)) return 'the item says the same as the contract';
  if (type === 'invented') {
    const own = clauses.filter((c) => it.clause_numbers.includes(c.number)).map((c) => c.text);
    if (own.length && /\d|[A-Z]{2,}/.test(itemSays) && !unsupportedFacts(itemSays, own).length) return 'those facts are in its clauses';
  }
  return '';
}

// Asks the second checker. NVIDIA first (unless SECOND_CHECKER=claude); Claude Haiku if NVIDIA is
// off, fails or takes longer than `nvidiaWaitMs` (Claude runs alongside). `system(provider)` gives each its prompt. -> { ai, checker, backup, ms }
async function askChecker(prefer, system, user, timeLeft, maxTokens, nvidiaWaitMs = CHECK_MS) {
  const started = Date.now();
  const messages = (provider) => [{ role: 'system', content: system(provider) }, { role: 'user', content: user }];
  // Claude starts at the same time as NVIDIA, so if NVIDIA is slow or fails its answer is already
  // (nearly) there: the whole double check then fits the 20 seconds the app waits for it.
  const claude = jsonFrom('claude', { model: CLAUDE_CHECK_MODEL, thinking: false, maxTokens: maxTokens * 2, messages: messages('claude') }, {
    hedgeAfterMs: 6000,
    timeoutMs: Math.max(4000, Math.min(12000, timeLeft() - 2000)),
    busyMessage: 'The second check took too long. Please try again.',
  });
  claude.catch(() => {}); // only used if NVIDIA doesn't answer in time
  // Why Claude checked instead (shown in the judge view): off, timeout or error.
  let backup = prefer === 'nvidia' ? null : 'off';
  if (prefer === 'nvidia') {
    try {
      const ai = await jsonFrom('nvidia', { model: NVIDIA_CHECK_MODEL, thinking: false, maxTokens, messages: messages('nvidia') }, {
        hedgeAfterMs: nvidiaWaitMs + 5000, // one request only: no second try
        timeoutMs: Math.min(nvidiaWaitMs, timeLeft() - 8000),
      });
      return { ai, checker: 'nvidia', backup: null, ms: Date.now() - started };
    } catch (err) {
      backup = err.status === 504 ? 'timeout' : 'error';
      console.log(`Second check: NVIDIA ${backup === 'timeout' ? `took longer than ${nvidiaWaitMs / 1000} seconds` : 'did not answer'} (${err.message}); Claude's check is used.`);
    }
  }
  const ai = await claude;
  return { ai, checker: 'claude', backup, ms: Date.now() - started };
}

export default async (req) => {
  const timeLeft = timeBudget();
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');
    const step = new URL(req.url).searchParams.get('step');
    if (!['check', 'fix'].includes(step)) throw new HttpError(400, 'Nothing to do.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=${FIELDS}&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
    if (!row.summary || !row.risks) throw new HttpError(409, 'The summary and risk check are not ready yet.');
    const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);
    const lang = NOT_SURE_BY_LANG[row.language] ? row.language : 'en';

    if (step === 'check') {
      if (row.checks) return Response.json({ checks: row.checks });
      const checks = await runCheck(row, clauses, lang, timeLeft);
      await updateContract(query, { checks });
      return Response.json({ checks });
    }

    if (row.checks?.stage !== 'checked') return Response.json({ checks: row.checks, summary: row.summary, risks: row.risks, tailored: row.tailored });
    const result = await runFix(row, clauses, lang, timeLeft);
    // Save only if the parts weren't remade meanwhile (e.g. new "Tell us about you" words).
    const [latest] = await selectContracts(`select=summary,risks,tailored,translations&${query}`);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const fields = { checks: result.checks };
    const translations = latest?.translations || {};
    if (same(latest?.summary, row.summary) && !same(result.summary, row.summary)) {
      fields.summary = result.summary;
      for (const l of Object.keys(translations)) delete translations[l].summary;
    }
    if (same(latest?.risks, row.risks) && !same(result.risks, row.risks)) {
      fields.risks = result.risks;
      for (const l of Object.keys(translations)) delete translations[l].risks;
    }
    if (row.tailored && same(latest?.tailored, row.tailored) && !same(result.tailored, row.tailored)) {
      fields.tailored = result.tailored;
      for (const l of Object.keys(translations)) delete translations[l].tailored;
    }
    fields.translations = translations;
    await updateContract(query, fields);
    return Response.json({ checks: result.checks, summary: fields.summary || latest?.summary, risks: fields.risks || latest?.risks, tailored: fields.tailored || latest?.tailored });
  } catch (err) {
    return errorResponse(err);
  }
};

// Step 1: the second AI's verdicts. `stage` is "done" if nothing needs fixing, else "checked".
async function runCheck(row, clauses, lang, timeLeft) {
  const items = itemsToCheck(row);
  const lookup = clauseLookup(clauses);
  // Two parts at the same time, each with its own NVIDIA -> Claude backup: the items against only
  // the clauses they cite (a short prompt answers sooner), and the whole contract for missed risks.
  const cited = new Set(items.flatMap((it) => it.clause_numbers));
  const citedParts = withReferencedParts(clauses, clauses.filter((c) => cited.has(c.number)));
  const warnings = (row.risks.items || []).map((r) => `- [${PROBLEM[r.category] || PROBLEM.other}] ${r.title} (${(r.clause_numbers || []).join(', ')})`);
  const [itemsPart, missedPart] = await Promise.all([
    askChecker(SECOND_CHECKER, itemsPrompt(lang), `ITEMS TO CHECK:\n${items.map(itemLine).join('\n')}\n\nTHE CONTRACT PARTS THEY CITE:\n${clausesForPrompt(citedParts).slice(0, 30000)}`, timeLeft, 1500),
    askChecker(SECOND_CHECKER, (provider) => checkSystem(lang, 'missed', { notesFirst: provider === 'claude' }), `WARNINGS ALREADY GIVEN:\n${warnings.join('\n') || '(none)'}\n\nTHE CONTRACT:\n${clausesForPrompt(clauses).slice(0, 40000)}`, timeLeft, 800),
  ]);
  const ai = { ...itemsPart.ai, missed: missedPart.ai?.missed };
  if (process.env.CLAUSEWISE_DEBUG) console.log('  missed-risk answer:', JSON.stringify(missedPart.ai).slice(0, 2000));
  const checker = itemsPart.checker;
  const backup = itemsPart.backup || missedPart.backup;
  const ms = Math.max(itemsPart.ms, missedPart.ms);

  const byId = new Map(items.map((it) => [it.id, it]));
  const wrong = [];
  if (process.env.CLAUSEWISE_DEBUG) console.log('  second check answer:', JSON.stringify(ai).slice(0, 1500));
  // The checker lists only what is wrong (a shorter answer comes back sooner), each marked
  // "verdict": "wrong"; an entry it doesn't mark wrong is not counted.
  const verdicts = (Array.isArray(ai?.wrong) ? ai.wrong : Array.isArray(ai?.items) ? ai.items : []).filter((v) => v?.verdict === 'wrong');
  for (const v of verdicts) {
    const it = byId.get(String(v?.id ?? '').trim());
    if (!it || wrong.some((w) => w.id === it.id)) continue;
    const problem = evidenceProblem(v, it, clauses);
    if (problem) {
      console.log(`Second check: ignored "${it.id} is wrong" (${problem}): ${String(v?.reason ?? '').slice(0, 120)}`);
      continue;
    }
    // A scam sign has already passed the code's evidence check (its quote shows the pattern): the
    // second AI can question it but not weaken it, so it is noted, never rewritten (`scam`).
    wrong.push({ id: it.id, part: it.part, index: it.index, label: it.label, before: it.text, clause_numbers: it.clause_numbers, reason: cleanText(String(v.reason ?? ''), 200), scam: it.kind === 'scam_sign' });
  }
  // Missed risks: only real clauses that no warning already covers, most serious first, at most 2.
  const covered = new Set((row.risks.items || []).flatMap((r) => r.clause_numbers || []));
  // A serious payment (to start the job, a fee or deposit that may be kept, a fixed penalty) from the
  // backup's payments list is missed unless a warning about paying cites that clause: a warning about
  // who gets the money or when it is due doesn't cover it. Decided here, not by the AI. These come first.
  // The same payment can show in two clauses (S$350 in 5.3, and "pay it within 2 days" in 5.4), so
  // payments are matched by amount too, and each amount is listed once.
  const PAYING = ['pay_to_start', 'fee', 'non_compete', 'cancellation'];
  const amounts = (text) => (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => n >= 10);
  const payingWarnings = (row.risks.items || []).filter((r) => PAYING.includes(r.category));
  const warnedAmounts = new Set(payingWarnings.flatMap((r) => amounts(`${r.title} ${r.explanation} ${r.quote}`)));
  const payWarned = (p) => payingWarnings.some((r) => (r.clause_numbers || []).includes(p.clause)) || p.amounts.some((n) => warnedAmounts.has(n));
  const seenAmounts = new Set();
  const serious = (Array.isArray(missedPart.ai?.payments) ? missedPart.ai.payments : [])
    .filter((p) => p?.serious === true)
    .map((p) => ({ clause: lookup(String(p.clause ?? '').replace(/[[\]]/g, '').trim()), reason: p.what, payment: true, amounts: amounts(p.what) }))
    .filter((p) => p.clause && !payWarned(p))
    .filter((p) => !p.amounts.some((n) => seenAmounts.has(n)) && (p.amounts.forEach((n) => seenAmounts.add(n)), true));
  const missed = [];
  for (const m of [...serious, ...(Array.isArray(ai?.missed) ? ai.missed : [])]) {
    const clause = lookup(String(m?.clause ?? '').replace(/[[\]]/g, '').trim());
    if (!clause || (!m.payment && covered.has(clause)) || missed.some((x) => x.clause === clause)) continue;
    missed.push({ clause, reason: cleanText(String(m.reason ?? ''), 200) });
    if (missed.length >= MAX_MISSED) break;
  }
  return {
    stage: wrong.length || missed.length ? 'checked' : 'done',
    checker,
    // Each part can fall back to Claude on its own; "missed_checker" says who looked for missed risks.
    missed_checker: missedPart.checker,
    model: checker === 'nvidia' ? NVIDIA_CHECK_MODEL : CLAUDE_CHECK_MODEL,
    backup,
    checked: items.length,
    check_ms: ms,
    checked_at: new Date().toISOString(),
    demo: Boolean(row.risks?.demo || (row.summary || []).some((s) => s.demo_mistake)),
    wrong,
    missed,
    results: [],
  };
}

// Step 2: Claude fixes, the code checks look first, then the second AI checks the fixes once more.
async function runFix(row, clauses, lang, timeLeft) {
  const started = Date.now();
  const { missed } = row.checks;
  // Scam signs the second AI disputes keep their full explanation, with a note of its doubt.
  const disputed = row.checks.wrong.filter((w) => w.scam);
  const wrong = row.checks.wrong.filter((w) => !w.scam);
  const lookup = clauseLookup(clauses);
  const byNumber = new Map(clauses.map((c) => [c.number, c]));
  const cited = new Set([...wrong.flatMap((w) => w.clause_numbers), ...missed.map((m) => m.clause)]);
  const parts = withReferencedParts(clauses, clauses.filter((c) => cited.has(c.number)));
  const user = [
    `TO FIX:\n${wrong.map((w) => `ID ${w.id} (a ${PART_NAME[w.part]}, cites ${w.clause_numbers.join(', ') || 'nothing'}): ${w.before}\nWhat is wrong: ${w.reason || 'it does not match its clause'}`).join('\n\n') || '(nothing)'}`,
    `MISSED:\n${missed.map((m) => `[${m.clause}] ${m.reason}`).join('\n') || '(nothing)'}`,
    `THE CONTRACT PARTS:\n${clausesForPrompt(parts).slice(0, 25000)}`,
  ].join('\n\n');

  let ai = null;
  if (wrong.length || missed.length) {
    try {
      ai = await jsonFrom('claude', { model: CLAUDE_CHECK_MODEL, thinking: false, maxTokens: 2500, messages: [{ role: 'system', content: FIX_SYSTEM }, { role: 'user', content: user }] }, {
        hedgeAfterMs: 6000,
        timeoutMs: Math.max(5000, Math.min(10000, timeLeft() - 14000)),
      });
    } catch (err) {
      console.log('Second check: Claude could not write the fixes:', err.message);
    }
  }

  // First layer: the code checks from verify.mjs, as for everything else.
  const fixes = Array.isArray(ai?.fixes) ? ai.fixes : [];
  const candidates = wrong.map((w) => {
    const f = fixes.find((x) => String(x?.id ?? '').trim() === w.id);
    if (!f) return { w, ok: false };
    const title = cleanText(f.title, 90);
    const explanation = cleanText(f.explanation, 260);
    const text = w.part === 'plan' ? cleanAdvice(f.text, 220) : cleanText(f.text, 400);
    const texts = w.part === 'risks' ? [title, explanation] : [text];
    if (!texts[0]) return { w, ok: false };
    const own = (Array.isArray(f.clauses) ? f.clauses : [f.clause]).map((n) => lookup(String(n ?? '').replace(/[[\]]/g, ''))).filter(Boolean);
    const quotes = Array.isArray(f.quotes) ? f.quotes : [f.quote];
    const check = checkPoint(clauses, { texts, quotes, cited: own.length ? own : w.clause_numbers, extra: w.part === 'plan' ? [row.situation || ''] : [] });
    if (!check.ok) console.log(`Second check: the fix for ${w.id} failed the code check: ${check.why}`);
    // The fix keeps every clause the item was about, plus any it now quotes, so the second look
    // sees all of them (a fix quoting 4.4 and 12.1 may still rightly say what 12.4 says).
    const kept = check.ok ? [...new Set([...check.clause_numbers, ...w.clause_numbers])] : w.clause_numbers;
    return { w, ok: check.ok, title, explanation, text, check, clauses: kept };
  });

  // Missed clauses become warnings, made like any other (risks.mjs rules), marked "found on second check".
  const written = Array.isArray(ai?.warnings) ? ai.warnings : [];
  const added = missed.map((m) => {
    const s = written.find((x) => lookup(String(x?.clause ?? '').replace(/[[\]]/g, '')) === m.clause) || {};
    const category = CATEGORIES.includes(s.category) && s.category !== 'company_details' ? s.category : 'other';
    const title = cleanText(s.title, 90);
    const explanation = cleanText(s.explanation, 260);
    let check = title ? checkPoint(clauses, { texts: [title, explanation], quotes: [s.quote], cited: [m.clause] }) : { ok: false };
    let warning = { title, explanation };
    if (!check.ok) {
      // Kept on its clause's own words, as the risk check does (never dropped for its wording).
      const kept = clauseOnly(clauses, byNumber, [m.clause], category, [{ title, explanation, quote: s.quote }]);
      if (!kept) return null;
      check = kept.check;
      warning = { title: kept.title, explanation: kept.explanation };
    }
    const scam = category in SCAM_EVIDENCE && SCAM_EVIDENCE[category].test(check.quotes[0]);
    const level = scam ? (s.level === 'medium' ? 'medium' : 'high') : 'medium';
    return { m, item: { level, kind: scam ? 'scam_sign' : 'risky_term', category, ...warning, clause_numbers: check.clause_numbers, quote: check.quotes[0], found_by: 'second_check' } };
  }).filter(Boolean);

  // Second layer: the checker looks at every fix and new warning once more.
  const toRecheck = [
    ...candidates.filter((c) => c.ok).map((c) => ({ id: c.w.id, part: c.w.part, label: c.w.label, text: c.w.part === 'risks' ? `${c.title}. ${c.explanation}` : c.text, clause_numbers: c.clauses })),
    ...added.map((a, i) => ({ id: `new:${i}`, part: 'risks', label: a.item.title, text: `${a.item.title}. ${a.item.explanation}`, clause_numbers: a.item.clause_numbers })),
  ];
  let recheck = { verdicts: new Map(), checker: null, ms: 0 };
  if (toRecheck.length && timeLeft() > 6000) {
    const recheckParts = withReferencedParts(clauses, clauses.filter((c) => toRecheck.some((t) => t.clause_numbers.includes(c.number))));
    try {
      const prefer = row.checks.checker === 'nvidia' ? SECOND_CHECKER : 'claude';
      const r = await askChecker(prefer, itemsPrompt(lang), `ITEMS TO CHECK:\n${toRecheck.map(itemLine).join('\n')}\n\nTHE CONTRACT:\n${clausesForPrompt(recheckParts).slice(0, 25000)}`, timeLeft, 1200, RECHECK_MS);
      const list = (Array.isArray(r.ai?.wrong) ? r.ai.wrong : Array.isArray(r.ai?.items) ? r.ai.items : []).filter((v) => v?.verdict === 'wrong');
      for (const v of list) console.log(`Second check: the fix for ${v?.id} was checked again and is still wrong: ${String(v?.reason ?? '').slice(0, 120)}`);
      const verdicts = new Map(list.map((v) => [String(v?.id ?? '').trim(), v]));
      recheck = { verdicts, checker: r.checker, ms: r.ms };
    } catch (err) {
      console.log('Second check: the fixes could not be checked again:', err.message);
    }
  }
  const passed = (id) => recheck.verdicts.get(id)?.verdict !== 'wrong';

  // Apply. A fix that failed either check leaves the item "unclear": the app shows its clause with
  // "We couldn't explain this one clearly…" (a scam-sign warning keeps its title and level).
  const summary = structuredClone(row.summary);
  const risks = structuredClone(row.risks);
  const tailored = row.tailored ? structuredClone(row.tailored) : null;
  const results = [];
  for (const c of candidates) {
    const { w } = c;
    const fixed = c.ok && passed(w.id);
    const target = w.part === 'summary' ? summary[w.index] : w.part === 'risks' ? risks.items[w.index] : tailored?.plan?.[w.index];
    if (!target) continue;
    if (fixed) {
      if (w.part === 'summary') target.plain_text = c.text;
      else if (w.part === 'risks') Object.assign(target, { title: c.title, explanation: c.explanation, quote: c.check.quotes[0] });
      else target.text = c.text;
      target.clause_numbers = c.clauses;
    }
    target.checked = fixed ? 'fixed' : 'unclear';
    results.push({ id: w.id, part: w.part, label: w.label, reason: w.reason, before: w.before, after: fixed ? (w.part === 'risks' ? `${c.title}. ${c.explanation}` : c.text) : null, status: target.checked, clause_numbers: target.clause_numbers, planted: Boolean(target.demo_mistake) });
  }
  for (const d of disputed) {
    const target = risks.items[d.index];
    if (!target) continue;
    target.checked = 'disputed';
    target.doubt = d.reason;
    results.push({ id: d.id, part: d.part, label: d.label, reason: d.reason, before: d.before, after: null, status: 'disputed', clause_numbers: target.clause_numbers });
  }
  added.forEach((a, i) => {
    const status = passed(`new:${i}`) ? 'fixed' : 'unclear';
    risks.items.push({ ...a.item, checked: status });
    results.push({ id: `risk:${risks.items.length - 1}`, part: 'risks', label: a.item.title, reason: a.m.reason, before: null, after: status === 'fixed' ? `${a.item.title}. ${a.item.explanation}` : null, status, added: true, clause_numbers: a.item.clause_numbers, planted: Boolean(row.risks?.demo && (a.item.category === 'pay_to_start' || /\bS?\$\s?350\b/.test(`${a.item.title} ${a.item.explanation} ${a.item.quote}`))) });
  });

  return {
    summary,
    risks,
    tailored,
    checks: { ...row.checks, stage: 'done', results, fix_ms: Date.now() - started, recheck_checker: recheck.checker, recheck_ms: recheck.ms },
  };
}
