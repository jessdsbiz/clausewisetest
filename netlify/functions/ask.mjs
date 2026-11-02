// /.netlify/functions/ask
//   POST ?id=...  { question }  -> { user, reply }   (both are also saved in the contract's `chat`)
//
// Answers come only from the uploaded contract. An answer is shown only if
//   1. the AI's reply is valid JSON (never raw model text),
//   2. its quotes are really in the contract and contain every number, date and name in the
//      answer (checked in code, verify.mjs), and
//   3. a second AI pass agrees the quoted parts say what the answer claims.
// Before replying "I'm not sure", it searches again, pointing the AI at the parts most likely to
// hold the answer and any schedule they refer to (e.g. a fee clause that says "see Schedule B").

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { chatJsonHedged, ASK_MODEL, TEXT_MODEL, VERIFY_MODEL, FUNCTION_LIMIT_MS } from '../lib/ai.mjs';
import { askSystem, clausesForPrompt, NOT_SURE_BY_LANG, LANGUAGE_NAMES, VERIFY_SYSTEM } from '../lib/prompts.mjs';
import { inScript } from '../lib/scripts.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';
import { clauseLookup, withReferencedParts, TYPE_LABELS } from '../lib/contract-task.mjs';
import { cleanText, cleanAdvice } from '../lib/wording.mjs';
import { checkPoint, norm } from '../lib/verify.mjs';

const MAX_QUESTION = 500;
const HISTORY_TURNS = 3; // earlier questions sent with a new one, so follow-ups make sense
const MAX_SAVED = 60;

