// Shared shape for "run an AI task on one contract, once, then save it".
//   POST ?id=...  -> { clauses, [field]: result }
// If the result is already saved it is returned straight away, so the AI runs once per contract.

import { HttpError, errorResponse, requireDevice, contractIdParam } from './http.mjs';
import { selectContracts, updateContract } from './supabase.mjs';
import { splitClauses } from './clauses.mjs';
import { chatJsonHedged, timeBudget, MAX_CALL_MS, TEXT_MODEL } from './ai.mjs';
import { clausesForPrompt } from './prompts.mjs';

export const TYPE_LABELS = {
  job_offer: 'Job offer',
  rental: 'Rental',
  phone_subscription: 'Phone / Subscription',
  loan: 'Loan',
  business: 'Business',
  other: 'Other',
};

// Lookup that turns "Clause 4.4" / "[Acceptance]" / "Paragraph 3" / "Item 4 of Schedule A" into the
// contract's own clause number ("4.4", "Acceptance", "Para 3", "Schedule A"), or null if there is none.
export function clauseLookup(clauses) {
  const known = new Map(clauses.map((c) => [c.number.toLowerCase(), c.number]));
  return (ref) => {
    const key = String(ref).replace(/[[\]()]/g, '').replace(/^(clause|section)\s+/i, '').trim().toLowerCase()
      .replace(/^(paragraph|para\.?|p\.?)\s*(\d+)$/, 'para $2');
    const attachment = key.match(/\b(schedule|annex(?:ure)?|appendix|exhibit|attachment)\s+([a-z]{1,2}|\d{1,2})\b/);
    // In a document split into paragraphs, the AI often writes "8" for "Para 8".
    return known.get(key) || (/^\d+$/.test(key) && known.get(`para ${key}`))
      || (attachment && known.get(`${attachment[1]} ${attachment[2]}`)) || null;
  };
}

// The given clauses plus every schedule, annex or appendix they mention ("as stated in Schedule B").
export function withReferencedParts(clauses, parts) {
  const lookup = clauseLookup(clauses);
  const out = [...parts];
  for (const p of parts) {
    for (const m of p.text.matchAll(/\b(schedule|annex(?:ure)?|appendix|exhibit|attachment)s?\s+([A-Z]{1,2}|\d{1,2})\b/gi)) {
      const label = lookup(`${m[1]} ${m[2]}`);
      const c = label && clauses.find((x) => x.number === label);
      if (c && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

// Either give `system` + `build` (one AI call, then build the result from its JSON),
// or `run(clauses, row, timeLeft)` for a task that needs its own AI calls. Both get `timeLeft()`,
// the milliseconds still free for AI steps (ai.mjs timeBudget).
export function contractTask({
  field, system, model = TEXT_MODEL, maxTokens = 2000, timing = { hedgeAfterMs: 10000, timeoutMs: MAX_CALL_MS }, build, run,
}) {
  return async (req) => {
    const timeLeft = timeBudget();
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      const deviceId = requireDevice(req);
      const id = contractIdParam(req);
      if (!id) throw new HttpError(400, 'Missing contract ID.');

      const query = `id=eq.${id}&device_id=eq.${deviceId}`;
      const [row] = await selectContracts(`select=contract_type,raw_text,clauses,${field}&${query}`);
      if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
      if (row[field]) return Response.json({ clauses: row.clauses, [field]: row[field] });

      const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);
      if (!clauses.length) throw new HttpError(422, 'We could not find any clauses in this contract.');

      // ?demo=fail (PRD FR10): mistakes are added on purpose for the judges' demo. Never otherwise.
      const demo = new URL(req.url).searchParams.get('demo') === 'fail';
      const result = run
        ? await run(clauses, row, timeLeft, { demo })
        : await build(await chatJsonHedged({
          model,
          thinking: false,
          maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Contract type: ${TYPE_LABELS[row.contract_type]}\n\n${clausesForPrompt(clauses)}` },
          ],
        }, timing), clauses, row, timeLeft, { demo });
      await updateContract(query, { clauses, [field]: result });
      return Response.json({ clauses, [field]: result });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
