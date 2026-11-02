// /.netlify/functions/risks
//   POST ?id=...  -> { clauses, risks } for one contract, made once and then saved.
//   risks = { company: { name, uen, address, payee }, items: [{ level, kind, category, title,
//             explanation, clause_numbers, quote }] }
//
// Safeguards on top of the AI:
//   - every warning needs an exact quote that is really in the contract, and every number,
//     amount, date and name in its title and explanation must be in that quote (verify.mjs).
//     A warning that fails is rewritten from its clause's own words and kept; it is removed only
//     if the clause it is about can't be found in the contract
//   - "Scam sign" is only used for real scam patterns, and the quote must show the pattern
//     (e.g. a payment for "pay to start"); other terms are at most Medium
//   - wording that calls a contract safe, illegal or a scam is removed
//   - plain rules (no AI) add "money goes to a person" and "no UEN" signs

import { contractTask, clauseLookup, withReferencedParts, TYPE_LABELS } from '../lib/contract-task.mjs';
import { risksSystem, RISK_REPAIR_SYSTEM, clausesForPrompt } from '../lib/prompts.mjs';
import { chatJsonHedged, RISKS_MODEL, MAX_CALL_MS } from '../lib/ai.mjs';
import { cleanText } from '../lib/wording.mjs';
import { checkPoint, locateQuote, norm } from '../lib/verify.mjs';

const LEVELS = ['high', 'medium', 'info'];
// Signs checked (from all groups together) and warnings shown, most serious first.
const MAX_SIGNS = 12;
const MAX_ITEMS = 10;
const CATEGORIES = ['pay_to_start', 'personal_account', 'pressure', 'credentials', 'company_details', 'non_compete',
  'probation', 'one_sided_change', 'fee', 'renewal', 'cancellation', 'other'];

// The only patterns shown as "Scam sign", and what the quote must contain to prove each one.
// A medical check ("certified medically fit") has no payment in it, so it can't be "pay to start".
const SCAM_EVIDENCE = {
  pay_to_start: /\b(pay|paid|payment|fee|deposit|charge|cost|purchase|buy|transfer)\w*\b|\bS?\$\s?\d/i,
  personal_account: /\b(account|paynow|transfer|bank)\b/i,
  pressure: /\b\d+\s*\)?\s*(hours?|hrs?|days?)\b|\b(today|tomorrow|immediately|lapse\w*|expire\w*|withdrawn|no extension)\b|\b(one|two|twenty-four|forty-eight)\b[^.]{0,6}\b(hours?|days?)\b/i,
  credentials: /\b(password|otp|one-time|pin|singpass|log-?in|passcode)\b/i,
};

// Used when the AI's title is missing or has to be removed.
const DEFAULT_TITLES = {
  pay_to_start: 'You must pay before you start',
  personal_account: 'Money goes to a personal account',
  pressure: 'Pressure to decide quickly',
  credentials: 'Asks for passwords or OTPs',
  company_details: 'Company details are missing',
  non_compete: 'Limits on where you can work next',
  probation: 'Probation terms worth asking about',
  one_sided_change: 'They can change the terms on their own',
  fee: 'A fee or charge worth asking about',
  renewal: 'It may renew automatically',
  cancellation: 'Leaving early could cost you',
  other: 'A term worth asking about',
};

export default contractTask({ field: 'risks', run: makeRisks });

// One call on the whole contract took Haiku 5-14s and sometimes missed a clause, so the contract
// is checked in up to 3 groups of whole sections (all of 5.x stays together) at the same time.
const MAX_GROUPS = 3;
const GROUP_CHARS = 6000;
// Fewer signs per group keeps each reply short: a group allowed 7 wrote ~1000 tokens and took 13.5s.
const SIGNS_PER_GROUP = 4;

function clauseGroups(clauses) {
  const sections = [];
  for (const c of clauses) {
    const major = String(c.number).split('.')[0];
    const last = sections[sections.length - 1];
    if (last?.major === major) last.clauses.push(c);
    else sections.push({ major, clauses: [c] });
  }
  const size = (list) => clausesForPrompt(list).length;
  const count = Math.min(MAX_GROUPS, Math.ceil(size(clauses) / GROUP_CHARS));
  const target = size(clauses) / count;
  const groups = [[]];
  for (const { clauses: part } of sections) {
    const group = groups[groups.length - 1];
    if (group.length && groups.length < count && size(group) + size(part) / 2 > target) groups.push([...part]);
    else group.push(...part);
  }
  return groups;
}

