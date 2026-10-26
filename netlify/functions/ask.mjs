// /.netlify/functions/ask
//   POST ?id=...  { question }  -> { user, reply }   (both are also saved in the contract's `chat`)
//
// Answers come only from the uploaded contract. The server keeps an answer only if it points to a
// real clause; otherwise, or for "is this legal?" questions, the reply is "I'm not sure, ask an expert."

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { chat, chatJsonHedged, TEXT_MODEL, TRANSLATE_MODEL, VERIFY_MODEL } from '../lib/nvidia.mjs';
import { askSystem, clausesForPrompt, NOT_SURE_BY_LANG, LANGUAGE_NAMES, VERIFY_SYSTEM } from '../lib/prompts.mjs';
import { inScript } from '../lib/scripts.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';
import { clauseLookup, TYPE_LABELS } from '../lib/contract-task.mjs';
import { cleanText } from '../lib/wording.mjs';

const MAX_QUESTION = 500;
const HISTORY_TURNS = 3; // earlier questions sent with a new one, so follow-ups make sense
const MAX_SAVED = 60;

const norm = (t) => String(t).replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');

    const { question } = await req.json().catch(() => ({}));
    // Someone might type their NRIC or account number into a question: never save it or send it to the AI.
    const q = typeof question === 'string' ? hidePersonalNumbers(question.trim().slice(0, MAX_QUESTION)).text : '';
    if (q.length < 2) throw new HttpError(400, 'Please type a question.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=contract_type,language,raw_text,clauses,risks,chat&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');

    const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);
    const history = Array.isArray(row.chat) ? row.chat : [];
    const warnings = (row.risks?.items || []).map((r) =>
      `${r.title} (${/^\d/.test(r.clause_numbers[0]) ? 'Clause ' : ''}${r.clause_numbers[0]}): ${r.kind === 'scam_sign' ? 'a common scam sign' : 'worth asking about'}`);

    // Earlier turns, with past replies in the same JSON shape we ask for, so the model keeps to it.
    const past = history.slice(-HISTORY_TURNS * 2).map((m) => (m.role === 'user'
      ? { role: 'user', content: m.text }
      : { role: 'assistant', content: JSON.stringify({ found: !m.not_sure, answer: m.text, clauses: m.clause_numbers || [], quote: m.quote || '' }) }));

    // Replies come in the contract's chosen language. Lightning tends to stay in English,
    // so other languages use the translation model.
    const lang = NOT_SURE_BY_LANG[row.language] ? row.language : 'en';
    const text = await chat({
      model: lang === 'en' ? TEXT_MODEL : TRANSLATE_MODEL,
      thinking: false,
      maxTokens: 700,
      messages: [
        { role: 'system', content: askSystem(TYPE_LABELS[row.contract_type], clausesForPrompt(clauses), warnings, lang) },
        ...past,
        // Repeated here because the model otherwise follows the language of earlier replies.
        { role: 'user', content: lang === 'en' ? q : `${q}\n\n(Write the answer in ${LANGUAGE_NAMES[lang]}.)` },
      ],
    });

    let built = buildReply(text, clauses, lang);
    // Second check: the cited clause must really say what the answer claims, not just exist.
    if (!built.not_sure && !(await supported(q, built, clauses, warnings))) {
      built = { text: NOT_SURE_BY_LANG[lang], not_sure: true, clause_numbers: [], quote: '' };
    }

    const now = new Date().toISOString();
    const user = { role: 'user', text: q, created_at: now };
    const reply = { role: 'assistant', ...built, lang, created_at: now };
    await updateContract(query, { clauses, chat: [...history, user, reply].slice(-MAX_SAVED) });
    return Response.json({ user, reply });
  } catch (err) {
    return errorResponse(err);
  }
};

// Asks whether the cited clauses directly state everything the answer claims. The larger model
// judged all 6 test answers correctly (the fast one 5 of 6) but is sometimes slow, so both run at
// once: the larger model's verdict is used if it arrives in time, otherwise the fast one's.
// If neither answers, the answer is not shown.
async function supported(question, reply, clauses, warnings) {
  const cited = reply.clause_numbers
    .map((n) => clauses.find((c) => c.number === n))
    .filter(Boolean)
    .map((c) => `[${c.number}] ${c.text}`)
    .join('\n');
  const options = (model) => ({
    model,
    thinking: false,
    maxTokens: 200,
    messages: [
      { role: 'system', content: VERIFY_SYSTEM },
      {
        role: 'user',
        content: `Warning signs found in this contract:\n${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- none'}\n\nClauses cited:\n${cited}\n\nQuestion: ${question}\nAnswer: ${reply.text}`,
      },
    ],
  });
  const quick = chatJsonHedged(options(TEXT_MODEL), { hedgeAfterMs: 4000, timeoutMs: 12000 }).catch(() => null);
  const careful = await chatJsonHedged(options(VERIFY_MODEL), { hedgeAfterMs: 5000, timeoutMs: 13000 }).catch(() => null);
  const verdict = careful ?? await quick;
  if (verdict?.supported !== true) console.log('Answer not shown, clause check failed:', verdict?.reason || 'no verdict');
  return verdict?.supported === true;
}

function buildReply(text, clauses, lang) {
  const lookup = clauseLookup(clauses);
  const byNumber = new Map(clauses.map((c) => [c.number, c]));

  let ai;
  try {
    ai = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    // Sometimes the model answers in plain text; keep it only if it names a real clause.
    const refs = [...text.matchAll(/\bClause\s+(\d+(?:\.\d+)*)|\b(Acceptance)\b/gi)].map((m) => m[1] || m[2]);
    ai = { found: refs.length > 0, answer: text, clauses: refs, quote: '' };
  }

  let numbers = [...new Set((Array.isArray(ai?.clauses) ? ai.clauses : []).map(lookup).filter(Boolean))];
  const answer = cleanText(ai?.answer, 600);

  // Grounding check: no real clause (or nothing left after removing banned wording) means not sure.
  if (ai?.found === false || !numbers.length || !answer) {
    // Add the AI's short reason only if it is in the chosen language.
    const reason = ai?.found === false && inScript(lang, cleanText(ai?.answer, 160)) ? cleanText(ai?.answer, 160) : '';
    const notSure = NOT_SURE_BY_LANG[lang];
    return { text: reason ? `${notSure} ${reason}` : notSure, not_sure: true, clause_numbers: [], quote: '' };
  }

  // Keep the quote only if it is really in the contract, and point to the clause that has it.
  let quote = typeof ai.quote === 'string' ? ai.quote.trim() : '';
  if (quote && !norm(byNumber.get(numbers[0]).text).includes(norm(quote))) {
    const home = clauses.filter((c) => norm(c.text).includes(norm(quote)));
    if (home.length === 1) numbers = [home[0].number, ...numbers.filter((n) => n !== home[0].number)];
    else quote = '';
  }

  // The model often "quotes" a whole clause; keep the opening words (still word for word).
  const words = quote.split(/\s+/);
  if (words.length > 35) quote = `${words.slice(0, 35).join(' ')}…`;

  return { text: answer, not_sure: false, clause_numbers: numbers.slice(0, 4), quote };
}
