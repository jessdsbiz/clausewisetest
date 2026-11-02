// Checks done in code (not by the AI) before any summary row, warning sign or chat answer is shown:
//   1. each quote the AI gives must really be in the contract, word for word, and
//   2. every number, amount, date and name in the point must appear in those quotes.
// A point that fails either check is dropped, so nothing unverified reaches the screen.

// Same text whatever the quote marks, dashes, spacing or letter case. Quote marks are left out
// altogether: the AI writes " as ' (so its JSON doesn't break) and often drops the quote marks
// around a defined term like “Cooling-Off Period”.
export const norm = (t) => String(t ?? '')
  .replace(/[‘’`´“”"']/g, '').replace(/[‐‑‒–—]/g, '-')
  .replace(/­/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const MIN_QUOTE_WORDS = 3;

// The AI sometimes copies across two clauses, including the "[9.3] (Heading)" label the prompt puts
// before each clause; that counts as a break, like "…".
const QUOTE_BREAK = /\s*(?:…|\.\.\.|\[[^\]]{1,40}\](?:\s*\([^)]{0,80}\))?)\s*/;

// The quote as shown to the user: clause labels inside it become "…".
export const tidyQuote = (quote) => String(quote ?? '').trim().split(QUOTE_BREAK).filter(Boolean).join(' … ');

// Finds where a quote comes from. Each piece (between "…" or clause labels) must be in the contract
// word for word. Returns the clause numbers the pieces come from, preferring the clauses the AI
// cited, or null if any piece is not in the contract.
export function locateQuote(clauses, quote, cited = []) {
  const parts = String(quote ?? '').split(QUOTE_BREAK).map(norm).filter(Boolean);
  if (!parts.length || parts.join(' ').split(' ').length < MIN_QUOTE_WORDS) return null;
  // All pieces in one clause is the usual case.
  const together = clauses.filter((c) => parts.every((p) => norm(c.text).includes(p)));
  if (together.length) return [(together.find((c) => cited.includes(c.number)) || together[0]).number];
  const homes = [];
  for (const p of parts) {
    const found = clauses.filter((c) => norm(c.text).includes(p));
    if (!found.length) return null;
    homes.push((found.find((c) => cited.includes(c.number)) || found[0]).number);
  }
  return [...new Set(homes)];
}

// For logs and for the AI's second try: how far the quote matches the contract, and what follows there.
function whereItDiffers(clauses, quote) {
  const words = norm(quote).split(' ');
  for (let n = words.length - 1; n >= 3; n--) {
    const start = words.slice(0, n).join(' ');
    const c = clauses.find((x) => norm(x.text).includes(start));
    if (c) {
      const text = norm(c.text);
      const at = text.indexOf(start) + start.length;
      return ` (it matches [${c.number}] up to "…${start.slice(-40)}", where the contract continues "${text.slice(at, at + 50)}…")`;
    }
  }
  return '';
}

// ---------- Facts in a point ----------

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
  'forty-five': 45, fifty: 50, sixty: 60, ninety: 90, hundred: 100,
};
const UNIT = '(?:calendar |working |business |clear )?(?:days?|weeks?|months?|years?|hours?|instalments?|times?|payments?)';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Clause references are checked separately (they must be real clauses), so they are not facts here.
const REFERENCE = /\b(?:clauses?|cl\.|sections?|paras?|paragraphs?|items?|schedules?|annex(?:ure)?s?|appendix|appendices|parts?)\s+[A-Z0-9][\w.()]*(?:\s*(?:,|and|or|to|&)\s*[A-Z0-9][\w.()]*)*/gi;

const numbersIn = (text) => [...String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)]
  .map((m) => Number(m[0].replace(/,/g, '').replace(/\.$/, '')))
  .filter((n) => Number.isFinite(n));

// Words that may start with a capital without being a name from the contract: general advice
// the app gives ("check ACRA BizFile"), units and words everyone uses.
const NOT_NAMES = new Set(['i', "i'm", "i'd", 'acra', 'bizfile', 'mom', 'scamshield', 'spf', 'uen', 'otp', 'pin', 'nric',
  'fin', 'singapore', 'singaporean', 'am', 'pm', 'a.m', 'p.m', 'ok', 'tadm', 'case', 'pro', 'bono', 'sg', 'hr',
  // units, checked as part of their number instead
  'gb', 'mb', 'kb', 'tb', 'gbps', 'mbps', 'km', 'kg', 'sgd', 'usd', 'hrs', 'mins']);

// Capitalised words in the middle of a sentence (names of people, companies, places, products),
// plus ALL-CAPS or CamelCase words anywhere. Month names are checked as dates instead.
function namesIn(text) {
  const names = [];
  for (const m of String(text).matchAll(/[A-Za-z][A-Za-z'’&-]*[A-Za-z]/g)) {
    const word = m[0];
    if (!/^[A-Z]/.test(word)) continue;
    const lower = word.toLowerCase().replace(/’/g, "'");
    if (NOT_NAMES.has(lower) || MONTHS.includes(lower) || /^'?s$/.test(lower)) continue;
    const before = text.slice(0, m.index);
    const startsSentence = !before.trim() || /[.!?:;"“(\n]\s*$/.test(before);
    const special = /^[A-Z]{2,}$/.test(word) || /[a-z][A-Z]/.test(word);
    if (startsSentence && !special) continue;
    names.push(word);
  }
  return names;
}

// Whole month names or their short forms only, so "decide", "market" or "junior" aren't months.
const MONTH_WORD = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:uary|ruary|ch|il|e|y|ust|t|tember|ober|ember)?\b/g;
const MONTH_ENDINGS = { jan: ['uary'], feb: ['ruary'], mar: ['ch'], apr: ['il'], jun: ['e'], jul: ['y'], aug: ['ust'], sep: ['t', 'tember'], oct: ['ober'], nov: ['ember'], dec: ['ember'] };

function monthsIn(text) {
  const found = [];
  for (const m of String(text).toLowerCase().matchAll(MONTH_WORD)) {
    // The ending must belong to that month ("sept", "september"), not just any month ("janil").
    const ending = m[0].slice(m[1].length);
    if (ending && !MONTH_ENDINGS[m[1]]?.includes(ending)) continue;
    const i = MONTHS.findIndex((name) => name.startsWith(m[1].slice(0, 3)));
    // "may" is also an ordinary word; only count it next to a day or year.
    if (m[1] === 'may' && !/\d/.test(String(text).slice(Math.max(0, m.index - 4), m.index + 9))) continue;
    if (i >= 0) found.push(i + 1);
  }
  return found;
}

// Returns the facts in `point` that the quotes don't back up ([] means every fact is supported).
// Numbers, amounts and dates must be in the quotes themselves. A name may also come from the rest of
// the clause a quote is from (`context`), or be one the contract uses all through (`knownNames`,
// e.g. a party called "the PEI"): neither can be a name copied from somewhere else.
export function unsupportedFacts(point, quotes, context = '', knownNames = new Set()) {
  const evidence = quotes.join(' \n ');
  const plain = String(point ?? '').replace(/\*\*/g, '').replace(REFERENCE, ' ');
  const missing = [];

  // Numbers and amounts: compared by value, so "S$3,200" matches "3200.00" and "9am" matches "9.00 a.m.".
  // Number words in the quotes count too ("seven (7) days", "one month").
  const have = new Set(numbersIn(evidence));
  for (const [word, n] of Object.entries(NUMBER_WORDS)) if (new RegExp(`\\b${word}\\b`, 'i').test(evidence)) have.add(n);
  // Day/month numbers inside dates like 31/01/2026 count as months for "31 January".
  const dateMonths = new Set([...evidence.matchAll(/\b\d{1,2}[/.-](\d{1,2})[/.-]\d{2,4}\b/g)].map((m) => Number(m[1])));
  for (const n of numbersIn(plain)) if (!have.has(n)) missing.push(String(n));
  for (const m of plain.matchAll(new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\s+${UNIT}\\b`, 'gi'))) {
    if (!have.has(NUMBER_WORDS[m[1].toLowerCase()])) missing.push(m[0]);
  }

  const evidenceMonths = new Set(monthsIn(evidence));
  for (const month of monthsIn(plain)) {
    if (!evidenceMonths.has(month) && !dateMonths.has(month)) missing.push(MONTHS[month - 1]);
  }

  const nameSource = norm(`${evidence}\n${context}`);
  for (const name of namesIn(plain)) {
    const key = norm(name.replace(/['’]s$/, ''));
    if (!knownNames.has(key) && !new RegExp(`(^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(nameSource)) missing.push(name);
  }
  return [...new Set(missing)];
}

// Capitalised words the contract itself uses 3 or more times ("PEI", "SINGVET", "Commencement").
const namesCache = new WeakMap();
export function namesUsedThroughout(clauses) {
  if (!namesCache.has(clauses)) {
    const counts = new Map();
    for (const c of clauses) {
      for (const [w] of c.text.matchAll(/\b[A-Z][A-Za-z'’&-]*[A-Za-z]\b/g)) {
        const key = norm(w.replace(/['’]s$/, ''));
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    namesCache.set(clauses, new Set([...counts].filter(([, n]) => n >= 3).map(([w]) => w)));
  }
  return namesCache.get(clauses);
}

// Checks one point. `quotes` are the AI's quotes, `cited` its clause numbers (already looked up).
// `extra`: other text that may back up a fact, i.e. what the user wrote about themselves.
// Returns { ok, clause_numbers, quotes, why }: clause_numbers are the clauses the quotes come from.
export function checkPoint(clauses, { texts, quotes, cited = [], extra = [] }) {
  const list = (Array.isArray(quotes) ? quotes : [quotes]).filter((q) => typeof q === 'string' && q.trim());
  if (!list.length) return { ok: false, why: 'no quote' };
  const homes = [];
  for (const q of list) {
    const found = locateQuote(clauses, q, cited);
    if (!found) {
      const piece = String(q).split(QUOTE_BREAK).find((p) => p.trim() && !locateQuote(clauses, p, cited)) || q;
      return { ok: false, why: `this quote is not in the contract word for word: "${piece.slice(0, 200)}"${whereItDiffers(clauses, piece)}` };
    }
    homes.push(...found);
  }
  const context = clauses.filter((c) => homes.includes(c.number)).map((c) => c.text).join('\n');
  // Only the contract's own words count as evidence, not clause labels copied into a quote.
  const tidy = list.map(tidyQuote);
  const others = extra.filter(Boolean);
  const missing = unsupportedFacts(texts.filter(Boolean).join('\n'), [...tidy, ...others], context, namesUsedThroughout(clauses));
  if (missing.length) return { ok: false, why: `these numbers, dates or names are not inside the quotes${others.length ? " or the person's own words" : ''}: ${missing.join(', ')}` };
  return { ok: true, clause_numbers: [...new Set(homes)], quotes: tidy };
}
