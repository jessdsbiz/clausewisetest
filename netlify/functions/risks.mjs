// /.netlify/functions/risks
//   POST ?id=...  -> { clauses, risks } for one contract, made once and then saved.
//   risks = { company: { name, uen, address, payee }, items: [{ level, kind, category, title,
//             explanation, clause_numbers, quote }] }
//
// Safeguards on top of the AI:
//   - every warning must point to a real clause, and its quote must really be in that clause
//   - wording that calls a contract safe, illegal or a scam is removed
//   - a plain rule adds "no UEN" when the contract has none (the AI often misses absences)

import { contractTask, clauseLookup } from '../lib/contract-task.mjs';
import { RISKS_SYSTEM } from '../lib/prompts.mjs';
import { cleanText } from '../lib/wording.mjs';

const LEVELS = ['high', 'medium', 'info'];
const KINDS = ['scam_sign', 'risky_term'];
const CATEGORIES = ['pay_to_start', 'personal_account', 'pressure', 'company_details',
  'non_compete', 'probation', 'one_sided_change', 'fee', 'renewal', 'cancellation', 'other'];

// Used when the AI's title is missing or has to be removed.
const DEFAULT_TITLES = {
  pay_to_start: 'You must pay before you start',
  personal_account: 'Money goes to a personal account',
  pressure: 'Pressure to decide quickly',
  company_details: 'Company details are missing',
  non_compete: 'Limits on where you can work next',
  probation: 'Probation terms worth asking about',
  one_sided_change: 'They can change the terms on their own',
  fee: 'A fee or charge worth asking about',
  renewal: 'It may renew automatically',
  cancellation: 'Leaving early could cost you',
  other: 'A term worth asking about',
};

const norm = (t) => String(t).replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

export default contractTask({
  field: 'risks',
  system: RISKS_SYSTEM,
  build: buildRisks,
});

// "Account name: Tan Wei Ling Bank: Sample Bank…" -> { name: "Tan Wei Ling", number: "5.4" }
function findPayeeIn(clauses) {
  for (const c of clauses) {
    const m = c.text.match(/\bAccount (?:name|holder)\s*:\s*([A-Z][A-Za-z'.\-/ ]{1,60}?)(?=\s+(?:Bank|Account|PayNow|Branch|Acc)\b|\s*[\n,;|)]|$)/);
    if (m) return { name: m[1].trim(), number: c.number };
  }
  return null;
}
const findPayee = (clauses) => findPayeeIn(clauses)?.name || null;

// A person's name, rather than a company or organisation.
const COMPANY_WORDS = /\b(pte|ltd|limited|llp|inc|corp|company|bank|agency|ministry|board|council|authority|centre|center|society|association|services|solutions|holdings|group)\b/i;
const simple = (s) => String(s || '').toLowerCase().replace(/\b(pte|ltd|private|limited|llp)\b|[^a-z0-9]/g, '');

function buildRisks(ai, clauses, row) {
  const lookup = clauseLookup(clauses);
  const byNumber = new Map(clauses.map((c) => [c.number, c]));
  const str = (v) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 200) : null);

  const company = {
    name: str(ai?.company?.name),
    uen: str(ai?.company?.uen),
    address: str(ai?.company?.address),
    // The AI sometimes leaves the payee out, so read it from an "Account name:" line too.
    // The app relies on it: the Company check shows it, and it stays visible in Risks even
    // when "Hide these too" hides other names.
    payee: str(ai?.company?.payee) || findPayee(clauses),
  };

  const seen = new Set();
  const items = [];
  for (const s of Array.isArray(ai?.signs) ? ai.signs : []) {
    const category = CATEGORIES.includes(s?.category) ? s.category : 'other';
    let numbers = [...new Set((Array.isArray(s?.clauses) ? s.clauses : []).map(lookup).filter(Boolean))];
    if (!numbers.length && category === 'company_details' && byNumber.has('Intro')) numbers = ['Intro'];
    if (!numbers.length) continue; // every warning must point to a clause

    // Keep the quote only if it really is in the contract. If the AI cited the wrong clause
    // for it (e.g. 5.4 for the "24 hours" in Acceptance), point to the clause that has it.
    let quote = typeof s.quote === 'string' && s.quote.trim().length > 3 ? s.quote.trim() : '';
    if (quote && !norm(byNumber.get(numbers[0]).text).includes(norm(quote))) {
      const home = clauses.filter((c) => norm(c.text).includes(norm(quote)));
      if (home.length === 1) numbers = [home[0].number, ...numbers.filter((n) => n !== home[0].number)];
      else quote = '';
    }

    // One warning per problem: "pay to start" and "fee" on the same clause are the same problem.
    const group = category === 'fee' ? 'pay_to_start' : category;
    const key = `${group}:${numbers[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const title = cleanText(s.title, 90);
    items.push({
      level: LEVELS.includes(s.level) ? s.level : 'medium',
      kind: KINDS.includes(s.kind) ? s.kind : 'risky_term',
      category,
      title: title || DEFAULT_TITLES[category],
      explanation: cleanText(s.explanation, 260),
      clause_numbers: numbers,
      quote,
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
  const hasUenInText = clauses.some((c) => /\bUEN\b|\b(19|20)\d{7}[A-Z]\b|\b\d{8}[A-Z]\b|\b[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]\b/.test(c.text));
  // Not for "Other" documents such as government letters, which have no UEN.
  if (row?.contract_type !== 'other' && !company.uen && !hasUenInText && !items.some((i) => i.category === 'company_details')) {
    items.push({
      level: 'medium',
      kind: 'scam_sign',
      category: 'company_details',
      title: 'No company UEN in the contract',
      explanation: 'Every Singapore company has a UEN. Ask for it, then check the company on ACRA BizFile before you pay or sign.',
      clause_numbers: [byNumber.has('Intro') ? 'Intro' : clauses[0].number],
      quote: '',
    });
  }

  const rank = (i) => LEVELS.indexOf(i.level) * 2 + (i.kind === 'scam_sign' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b));
  return { company, items: items.slice(0, 8) };
}
