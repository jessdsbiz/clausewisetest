// /.netlify/functions/collate   ("No more typing", PRD FR9)
//   POST { pages: [{ text, printed_page, readable }] }   (in the order the photos were taken)
//     -> { order: [photo numbers], reordered, missing: [{ after, from, to, pages }], duplicates: [[a, b]] }
// The AI puts photographed pages in the right order from their printed page numbers, clause numbers
// and how each page starts and ends, and points out a page that looks missing or the same page twice.
// It only sees a short outline of each page, so it answers quickly. Its answer is checked in code:
// the order must use every photo exactly once, and every clause number it names must be on a page.

import { HttpError, errorResponse } from '../lib/http.mjs';
import { chatJsonHedged, TEXT_MODEL } from '../lib/ai.mjs';
import { splitClauses } from '../lib/clauses.mjs';

const MAX_PAGES = 20;

const SYSTEM = `You help put photos of a contract's pages in the right order and spot problems, for a person in Singapore. The photos may have been taken out of order.
For each photo you get its photo number, whether it could be read properly, the page number printed on it (if any), the clause numbers on it, how the page starts and how it ends.
Work out:
1. "order": all the photo numbers, in the order the pages belong. Use printed page numbers, clause numbers, headings, and sentences that carry on from the end of one page to the start of the next. Where you can't tell, keep the photos' own order.
2. "missing": each place where a page seems to be missing, e.g. the clause numbers jump from 4.2 to 6.1 (going from the last clause of one section to the first of the next, e.g. 3.4 to 4.1, is normal and not a gap), a printed page number is skipped, or a page ends mid-sentence and the next one starts somewhere else. For each: "after" (the photo number just before the gap, or 0 if the first page seems missing), "from" (the last clause number before the gap, or ""), "to" (the first clause number after it, or ""), "pages" (the printed page numbers that seem to be missing, e.g. ["3"], or []).
3. "duplicates": each group of photo numbers that show the same page.
A photo that could not be read properly may be the page that seems missing (its page number or clauses may not have been read): do not report a page as missing if a hard-to-read photo could be it.
Only report a problem you can see in what you are given. Do not guess.
Reply with JSON only: { "order": [1, 2], "missing": [ { "after": 1, "from": "", "to": "", "pages": [] } ], "duplicates": [[1, 2]] }`;

// "3.4" -> "4.1" or "3.5": the next clause, so not a gap whatever the AI said.
function isNext(from, to) {
  const [a, b] = from.split('.').map(Number);
  const [c, d] = to.split('.').map(Number);
  if ([a, c].some(Number.isNaN)) return false;
  if (c === a + 1) return d === undefined || d === 1 || Number.isNaN(d);
  return c === a && d === (b || 0) + 1;
}

const outline = (page, i) => {
  const text = String(page?.text || '');
  const clauses = splitClauses(text).map((c) => c.number).filter((n) => /^\d/.test(n));
  const flat = text.replace(/\s+/g, ' ').trim();
  return {
    clauses,
    prompt: [
      `PHOTO ${i + 1}`,
      `Could be read properly: ${page?.readable === 'yes' || !page?.readable ? 'yes' : 'no, some of it is hard to read'}`,
      `Printed page number: ${page?.printed_page || 'none'}`,
      `Clause numbers on it: ${clauses.length ? clauses.join(', ') : 'none'}`,
      `Starts: ${flat.slice(0, 350) || '(no text)'}`,
      `Ends: ${flat.length > 350 ? flat.slice(-250) : '(same as above)'}`,
    ].join('\n'),
  };
};

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { pages } = await req.json().catch(() => ({}));
    if (!Array.isArray(pages) || !pages.length) throw new HttpError(400, 'No pages to put in order.');
    if (pages.length > MAX_PAGES) throw new HttpError(400, `Please use at most ${MAX_PAGES} pages.`);
    const n = pages.length;
    const identity = pages.map((_, i) => i + 1);
    if (n === 1) return Response.json({ order: identity, reordered: false, missing: [], duplicates: [] });

    const outlines = pages.map(outline);
    const ai = await chatJsonHedged({
      model: TEXT_MODEL,
      thinking: false,
      maxTokens: 800,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: outlines.map((o) => o.prompt).join('\n\n') },
      ],
    }, { hedgeAfterMs: 7000, timeoutMs: 15000, busyMessage: 'Putting your pages in order took too long. Please try again.' });

    // The order must use every photo exactly once; otherwise keep the order they were taken in.
    const raw = Array.isArray(ai?.order) ? ai.order.map(Number) : [];
    const order = raw.length === n && new Set(raw).size === n && raw.every((p) => Number.isInteger(p) && p >= 1 && p <= n) ? raw : identity;

    const known = new Set(outlines.flatMap((o) => o.clauses));
    const clause = (v) => (known.has(String(v ?? '').trim()) ? String(v).trim() : '');
    const seen = new Set();
    const missing = (Array.isArray(ai?.missing) ? ai.missing : []).map((m) => ({
      after: Number.isInteger(Number(m?.after)) && Number(m.after) >= 0 && Number(m.after) <= n ? Number(m.after) : null,
      from: clause(m?.from),
      to: clause(m?.to),
      pages: (Array.isArray(m?.pages) ? m.pages : []).map((p) => String(p).match(/^\d{1,3}$/)?.[0]).filter(Boolean).slice(0, 3),
    })).filter((m) => m.after !== null && ((m.from && m.to && !isNext(m.from, m.to)) || m.pages.length))
      .filter((m) => !seen.has(`${m.from}-${m.to}-${m.pages}`) && seen.add(`${m.from}-${m.to}-${m.pages}`))
      .slice(0, 5);

    const duplicates = (Array.isArray(ai?.duplicates) ? ai.duplicates : [])
      .map((g) => [...new Set((Array.isArray(g) ? g : []).map(Number).filter((p) => Number.isInteger(p) && p >= 1 && p <= n))].sort((a, b) => a - b))
      .filter((g) => g.length >= 2)
      .slice(0, 5);

    return Response.json({ order, reordered: order.some((p, i) => p !== i + 1), missing, duplicates });
  } catch (err) {
    return errorResponse(err);
  }
};
