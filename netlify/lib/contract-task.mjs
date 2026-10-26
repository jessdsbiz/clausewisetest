// Shared shape for "run an AI task on one contract, once, then save it".
//   POST ?id=...  -> { clauses, [field]: result }
// If the result is already saved it is returned straight away, so the AI runs once per contract.

import { HttpError, errorResponse, requireDevice, contractIdParam } from './http.mjs';
import { selectContracts, updateContract } from './supabase.mjs';
import { splitClauses } from './clauses.mjs';
import { chatJsonHedged, TEXT_MODEL } from './nvidia.mjs';
import { clausesForPrompt } from './prompts.mjs';

export const TYPE_LABELS = {
  job_offer: 'Job offer',
  rental: 'Rental',
  phone_subscription: 'Phone / Subscription',
  loan: 'Loan',
  business: 'Business',
  other: 'Other',
};

// Lookup that turns "Clause 4.4" / "[Acceptance]" / "Paragraph 3" into the contract's own
// clause number ("4.4", "Acceptance", "Para 3"), or null if there is no such clause.
export function clauseLookup(clauses) {
  const known = new Map(clauses.map((c) => [c.number.toLowerCase(), c.number]));
  return (ref) => {
    const key = String(ref).replace(/[[\]()]/g, '').replace(/^(clause|section)\s+/i, '').trim().toLowerCase()
      .replace(/^(paragraph|para\.?|p\.?)\s*(\d+)$/, 'para $2');
    // In a document split into paragraphs, the AI often writes "8" for "Para 8".
    return known.get(key) || (/^\d+$/.test(key) && known.get(`para ${key}`)) || null;
  };
}

// Either give `system` + `build` (one AI call, then build the result from its JSON),
// or `run(clauses, row)` for a task that needs its own AI calls.
export function contractTask({ field, system, maxTokens = 2000, build, run }) {
  return async (req) => {
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

      const result = run
        ? await run(clauses, row)
        : build(await chatJsonHedged({
          model: TEXT_MODEL,
          thinking: false,
          maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Contract type: ${TYPE_LABELS[row.contract_type]}\n\n${clausesForPrompt(clauses)}` },
          ],
        }, { hedgeAfterMs: 13000, timeoutMs: 26000 }), clauses, row);
      await updateContract(query, { clauses, [field]: result });
      return Response.json({ clauses, [field]: result });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
