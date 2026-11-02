// /.netlify/functions/detect   ("No more typing", PRD FR9)
//   POST { text, lang }  -> { contract_type, language, other_party, key_dates: [{ what, date }] }
//   (`what` is in the user's language, `lang`; the date is copied exactly from the contract)
// Reads the start of an uploaded contract (already masked in the browser) and works out what it is,
// so the app can pre-fill the contract type and the user only taps to confirm or change it.
// Checked in code: the type must be one the app knows, and the other party and every date must
// appear in the contract itself. Nothing here is saved; the user's choice is.

import { HttpError, errorResponse } from '../lib/http.mjs';
import { chatJsonHedged, TEXT_MODEL } from '../lib/ai.mjs';
import { cleanText } from '../lib/wording.mjs';
import { LANGUAGE_NAMES } from '../lib/prompts.mjs';
import { norm } from '../lib/verify.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';

const TYPES = ['job_offer', 'rental', 'phone_subscription', 'loan', 'business', 'other'];
const READ_CHARS = 15000;

const system = (lang) => `You look at the start of a contract or letter for a person in Singapore and say what it is.
- "contract_type": exactly one of: job_offer (a job offer or employment contract), rental (renting a home or room), phone_subscription (a phone plan, internet, gym or other subscription), loan (a loan, credit or instalment plan), business (between businesses, e.g. a supplier or service agreement), other.
- "language": the name of the language the document is written in, written in ${LANGUAGE_NAMES[lang]}${lang === 'en' ? ' (e.g. "English", "Chinese")' : ''}.
- "other_party": the name of the company or person the user would be signing with (the employer, landlord, telco or lender), exactly as written in the document, or "" if not clear.
- "key_dates": up to 4 dates that matter to the person signing (e.g. start date, reply-by date, end of the contract). For each: "what" (2 to 5 plain words saying what the date is, written in ${LANGUAGE_NAMES[lang]}${lang === 'en' ? ', e.g. "Start date"' : ', even if the document is in English'}) and "date" (copied exactly as written in the document). Only dates written in the document.
Reply with JSON only: { "contract_type": "...", "language": "...", "other_party": "...", "key_dates": [ { "what": "...", "date": "..." } ] }`;

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { text, lang: asked } = await req.json().catch(() => ({}));
    const lang = LANGUAGE_NAMES[asked] ? asked : 'en';
    // Masked in the browser already; masked again here as a backstop.
    const contract = hidePersonalNumbers(String(text ?? '')).text.trim();
    if (contract.length < 20) throw new HttpError(422, 'There is no text to look at.');

    const ai = await chatJsonHedged({
      model: TEXT_MODEL,
      thinking: false,
      maxTokens: 400,
      messages: [
        { role: 'system', content: system(lang) },
        { role: 'user', content: contract.slice(0, READ_CHARS) },
      ],
    }, { hedgeAfterMs: 6000, timeoutMs: 15000, busyMessage: 'Working out what this contract is took too long. Please try again.' });

    const inContract = (v) => {
      const s = String(v ?? '').trim();
      return s && norm(contract).includes(norm(s)) ? s.slice(0, 120) : '';
    };
    // Letters and the marks that go with them (Tamil vowel signs), nothing else.
    const language = String(ai?.language ?? '').replace(/[^\p{L}\p{M} ]/gu, '').trim().slice(0, 30);
    return Response.json({
      contract_type: TYPES.includes(ai?.contract_type) ? ai.contract_type : 'other',
      language,
      other_party: inContract(ai?.other_party),
      key_dates: (Array.isArray(ai?.key_dates) ? ai.key_dates : [])
        .map((d) => ({ what: cleanText(String(d?.what ?? ''), 40), date: inContract(d?.date).slice(0, 40) }))
        .filter((d) => d.what && d.date)
        .slice(0, 4),
    });
  } catch (err) {
    return errorResponse(err);
  }
};
