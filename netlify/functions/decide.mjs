// /.netlify/functions/decide   ("You decide", PRD FR8)
//   POST ?id=...&action=draft  -> { decisions }  draft message about the warnings marked "I'll ask about this"
//   POST ?id=...&action=plain  -> { decisions }  plain-words version of the saved (edited) draft
//
// The draft is always in English, since it goes to the other party; for Chinese, Malay or Tamil a
// plain-words version in that language comes with it, for the user only. The app never sends it.
// Marks, edits and the chosen option are saved through contracts.mjs (PATCH decisions).
//
// Checked in code before it is shown: every number, amount, date and name must be in the contract;
// no "illegal" / "scam" wording, threats or talk of lawyers; NRIC, bank numbers and contact details
// stay hidden (and names too, if "Hide these too" is on). One rewrite, then an error with Try again.

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { chatJsonHedged, timeBudget, DECIDE_MODEL, MAX_CALL_MS } from '../lib/ai.mjs';
import { draftSystem, plainSystem, clausesForPrompt, RECIPIENT } from '../lib/prompts.mjs';
import { withReferencedParts, TYPE_LABELS } from '../lib/contract-task.mjs';
import { BANNED, cleanText } from '../lib/wording.mjs';
import { unsupportedFacts, namesUsedThroughout, norm } from '../lib/verify.mjs';
import { inScript } from '../lib/scripts.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';

const LANGS = ['zh', 'ms', 'ta'];
const MAX_DRAFT_CHARS = 1500;

// Words a letter uses that are capitalised but are not names from the contract.
const LETTER_WORDS = ['hello', 'hi', 'dear', 'thank', 'thanks', 'regards', 'kind', 'best', 'sincerely', 'yours',
  'team', 'hiring', 'manager', 'hr', 'could', 'would', 'please', 'clause', 'clauses', 'schedule'];
const THREATS = /\b(lawyers?|solicitors?|courts?|police|sue|suing|legal action|report (?:you|this|it)|authorities)\b/i;

const clauseName = (n) => (/^\d/.test(n) ? `Clause ${n}` : n);

export default async (req) => {
  const timeLeft = timeBudget();
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');
    const action = new URL(req.url).searchParams.get('action');
    if (!['draft', 'plain'].includes(action)) throw new HttpError(400, 'Nothing to do.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=contract_type,language,raw_text,clauses,risks,personal,decisions&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
    if (!row.risks) throw new HttpError(409, 'The risk check is not ready yet.');
    const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);
    const lang = LANGS.includes(row.language) ? row.language : 'en';
    const saved = row.decisions || {};

    let change;
    if (action === 'draft') {
      const marked = Object.entries(saved.risks || {})
        .filter(([i, mark]) => mark === 'ask' && row.risks.items[Number(i)])
        .map(([i]) => Number(i))
        .sort((a, b) => a - b);
      if (!marked.length) throw new HttpError(409, 'Mark a warning "I\'ll ask about this" on the Risks tab to get a draft message.');
      const { message, plain, unchecked } = await makeDraft(row, clauses, marked, lang, timeLeft);
      // unchecked: the draft is shown with a note to check one part against the contract (e.g. named sections).
      change = { message, message_plain: plain ? { lang, text: plain } : null, plain_outdated: false, draft_for: marked, message_unchecked: Boolean(unchecked) };
    } else {
      if (lang === 'en') throw new HttpError(400, 'The plain-words version is for Chinese, Malay or Tamil.');
      if (!saved.message) throw new HttpError(409, 'There is no draft message yet.');
      change = { message_plain: { lang, text: await makePlain(saved.message, lang, timeLeft) }, plain_outdated: false };
    }

    // Re-read before saving: marks or edits may have been saved while the AI was writing.
    const [latest] = await selectContracts(`select=decisions&${query}`);
    const decisions = { ...(latest?.decisions || {}), ...change, updated_at: new Date().toISOString() };
    // The draft was edited again while its plain-words version was being made.
    if (action === 'plain' && (latest?.decisions?.message || '') !== saved.message) decisions.plain_outdated = true;
    await updateContract(query, { decisions });
    return Response.json({ decisions });
  } catch (err) {
    return errorResponse(err);
  }
};

