// /.netlify/functions/tailor
//   POST ?id=...  -> { tailored, situation } for one contract, made once and then saved. Changing
//   "Tell us about you" clears it (contracts.mjs), so it is made again from the new words.
//   tailored = {
//     summary_order: [key],                    // summary rows, most relevant to this person first
//     risks: [{ index, level, why_for_you }],  // warnings their situation changes, most relevant first
//     plan: [{ text, clause_numbers, help }],  // "Your plan before you sign", 3-6 steps
//   }
//
// Made after the summary and the risk check, from the user's own words (no fixed rules decide
// what is relevant). Safeguards on top of the AI:
//   - it only reorders: every summary row and warning is still shown
//   - only risky terms can move, and only between Info and Medium: a scam sign never changes
//   - every number, date and name in a "Why this matters for you" line must be in the warning or the
//     user's own words, and every plan step must quote the contract (verify.mjs); one that fails gets
//     one rewrite, then is dropped
//   - nothing tells the user to sign or not (wording.mjs), and help links come from the app

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { clauseLookup, withReferencedParts, TYPE_LABELS } from '../lib/contract-task.mjs';
import {
  TAILOR_SYSTEM, WHY_REPAIR_SYSTEM, STEP_REPAIR_SYSTEM, HELP_SOURCES, clausesForPrompt,
} from '../lib/prompts.mjs';
import { chatJsonHedged, TAILOR_MODEL, FUNCTION_LIMIT_MS } from '../lib/ai.mjs';
import { cleanAdvice } from '../lib/wording.mjs';
import { checkPoint, unsupportedFacts, namesUsedThroughout } from '../lib/verify.mjs';

const MIN_STEPS = 3;
const MAX_STEPS = 6;

// Used when the AI's help source is missing or not one of ours.
const DEFAULT_HELP = {
  job_offer: 'mom', rental: 'probono', phone_subscription: 'case', loan: 'probono', business: 'probono', other: 'probono',
};

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=contract_type,clauses,summary,risks,situation,tailored&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
    const situation = row.situation || '';
    if (row.tailored) return Response.json({ tailored: row.tailored, situation });
    if (!row.summary || !row.risks || !row.clauses?.length) throw new HttpError(409, 'The summary and risk check are not ready yet.');

    const tailored = await makeTailored(row);

    // If the user changed their words while this ran, the newer request saves its own result.
    const [latest] = await selectContracts(`select=situation&${query}`);
    if ((latest?.situation || '') === situation) await updateContract(query, { tailored });
    return Response.json({ tailored, situation });
  } catch (err) {
    return errorResponse(err);
  }
};

