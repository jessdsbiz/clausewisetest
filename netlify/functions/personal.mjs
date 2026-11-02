// /.netlify/functions/personal
//   POST ?id=...  -> { personal } for one contract, made once and then saved.
//   personal = {
//     hidden: { nric: [{ value, count }], accounts: [{ value, count }] },  // masked on upload
//     found:  { names: [], addresses: [], phones: [], emails: [] },        // still in the text
//     hide_extra: false,                                                   // "Hide these too"
//   }
//
// "hidden" is read from the saved text itself (the masked forms), so it always matches what was
// really masked. "found" comes from a quick AI pass; each item must appear word for word in the
// contract, or it is dropped.

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { chatJsonHedged, TEXT_MODEL } from '../lib/ai.mjs';
import { PERSONAL_SYSTEM, clausesForPrompt } from '../lib/prompts.mjs';
import { MASKED_NRIC, MASKED_ACCOUNT } from '../../public/js/privacy.js';

// Shared inboxes and the company's own name are not personal details.
const GENERIC_EMAIL = /^(hr|care|info|admin|support|sales|enquir\w*|contact|hello|service|billing|help|careers|jobs|accounts?|noreply|no-reply)@/i;
const COMPANY_WORDS = /\b(pte|ltd|limited|llp|inc|corp|company|bank)\b/i;

const flat = (s) => String(s).replace(/\s+/g, ' ').trim();

function tally(text, pattern) {
  const counts = new Map();
  for (const [m] of text.matchAll(pattern)) counts.set(m, (counts.get(m) || 0) + 1);
  return [...counts].map(([value, count]) => ({ value, count }));
}

function keep(list, text, extra = () => true) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((v) => (typeof v === 'string' ? flat(v) : ''))
    .filter((v) => v.length >= 3 && v.length <= 120 && !v.includes('*') && text.includes(v) && extra(v))
    .filter((v) => !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()))
    .slice(0, 8);
}

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=raw_text,clauses,personal&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
    if (row.personal) return Response.json({ personal: row.personal });

    const text = flat(row.raw_text || '');
    const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);

    const ai = await chatJsonHedged({
      model: TEXT_MODEL,
      thinking: false,
      maxTokens: 600,
      messages: [
        { role: 'system', content: PERSONAL_SYSTEM },
        { role: 'user', content: clausesForPrompt(clauses) },
      ],
    }, { hedgeAfterMs: 6000, timeoutMs: 20000 });

    const personal = {
      hidden: {
        nric: tally(text, MASKED_NRIC),
        accounts: tally(text, MASKED_ACCOUNT),
      },
      found: {
        names: keep(ai?.names, text, (v) => !COMPANY_WORDS.test(v) && /[a-z]/i.test(v)),
        addresses: keep(ai?.addresses, text, (v) => /\d/.test(v)),
        phones: keep(ai?.phones, text, (v) => v.replace(/\D/g, '').length >= 8),
        emails: keep(ai?.emails, text, (v) => /@/.test(v) && !GENERIC_EMAIL.test(v)),
      },
      hide_extra: false,
    };

    await updateContract(query, { personal });
    return Response.json({ personal });
  } catch (err) {
    return errorResponse(err);
  }
};