// "Should I sign?" and the like, in each language. The choice is the user's (PRD FR8), so these get
// a fixed reply pointing to "You decide", never an answer from the AI.
const ASKS_WHETHER_TO_SIGN = [
  // "When do I sign…?" or "How can I accept…?" ask how, not whether, so they get a normal answer.
  /(?<!\b(?:when|where|how|what|why)\s)\b(should|shall|must|can|could|would|do)\s+(i|we)\s+(sign|accept|take (it|this|the (job|offer))|go ahead|reject|decline|turn (it|this) down|walk away)\b/i,
  /\b(is it|is this)\s+(ok|okay|safe|fine|good|wise|a good idea)\s+to\s+(sign|accept)\b/i,
  /\bwould you (sign|accept)\b|\bworth signing\b|\bsign (it )?or not\b|\brecommend\b.*\b(sign|accept)/i,
  /(要不要|该不该|应不应该|应该|可不可以|可以|能不能|好不好).{0,6}(签|接受)|签不签|值得签|签吗/,
  /\b(patut|perlu|boleh|harus|wajar)(kah)?\s+(saya|kami|aku)\s+(tandatangan|menandatangani|terima|menerima)|\btandatangan(i)?\s+atau\s+tidak/i,
  /கையெழுத்து\s*(போடலாமா|போட வேண்டுமா|இடலாமா)|கையெழுத்திடலாமா|கையெழுத்திட வேண்டுமா|ஏற்கலாமா|ஏற்க வேண்டுமா/,
];
const DECIDE_REPLY_BY_LANG = {
  en: 'Whether to sign is your choice. ClauseWise SG points out what to check, but it cannot tell you to sign or not. Open "You decide" to see the points you marked, a draft message you can send, and your options. For a big decision, get a qualified professional to review the contract.',
  zh: '签不签由你决定。ClauseWise SG 只会指出需要检查的地方，不会告诉你签还是不签。打开“由你决定”，查看你标记的问题、可以发送的草稿信息和你的选择。如果是重大决定，请找合格的专业人士审阅合同。',
  ms: 'Sama ada mahu menandatangani atau tidak ialah pilihan anda. ClauseWise SG menunjukkan perkara yang perlu diperiksa, tetapi tidak boleh memberitahu anda sama ada untuk menandatangani. Buka "Anda yang tentukan" untuk melihat perkara yang anda tandakan, draf mesej yang boleh anda hantar, dan pilihan anda. Untuk keputusan besar, minta profesional yang layak menyemak kontrak ini.',
  ta: 'கையெழுத்திடுவதா இல்லையா என்பது உங்கள் முடிவு. ClauseWise SG சரிபார்க்க வேண்டியவற்றைக் காட்டுகிறது, ஆனால் கையெழுத்திடச் சொல்லவோ வேண்டாம் என்று சொல்லவோ முடியாது. நீங்கள் குறித்த விஷயங்கள், அனுப்பக்கூடிய வரைவுச் செய்தி மற்றும் உங்கள் தேர்வுகளைப் பார்க்க "நீங்களே முடிவு செய்யுங்கள்" என்பதைத் திறக்கவும். பெரிய முடிவுக்கு, தகுதியான நிபுணரிடம் ஒப்பந்தத்தைச் சரிபார்க்கச் சொல்லுங்கள்.',
};
// Everything must finish inside the function time limit (60s live, 30s in netlify dev).
const BUDGET_MS = FUNCTION_LIMIT_MS - 5000;

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const started = Date.now();
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
      : { role: 'assistant', content: JSON.stringify({ found: !m.not_sure, answer: m.text, clauses: m.clause_numbers || [], quotes: m.quote ? [m.quote] : [] }) }));

    const lang = NOT_SURE_BY_LANG[row.language] ? row.language : 'en';
    if (ASKS_WHETHER_TO_SIGN.some((re) => re.test(q))) {
      return await saveTurn(query, clauses, history, q, lang, { text: DECIDE_REPLY_BY_LANG[lang], not_sure: false, decide: true, clause_numbers: [], quote: '' });
    }
    const system = askSystem(TYPE_LABELS[row.contract_type], clausesForPrompt(clauses), warnings, lang);
    // Repeated here because the model otherwise follows the language of earlier replies.
    const inLanguage = lang === 'en' ? '' : `\n\n(Write the answer in ${LANGUAGE_NAMES[lang]}.)`;
    const ask = (content, timeoutMs) => chatJsonHedged({
      model: ASK_MODEL,
      thinking: false,
      maxTokens: 1500,
      messages: [{ role: 'system', content: system }, ...past, { role: 'user', content }],
    }, { hedgeAfterMs: Math.min(9000, timeoutMs - 3000), timeoutMs }).catch((err) => {
      console.log('Chat answer failed:', err.message);
      return null;
    });

    const left = () => BUDGET_MS - (Date.now() - started);
    const step = (name) => process.env.CLAUSEWISE_DEBUG && console.log(`  [ask ${((Date.now() - started) / 1000).toFixed(1)}s] ${name}`);
    let built = buildReply(await ask(`${q}${inLanguage}`, Math.round(BUDGET_MS * 0.45)), clauses, lang);

    // The answer failed the quote check: try again (twice at most, while there is time), telling the
    // AI exactly which items were not in its quotes.
    step('first answer');
    for (let tries = 0; built.rejected && tries < 2 && left() > 15000; tries++) {
      const fix = `${q}\n\nYour last answer could not be shown because ${built.rejected}. Answer again, more simply. For each of those items, either add a quote that contains it, copied exactly from the contract (for a table, copy the rows as written; for a defined term, quote its definition), or leave it out of the answer. Answer only what was asked.${inLanguage}`;
      built = buildReply(await ask(fix, Math.min(BUDGET_MS * 0.3, left() - 6000)), clauses, lang);
      step(`repair ${tries + 1}`);
    }

    // Search again before saying "not sure": point the AI at the likeliest parts, schedules included.
    if (built.not_sure && !built.rejected && left() > 15000) {
      const focus = likelyParts(clauses, q);
      if (focus.length) {
        const hint = `${q}\n\nLook carefully at these parts of the contract before answering, including any table rows in them:\n${clausesForPrompt(focus).slice(0, 7000)}${inLanguage}`;
        const second = buildReply(await ask(hint, Math.min(BUDGET_MS * 0.4, left() - 6000)), clauses, lang);
        if (!second.not_sure) built = second;
      }
    }

    // Final check: the quoted parts must really say what the answer claims, not just contain its numbers.
    step('search done');
    if (!built.not_sure && !(await supported(q, built, clauses, warnings, Math.max(4000, left())))) {
      built = notSure(lang);
    }
    step('final check done');

    const { rejected, evidence, ...shown } = built;
    return await saveTurn(query, clauses, history, q, lang, shown);
  } catch (err) {
    return errorResponse(err);
  }
};

async function saveTurn(query, clauses, history, q, lang, shown) {
  const now = new Date().toISOString();
  const user = { role: 'user', text: q, created_at: now };
  const reply = { role: 'assistant', ...shown, lang, created_at: now };
  await updateContract(query, { clauses, chat: [...history, user, reply].slice(-MAX_SAVED) });
  return Response.json({ user, reply });
}

const notSure = (lang, reason = '') => ({
  text: reason ? `${NOT_SURE_BY_LANG[lang]} ${reason}` : NOT_SURE_BY_LANG[lang], not_sure: true, clause_numbers: [], quote: '',
});

// The parts of the contract most likely to answer the question (by shared words), plus every
// schedule or annex those parts point to.
const STOP = new Set(['what', 'when', 'where', 'which', 'who', 'how', 'does', 'will', 'can', 'could', 'should', 'would',
  'the', 'and', 'for', 'are', 'you', 'your', 'have', 'has', 'this', 'that', 'there', 'with', 'about', 'suppose', 'supposed',
  'contract', 'agreement', 'tell', 'mean', 'means', 'say', 'says', 'any', 'get', 'not', 'from', 'into', 'its', 'they']);