// Exported so it can be tried on saved contracts without the HTTP layer.
export async function makeTailored({ contract_type: type, clauses, summary, risks, situation }) {
  const started = Date.now();
  const timeLeft = () => FUNCTION_LIMIT_MS - (Date.now() - started);
  const words = String(situation || '').trim();
  const lookup = clauseLookup(clauses);
  const refs = (list) => [...new Set((Array.isArray(list) ? list : [list]).flat().filter(Boolean).map(lookup).filter(Boolean))];
  const isNumbered = (n) => /^\d/.test(n);

  const terms = summary.filter((s) => s.key !== 'key_date' && s.found);
  const items = risks.items || [];

  // Only the parts the summary and warnings come from (plus any schedule they mention), in the
  // contract's order: a shorter prompt answers sooner, and plan steps are about these parts anyway.
  const cited = new Set([...summary, ...items].flatMap((x) => x.clause_numbers || []));
  const picked = withReferencedParts(clauses, clauses.filter((c) => cited.has(c.number)));
  const parts = picked.length ? clauses.filter((c) => picked.includes(c)) : clauses;

  const prompt = [
    `Contract type: ${TYPE_LABELS[type]}`,
    `WHAT THEY TOLD US: ${words || '(nothing)'}`,
    `KEY TERMS:\n${terms.map((s) => `[${s.key}] ${s.label}: ${s.plain_text}`).join('\n') || '(none)'}`,
    `WARNINGS:\n${items.map((r, i) => `#${i} (${r.kind}, ${r.level}, ${r.clause_numbers.join(', ')}) ${r.title}. ${r.explanation || ''}`).join('\n') || '(none)'}`,
    `THE CONTRACT PARTS:\n${clausesForPrompt(parts)}`,
  ].join('\n\n');
  const ask = (note = '') => chatJsonHedged({
    model: TAILOR_MODEL,
    thinking: false,
    maxTokens: 2500,
    messages: [
      { role: 'system', content: TAILOR_SYSTEM },
      { role: 'user', content: prompt + note },
    ],
  }, { hedgeAfterMs: Math.round(FUNCTION_LIMIT_MS * 0.3), timeoutMs: Math.max(8000, timeLeft() - 16000) });

  const ai = await ask();

  // ---- Summary order: only with the person's words; every row stays.
  const keys = terms.map((s) => s.key);
  const order = words
    ? [...new Set((Array.isArray(ai?.summary_order) ? ai.summary_order : []).map((k) => String(k).replace(/[[\]]/g, '').trim()))].filter((k) => keys.includes(k))
    : [];
  for (const k of keys) if (!order.includes(k)) order.push(k);

  // ---- Warnings: "Why this matters for you", and Info <-> Medium for risky terms only.
  const known = namesUsedThroughout(clauses);
  const contextOf = (r) => clauses.filter((c) => r.clause_numbers.includes(c.number)).map((c) => c.text).join('\n');
  const evidenceOf = (r) => [r.quote, r.title, r.explanation, words].filter(Boolean);
  const whyMissing = (r, why) => unsupportedFacts(why, evidenceOf(r), contextOf(r), known);

  const seen = new Set();
  const picks = (words && Array.isArray(ai?.warnings) ? ai.warnings : []).filter((w) => {
    const index = Number(String(w?.n ?? '').replace(/^#/, ''));
    if (!Number.isInteger(index) || !items[index] || seen.has(index)) return false;
    seen.add(index);
    w.index = index;
    return true;
  });
  const warnings = await Promise.all(picks.map(async (w) => {
    const r = items[w.index];
    const level = r.kind === 'risky_term' && ['info', 'medium'].includes(w.level) ? w.level : r.level;
    let why = cleanAdvice(w.why, 240);
    const missing = why ? whyMissing(r, why) : [];
    if (missing.length) {
      const fixed = await repairWhy(r, why, words, missing, timeLeft);
      const again = cleanAdvice(fixed?.why, 240);
      const ok = again && !whyMissing(r, again).length;
      console.log(`"Why this matters" for warning #${w.index} used ${missing.join(', ')}. Rewrite ${ok ? 'passed' : 'failed'}.`);
      why = ok ? again : '';
    }
    return { index: w.index, level, why_for_you: why };
  }));

  // ---- Plan: each step must quote the contract; facts may also come from the person's words.
  const fallbackHelp = DEFAULT_HELP[type] || 'probono';
  const checkStep = (s, help) => {
    const text = cleanAdvice(s?.step, 220);
    const check = text ? checkPoint(clauses, { texts: [text], quotes: [s?.quote], cited: refs(s?.clauses), extra: [words] }) : { ok: false, why: 'no step' };
    return { text, help: help in HELP_SOURCES ? help : fallbackHelp, check };
  };
  const checkedStep = async (s) => {
    const first = checkStep(s, s?.help);
    if (first.check.ok) return first;
    if (!first.text) return null;
    const fixed = await repairStep(clauses, first.text, refs(s?.clauses), first.check.why, words, timeLeft);
    const second = fixed?.step ? checkStep(fixed, s?.help) : null;
    console.log(`Plan step ("${first.text.slice(0, 60)}") failed the check: ${first.check.why}. Rewrite ${second?.check.ok ? 'passed' : `failed${second ? `: ${second.check.why}` : ''}`}.`);
    return second?.check.ok ? second : null;
  };
  // The prompt asks for a numbered clause whenever one says it. A step about a part the contract
  // itself doesn't number (BrightPath's letterhead "Intro" or its "Acceptance" section) keeps that
  // part's name: moving it to a numbered clause made the AI rewrite the step about something else.
  const buildPlan = async (raw) => {
    const steps = await Promise.all((Array.isArray(raw) ? raw : []).slice(0, MAX_STEPS).map(checkedStep));
    const texts = new Set();
    return steps.filter((s) => s && !texts.has(s.text) && texts.add(s.text))
      // Numbered clauses first, so the row shows "Cl. 5.3" rather than a section name.
      .map(({ text, help, check }) => ({ text, clause_numbers: [...check.clause_numbers].sort((a, b) => isNumbered(b) - isNumbered(a)), help }));
  };

  let plan = await buildPlan(ai?.plan);
  // Too few steps passed: make the plan once more if there's time, and keep whichever has more.
  if (plan.length < MIN_STEPS && timeLeft() > FUNCTION_LIMIT_MS * 0.6) {
    try {
      const again = await buildPlan((await ask('\n\nLast time some plan steps could not be checked. Copy every quote EXACTLY from the contract parts above, and keep every fact inside its quote.'))?.plan);
      console.log(`Plan made again: ${plan.length} -> ${again.length} steps`);
      if (again.length > plan.length) plan = again;
    } catch (err) {
      console.log('Making the plan again failed:', err.message);
    }
  }

  return { summary_order: order, risks: warnings, plan };
}

async function repairWhy(r, why, words, missing, timeLeft) {
  if (timeLeft() < 9000) return null;
  try {
    return await chatJsonHedged({
      model: TAILOR_MODEL,
      thinking: false,
      maxTokens: 300,
      messages: [
        { role: 'system', content: WHY_REPAIR_SYSTEM },
        { role: 'user', content: `Warning: ${r.title}. ${r.explanation || ''}\nQuote from the contract: ${r.quote || '(none)'}\nTheir own words: ${words}\nLine: ${why}\nProblem: these are in neither: ${missing.join(', ')}` },
      ],
    }, { hedgeAfterMs: 4000, timeoutMs: Math.min(8000, timeLeft() - 5000) });
  } catch {
    return null;
  }
}

async function repairStep(clauses, step, cited, why, words, timeLeft) {
  if (timeLeft() < 9000) return null;
  const parts = cited.length ? withReferencedParts(clauses, clauses.filter((c) => cited.includes(c.number))) : clauses;
  try {
    return await chatJsonHedged({
      model: TAILOR_MODEL,
      thinking: false,
      maxTokens: 600,
      messages: [
        { role: 'system', content: STEP_REPAIR_SYSTEM },
        { role: 'user', content: `Step: ${step}\nTheir own words: ${words || '(nothing)'}\nProblem: ${why}. For each of those items, make sure it is inside the quote or leave it out.\n\nTHE CONTRACT PARTS:\n${clausesForPrompt(parts).slice(0, 20000)}` },
      ],
    }, { hedgeAfterMs: 4000, timeoutMs: Math.min(8000, timeLeft() - 5000) });
  } catch {
    return null;
  }
}