async function makeDraft(row, clauses, marked, lang, timeLeft) {
  const items = row.risks.items;
  const company = row.risks.company?.name || '';
  const points = marked.map((i) => {
    const r = items[i];
    return `- ${r.title} (${r.clause_numbers.map(clauseName).join(', ')}): ${r.explanation || ''}${r.quote ? ` The contract says: "${r.quote}"` : ''}`;
  });
  const parts = withReferencedParts(clauses, clauses.filter((c) => marked.some((i) => items[i].clause_numbers.includes(c.number))));
  const prompt = [
    `Contract type: ${TYPE_LABELS[row.contract_type]}`,
    `Write to: ${RECIPIENT[row.contract_type] || RECIPIENT.other}${company ? ` (company name: ${company})` : ''}`,
    `POINTS TO ASK ABOUT:\n${points.join('\n')}`,
    `THE CONTRACT PARTS:\n${clausesForPrompt(parts).slice(0, 15000)}`,
  ].join('\n\n');

  let note = '';
  let soft = null; // the last draft that is fine except for the fact check
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt && timeLeft() < 10000) break;
    const ai = await chatJsonHedged({
      model: DECIDE_MODEL,
      thinking: false,
      maxTokens: 1200,
      messages: [
        { role: 'system', content: draftSystem(lang) },
        { role: 'user', content: prompt + note },
      ],
    }, { hedgeAfterMs: 6000, timeoutMs: Math.min(MAX_CALL_MS, timeLeft() - 3000) });
    const message = tidyDraft(ai?.message, row);
    const problem = draftProblem(message, clauses);
    if (!problem) return { message, plain: lang === 'en' ? '' : cleanPlain(ai?.plain, lang) };
    const hard = !message || message.split(/\s+/).length < 12 || BANNED.test(message) || THREATS.test(message);
    if (!hard) soft = { message, plain: lang === 'en' ? '' : cleanPlain(ai?.plain, lang), problem };
    console.log(`Draft message failed the check: ${problem}.${attempt ? '' : ' Asking again.'}`);
    note = `\n\nYour last draft could not be used because ${problem}. Write it again and fix that.`;
  }
  if (soft) return { message: soft.message, plain: soft.plain, unchecked: soft.problem };
  throw new HttpError(502, 'We couldn\'t make a draft we could check against your contract. Please try again.');
}

// Personal details stay out of the draft, however the AI wrote it.
function tidyDraft(text, row) {
  let message = hidePersonalNumbers(String(text ?? '').replace(/\*\*/g, '').trim().slice(0, MAX_DRAFT_CHARS)).text;
  const found = row.personal?.found || {};
  // Contact details always; names only if the user chose "Hide these too" (a payee's name may
  // be what they are asking about).
  const hide = [...(found.addresses || []), ...(found.phones || []), ...(found.emails || []),
    ...(row.personal?.hide_extra ? found.names || [] : [])].map((v) => (typeof v === 'string' ? v : v?.value)).filter(Boolean);
  for (const value of hide) message = message.split(value).join('[hidden]');
  return message;
}

// What is wrong with a draft, or '' if it passes.
function draftProblem(message, clauses) {
  if (!message || message.split(/\s+/).length < 12) return 'it was empty or too short';
  if (BANNED.test(message)) return 'it used words like "illegal", "safe" or "scam"';
  if (THREATS.test(message)) return 'it mentioned lawyers, courts or reporting them';
  const known = new Set([...namesUsedThroughout(clauses), ...LETTER_WORDS.map(norm)]);
  const missing = unsupportedFacts(message, [clauses.map((c) => c.text).join('\n')], '', known);
  return missing.length ? `these numbers, dates or names are not in the contract: ${missing.join(', ')}` : '';
}

const cleanPlain = (text, lang) => {
  const plain = cleanText(String(text ?? '').replace(/\*\*/g, ''), 800);
  return plain && inScript(lang, plain) ? plain : '';
};

async function makePlain(message, lang, timeLeft) {
  const ai = await chatJsonHedged({
    model: DECIDE_MODEL,
    thinking: false,
    maxTokens: 800,
    messages: [
      { role: 'system', content: plainSystem(lang) },
      { role: 'user', content: message },
    ],
  }, { hedgeAfterMs: 6000, timeoutMs: Math.min(MAX_CALL_MS, timeLeft() - 3000) });
  const plain = cleanPlain(ai?.plain, lang);
  if (!plain) throw new HttpError(502, 'The plain-words version did not come out right. Please try again.');
  return plain;
}