const RELATED = {
  pay: ['payment', 'instalment', 'fee', 'due', 'payable'], fee: ['fees', 'instalment', 'payable', 'due', 'payment'],
  when: ['date', 'due', 'deadline'], refund: ['refund', 'withdraw'], cancel: ['terminat', 'withdraw', 'cancel'],
  quit: ['terminat', 'notice', 'resign'], leave: ['leave', 'notice'], salary: ['salary', 'remunerat', 'pay'],
};
function likelyParts(clauses, question) {
  const words = (question.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w));
  const stems = [...new Set(words.flatMap((w) => [w.slice(0, 5), ...(RELATED[w.slice(0, 4)] || RELATED[w] || [])]))];
  if (!stems.length) return [];
  const scored = clauses
    .map((c) => ({ c, score: stems.reduce((n, s) => n + (norm(c.text).split(s).length - 1), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.c);
  return withReferencedParts(clauses, scored);
}

// Asks whether the quoted parts directly state everything the answer claims. The larger model
// judged all 6 test answers correctly (the fast one 5 of 6) but is sometimes slow, so both run at
// once: the larger model's verdict is used if it arrives in time, otherwise the fast one's.
// If neither answers, the answer is not shown. On Claude both are the same model, so it runs once.
async function supported(question, reply, clauses, warnings, timeoutMs) {
  const cited = withReferencedParts(clauses, reply.evidence.map((n) => clauses.find((c) => c.number === n)).filter(Boolean));
  const options = (model) => ({
    model,
    thinking: false,
    maxTokens: 200,
    messages: [
      { role: 'system', content: VERIFY_SYSTEM },
      {
        role: 'user',
        content: `Warning signs found in this contract:\n${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- none'}\n\nClauses cited:\n${clausesForPrompt(cited).slice(0, 12000)}\n\nQuestion: ${question}\nAnswer: ${reply.text}`,
      },
    ],
  });
  const quick = TEXT_MODEL === VERIFY_MODEL ? null
    : chatJsonHedged(options(TEXT_MODEL), { hedgeAfterMs: 4000, timeoutMs: Math.min(12000, timeoutMs) }).catch(() => null);
  const careful = await chatJsonHedged(options(VERIFY_MODEL), { hedgeAfterMs: 5000, timeoutMs: Math.min(13000, timeoutMs) }).catch(() => null);
  const verdict = careful ?? await quick;
  if (verdict?.supported !== true) console.log('Answer not shown, clause check failed:', verdict?.reason || 'no verdict');
  return verdict?.supported === true;
}

// Builds the reply from the AI's parsed JSON. Anything that can't be checked becomes "not sure".
function buildReply(ai, clauses, lang) {
  if (!ai || typeof ai !== 'object') return notSure(lang);
  const lookup = clauseLookup(clauses);
  // Keep only the answer itself, never field names or JSON the model wrote into it.
  // Also drops any sentence that tells them to sign or not (cleanAdvice): that choice is theirs.
  const answer = cleanAdvice(String(ai.answer ?? '').replace(/\s*\b(clauses|quotes?|found)\s*:\s*[[{"“].*$/is, ''), 700);

  if (ai.found === false || !answer) {
    // Add the AI's short reason only if it is in the chosen language.
    const reason = ai.found === false && inScript(lang, cleanText(ai.answer, 160)) ? cleanText(ai.answer, 160) : '';
    return notSure(lang, reason);
  }

  const cited = [...new Set((Array.isArray(ai.clauses) ? ai.clauses : []).map(lookup).filter(Boolean))];
  const quotes = Array.isArray(ai.quotes) ? ai.quotes : [ai.quote];
  const check = checkPoint(clauses, { texts: [answer], quotes, cited });
  if (!check.ok) {
    console.log('Answer not shown, quote check failed:', check.why);
    if (process.env.CLAUSEWISE_DEBUG) console.log('  answer:', answer, '\n  quotes:', JSON.stringify(quotes));
    return { ...notSure(lang), rejected: check.why };
  }

  // The model sometimes "quotes" a whole clause; keep the opening words (still word for word).
  let quote = check.quotes[0];
  const words = quote.split(/\s+/);
  if (words.length > 35) quote = `${words.slice(0, 35).join(' ')}…`;

  // Chips: where the quotes come from first, then the other parts the answer cited (e.g. the
  // clause that points to the schedule).
  const numbers = [...new Set([...check.clause_numbers, ...cited])];
  // `evidence` (every part quoted or cited) is for the final check only, not saved.
  return { text: answer, not_sure: false, clause_numbers: numbers.slice(0, 4), quote, evidence: numbers };
}