async function makeRisks(clauses, row, timeLeft) {
  const groups = clauseGroups(clauses);
  if (process.env.CLAUSEWISE_DEBUG) console.log(`  risk check groups: ${groups.map((g) => `[${g[0].number}]-[${g[g.length - 1].number}] ${clausesForPrompt(g).length} chars`).join(', ')}`);
  // If any group fails, the whole check fails (the app shows Try again): a missing group would
  // silently leave out its warnings.
  const answers = await Promise.all(groups.map((group, i) => chatJsonHedged({
    model: RISKS_MODEL,
    thinking: false,
    maxTokens: 2000,
    messages: [
      { role: 'system', content: risksSystem(groups.length > 1 ? SIGNS_PER_GROUP : 7) },
      {
        role: 'user',
        content: `Contract type: ${TYPE_LABELS[row.contract_type]}${groups.length > 1 ? `
(Part ${i + 1} of ${groups.length} of the contract: check only these parts.)` : ''}

${clausesForPrompt(withReferencedParts(clauses, group))}`,
      },
    ],
  }, { hedgeAfterMs: 6000, timeoutMs: Math.min(MAX_CALL_MS, timeLeft() - 6000) })));

  // Company details come from whichever group has them (usually the first, with the letterhead).
  const company = {};
  for (const key of ['name', 'uen', 'address', 'payee']) {
    company[key] = answers.map((a) => a?.company?.[key]).find((v) => typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null') ?? null;
  }
  const signs = answers.flatMap((a) => (Array.isArray(a?.signs) ? a.signs : []));
  return buildRisks({ company, signs }, clauses, row, timeLeft);
}

// "Account name: <name> Bank: <bank>…" -> { name, number }
function findPayeeIn(clauses) {
  for (const c of clauses) {
    const m = c.text.match(/\bAccount (?:name|holder)\s*:\s*([A-Z][A-Za-z'.\-/ ]{1,60}?)(?=\s+(?:Bank|Account|PayNow|Branch|Acc)\b|\s*[\n,;|)]|$)/);
    if (m) return { name: m[1].trim(), number: c.number };
  }
  return null;
}
const findPayee = (clauses) => findPayeeIn(clauses)?.name || null;

// The AI sometimes copies the rewrite instructions into a warning ("The warning's numbers must
// appear in the quote…"); people never see quotes called that, so those sentences are removed.
const ABOUT_THE_CHECK = /\b(quote[sd]?|quoting)\b|\bthe warning['’]?s\b/i;
const withoutCheckTalk = (s) => String(s || '').split(/(?<=[.!?])\s+/).filter((t) => !ABOUT_THE_CHECK.test(t)).join(' ');

// Said by a warning kept from its clause's own words: it states no facts of its own.
const CLAUSE_ONLY_NOTE = 'Read what this part of the contract says, and ask about it before you sign.';
// A whole clause up to this long can be the quote; a longer one is cut to its most relevant part.
const MAX_CLAUSE_QUOTE = 700;
const MAX_EXCERPT = 300;

// The sentences of a clause that share the most words with what the AI wrote, kept word for word.
function excerpt(text, about) {
  const words = new Set(norm(about).split(/[^a-z0-9$]+/).filter((w) => w.length > 3));
  const sentences = String(text).trim().split(/(?<=[.;:])\s+/);
  const score = (t) => norm(t).split(/[^a-z0-9$]+/).filter((w) => words.has(w)).length;
  let best = 0;
  sentences.forEach((t, i) => { if (score(t) > score(sentences[best])) best = i; });
  let out = sentences[best];
  for (let i = best + 1; i < sentences.length && `${out} ${sentences[i]}`.length <= MAX_EXCERPT; i++) out += ` ${sentences[i]}`;
  if (out.length > MAX_EXCERPT) out = out.slice(0, out.lastIndexOf(' ', MAX_EXCERPT));
  return out;
}

// Last step for a warning that failed the quote check twice: it is kept on its clause, quoted word
// for word (the whole clause if short, else its most relevant sentences). It keeps the AI's title if
// every fact in it is in that quote, and only the explanation sentences whose facts are too;
// otherwise a plain title for its kind and no facts at all. Null only when the warning points at no
// clause in the contract.
function clauseOnly(clauses, byNumber, homes, category, tries) {
  const about = tries.map((t) => `${t?.title || ''} ${t?.explanation || ''} ${t?.quote || ''}`).join(' ');
  for (const n of homes) {
    const text = byNumber.get(n).text.trim();
    const quotes = [...new Set([text.length <= MAX_CLAUSE_QUOTE ? text : null, excerpt(text, about)].filter(Boolean))];
    for (const quote of quotes) {
      const passes = (s) => checkPoint(clauses, { texts: [s], quotes: [quote], cited: [n] }).ok;
      for (const t of tries) {
        if (!t?.title || !passes(t.title)) continue;
        const explanation = String(t.explanation || '').split(/(?<=[.!?])\s+/).filter((s) => s && passes(s)).join(' ') || CLAUSE_ONLY_NOTE;
        const check = checkPoint(clauses, { texts: [t.title, explanation], quotes: [quote], cited: [n] });
        if (check.ok) return { title: t.title, explanation, check };
      }
    }
  }
  for (const n of homes) {
    const check = checkPoint(clauses, { texts: [DEFAULT_TITLES[category], CLAUSE_ONLY_NOTE], quotes: [excerpt(byNumber.get(n).text, about)], cited: [n] });
    if (check.ok) return { title: DEFAULT_TITLES[category], explanation: CLAUSE_ONLY_NOTE, check };
  }
  return null;
}

// A person's name, rather than a company or organisation.
const COMPANY_WORDS = /\b(pte|ltd|limited|llp|inc|corp|company|bank|agency|ministry|board|council|authority|centre|center|society|association|services|solutions|holdings|group)\b/i;
const simple = (s) => String(s || '').toLowerCase().replace(/\b(pte|ltd|private|limited|llp)\b|[^a-z0-9]/g, '');

// Second try for a sign that failed the quote check: the AI sees what was wrong and the parts it
// cited (plus any schedule they mention), and must quote every fact or leave it out. Skipped when
// there isn't time: the sign is then kept from its clause's own words instead (clauseOnly).
async function repairSign(clauses, sign, cited, why, timeLeft) {
  if (timeLeft() < 6000) return null;
  const parts = cited.length ? withReferencedParts(clauses, clauses.filter((c) => cited.includes(c.number))) : clauses;
  try {
    return await chatJsonHedged({
      model: RISKS_MODEL,
      thinking: false,
      maxTokens: 800,
      messages: [
        { role: 'system', content: RISK_REPAIR_SYSTEM },
        { role: 'user', content: `Warning sign: ${sign.title}\n${sign.explanation || ''}\nProblem: ${why}. For each of those items, make sure it is inside the quote or leave it out.\n\nTHE CONTRACT PARTS:\n${clausesForPrompt(parts).slice(0, 20000)}` },
      ],
    }, { hedgeAfterMs: 5000, timeoutMs: Math.min(8000, timeLeft() - 2000) });
  } catch {
    return null;
  }
}

async function buildRisks(ai, clauses, row, timeLeft) {
  const lookup = clauseLookup(clauses);
  const byNumber = new Map(clauses.map((c) => [c.number, c]));
  const allText = norm(clauses.map((c) => c.text).join('\n'));
  // Company details are shown as "from your contract", so keep them only if they really are in it.
  const fromContract = (v) => {
    const s = typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 200) : null;
    return s && allText.includes(norm(s)) ? s : null;
  };

  const company = {
    name: fromContract(ai?.company?.name),
    uen: fromContract(ai?.company?.uen),
    address: fromContract(ai?.company?.address),
    // The AI sometimes leaves the payee out, so read it from an "Account name:" line too.
    // The app relies on it: the Company check shows it, and it stays visible in Risks even
    // when "Hide these too" hides other names.
    payee: fromContract(ai?.company?.payee) || findPayee(clauses),
  };

  // Every sign must pass the quote check. One that fails gets one rewrite (all at the same time),
  // told what was wrong; if that fails too, it is kept from its clause's own words (clauseOnly).
  const refsOf = (s) => [...new Set((Array.isArray(s?.clauses) ? s.clauses : []).map(lookup).filter(Boolean))];
  const checkSign = (s) => {
    const title = cleanText(withoutCheckTalk(s?.title), 90);
    const explanation = cleanText(withoutCheckTalk(s?.explanation), 260);
    return { title, explanation, quote: s?.quote, check: checkPoint(clauses, { texts: [title, explanation], quotes: [s?.quote], cited: refsOf(s) }) };
  };
  // The clauses a sign is about: the ones it cites, then the ones its quote comes from.
  const homesOf = (s) => [...new Set([...refsOf(s), ...(locateQuote(clauses, s?.quote, refsOf(s)) || [])])].filter((n) => byNumber.has(n));
  const rankAi = (s) => (LEVELS.includes(s?.level) ? LEVELS.indexOf(s.level) : 1);
  const all = (Array.isArray(ai?.signs) ? ai.signs : [])
    .filter((s) => s?.category !== 'company_details') // checked by the rule below instead
    .sort((a, b) => rankAi(a) - rankAi(b));
  const signs = all.slice(0, MAX_SIGNS);
  if (all.length > MAX_SIGNS) console.log(`${all.length - MAX_SIGNS} more warning signs not checked (only the first ${MAX_SIGNS} are).`);
  const checked = await Promise.all(signs.map(async (s) => {
    const category = CATEGORIES.includes(s?.category) ? s.category : 'other';
    const first = checkSign(s);
    if (first.check.ok) return { s, category, ...first };
    const fixed = await repairSign(clauses, s, refsOf(s), first.check.why, timeLeft);
    const second = fixed?.title ? checkSign(fixed) : null;
    const failed = `Warning sign (${category}, "${first.title}") failed the check: ${first.check.why}.`;
    if (second?.check.ok) {
      console.log(`${failed} Rewrite passed.`);
      return { s, category, ...second };
    }
    const kept = clauseOnly(clauses, byNumber, [...new Set([...homesOf(s), ...(fixed ? homesOf(fixed) : [])])], category, [second, first]);
    console.log(`${failed} Rewrite failed${second ? `: ${second.check.why}` : ''}. ${kept
      ? `Kept on clause ${kept.check.clause_numbers[0]}${kept.title === DEFAULT_TITLES[category] ? ' with a plain title and no facts' : ''}.`
      : 'Removed: the clause it is about is not in the contract.'}`);
    return kept ? { s, category, ...kept } : null;
  }));

  const seen = new Set();
  const items = [];
  for (const { s, category, title, explanation, check } of checked.filter(Boolean)) {
    // Scam signs only for the real scam patterns, and only when the quote shows it.
    const scam = category in SCAM_EVIDENCE;
    if (scam && !SCAM_EVIDENCE[category].test(check.quotes[0])) {
      console.log(`Scam sign dropped (${category}, "${title}"): the quote does not show it`);
      continue;
    }
    // When unsure, the lower level: only scam signs can be High.
    let level = LEVELS.includes(s?.level) ? s.level : 'medium';
    if (scam && level === 'info') level = 'medium';
    if (!scam && level === 'high') level = 'medium';

    // One warning per problem: "pay to start" and "fee" on the same clause are the same problem.
    const group = category === 'fee' ? 'pay_to_start' : category;
    const key = `${group}:${check.clause_numbers[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      level,
      kind: scam ? 'scam_sign' : 'risky_term',
      category,
      title: title || DEFAULT_TITLES[category],
      explanation,
      clause_numbers: check.clause_numbers,
      quote: check.quotes[0],
    });
  }

  // Rule: money going to a person's own account, not the company or organisation, is a common
  // scam sign (SPF / ScamShield). The AI does not always flag it, so check the "Account name" line.
  const payeeLine = findPayeeIn(clauses);
  const payeeIsPerson = payeeLine && !COMPANY_WORDS.test(payeeLine.name)
    && !(company.name && (simple(company.name).includes(simple(payeeLine.name)) || simple(payeeLine.name).includes(simple(company.name))));
  if (payeeIsPerson && !items.some((i) => i.category === 'personal_account')) {
    items.push({
      level: 'high',
      kind: 'scam_sign',
      category: 'personal_account',
      title: `Money goes to a person, not ${company.name ? 'the organisation' : 'a company'}`,
      explanation: `You are told to pay ${payeeLine.name}, a person's own account. Check with the organisation on its official number before you pay.`,
      clause_numbers: [payeeLine.number],
      quote: `Account name: ${payeeLine.name}`,
    });
  }

  // Rule: a Singapore company's documents normally show its UEN.
  // UEN formats: 201912345K (company), 53012345A (business), T09LL0001B (others).
  // Not for "Other" documents such as government letters, which have no UEN.
  const hasUenInText = clauses.some((c) => /\bUEN\b|\b(19|20)\d{7}[A-Z]\b|\b\d{8}[A-Z]\b|\b[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]\b/.test(c.text));
  if (row?.contract_type !== 'other' && !company.uen && !hasUenInText) {
    const where = byNumber.has('Intro') ? 'Intro' : clauses[0].number;
    if (company.name && company.address) {
      // Name and address are there: only the UEN is missing, which is worth checking but common.
      items.push({
        level: 'info',
        kind: 'risky_term',
        category: 'company_details',
        title: 'No UEN in the contract',
        explanation: 'Ask for the company\'s UEN, then check the company on ACRA BizFile before you sign.',
        clause_numbers: [where],
        quote: '',
      });
    } else {
      const missing = ['UEN', !company.name && 'company name', !company.address && 'office address'].filter(Boolean);
      items.push({
        level: 'medium',
        kind: 'scam_sign',
        category: 'company_details',
        title: 'Company details are missing',
        explanation: `The contract has no ${missing.join(' or ')}. Ask for them, then check the company on ACRA BizFile before you pay or sign.`,
        clause_numbers: [where],
        quote: '',
      });
    }
  }

  const rank = (i) => LEVELS.indexOf(i.level) * 2 + (i.kind === 'scam_sign' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b));
  if (items.length > MAX_ITEMS) console.log(`${items.length - MAX_ITEMS} lower warnings not shown (at most ${MAX_ITEMS}).`);
  return { company, items: items.slice(0, MAX_ITEMS) };
}
