// /.netlify/functions/contracts
//   GET              -> list this device's contracts
//   GET    ?id=...   -> one contract with its text
//   POST   (json)    -> save { raw_text, file_name, title, source_type, choices, situation }
//   PATCH  ?id=...   -> change { language, explain_mode, hide_personal, situation, decisions }
//                       decisions: { mark: { index, value: 'ask'|'ok'|'wrong'|null }, message, choice }
//   DELETE ?id=...   -> delete the contract and every saved result
//
// The original PDF or photo is never uploaded or stored: only the extracted text, which the
// browser has already masked (NRIC/FIN and bank/card numbers) and the server masks again here.

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import {
  selectContracts, insertContract, updateContract, deleteContractRow, removeFile,
} from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';

const MAX_TEXT_CHARS = 200_000;
const MAX_SITUATION_CHARS = 500;

// "Tell us about you": masked like the contract (the browser already did; this is the backstop).
const cleanSituation = (s) => hidePersonalNumbers(String(s ?? '').slice(0, MAX_SITUATION_CHARS)).text.trim();

const CONTRACT_TYPES = ['job_offer', 'rental', 'phone_subscription', 'loan', 'business', 'other'];
const EXPLAIN_MODES = ['plain', 'comic', 'audio'];
const LANGUAGES = ['en', 'zh', 'ms', 'ta'];
const SOURCE_TYPES = { pdf: 'application/pdf', photo: 'image/jpeg' };

const LIST_FIELDS = 'id,title,contract_type,explain_mode,language,source_type,file_name,status,created_at';
const DETAIL_FIELDS = `${LIST_FIELDS},mime_type,raw_text,clauses,summary,risks,comics,chat,translations,personal,situation,tailored,decisions,checks`;

// "You decide" (PRD FR8)
const MARKS = ['ask', 'ok', 'wrong'];
const CHOICES = ['sign', 'negotiate', 'expert', 'walk_away'];
const MAX_MESSAGE_CHARS = 3000;

export default async (req) => {
  try {
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);

    // `return await` so errors from these land in the catch below.
    switch (req.method) {
      case 'GET':
        return await (id ? getOne(deviceId, id) : list(deviceId));
      case 'POST':
        return await create(deviceId, req);
      case 'PATCH':
        if (!id) throw new HttpError(400, 'Missing contract ID.');
        return await change(deviceId, id, req);
      case 'DELETE':
        if (!id) throw new HttpError(400, 'Missing contract ID.');
        return await remove(deviceId, id);
      default:
        throw new HttpError(405, 'Method not allowed.');
    }
  } catch (err) {
    return errorResponse(err);
  }
};

async function list(deviceId) {
  const rows = await selectContracts(
    `select=${LIST_FIELDS}&device_id=eq.${deviceId}&order=created_at.desc`);
  return Response.json(rows);
}

async function getOne(deviceId, id) {
  const [row] = await selectContracts(`select=${DETAIL_FIELDS}&id=eq.${id}&device_id=eq.${deviceId}`);
  if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');
  return Response.json(row);
}

async function create(deviceId, req) {
  const body = await req.json().catch(() => null);
  if (!body) throw new HttpError(400, 'Upload was not readable.');

  const contractType = pick(body, 'contract_type', CONTRACT_TYPES);
  const explainMode = pick(body, 'explain_mode', EXPLAIN_MODES);
  const language = pick(body, 'language', LANGUAGES);
  const sourceType = pick(body, 'source_type', Object.keys(SOURCE_TYPES));

  // Backstop: the browser already masked the text, but never save an NRIC/FIN or an
  // account number by mistake.
  const rawText = hidePersonalNumbers(String(body.raw_text || '').slice(0, MAX_TEXT_CHARS)).text;
  if (rawText.trim().length < 20) throw new HttpError(422, 'We could not read any text in this file.');

  const fileName = String(body.file_name || 'contract').slice(0, 200);
  const row = await insertContract({
    device_id: deviceId,
    // A title from what was detected ("Job offer – BrightPath Solutions"), else the file name.
    title: String(body.title || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      || fileName.replace(/\.[^.]+$/, '').replace(/\.pdf$/i, '').slice(0, 120) || 'Contract',
    contract_type: contractType,
    explain_mode: explainMode,
    language,
    source_type: sourceType,
    file_path: '', // the original file is not stored
    file_name: fileName,
    mime_type: SOURCE_TYPES[sourceType],
    raw_text: rawText,
    clauses: splitClauses(rawText),
    situation: cleanSituation(body.situation),
    status: 'uploaded',
  });
  return Response.json({ id: row.id }, { status: 201 });
}

async function change(deviceId, id, req) {
  const body = await req.json().catch(() => ({}));
  const fields = {};
  if (body.language !== undefined) {
    if (!LANGUAGES.includes(body.language)) throw new HttpError(400, 'Please choose a valid language.');
    fields.language = body.language;
  }
  if (body.explain_mode !== undefined) {
    if (!EXPLAIN_MODES.includes(body.explain_mode)) throw new HttpError(400, 'Please choose a valid explain mode.');
    fields.explain_mode = body.explain_mode;
  }
  const [row] = await selectContracts(`select=id,personal,situation,translations,risks,decisions&id=eq.${id}&device_id=eq.${deviceId}`);
  if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');

  // "Hide these too" on the Personal details screen.
  if (body.hide_personal !== undefined) {
    if (!row.personal) throw new HttpError(409, 'Personal details have not been checked yet.');
    fields.personal = { ...row.personal, hide_extra: body.hide_personal === true };
  }

  // "Your situation": new words remake only the personal parts (tailor.mjs), so clear those and
  // their translations. The summary and warnings themselves stay as they are.
  let situation;
  if (body.situation !== undefined) {
    situation = cleanSituation(body.situation);
    if (situation !== (row.situation || '')) {
      fields.situation = situation;
      fields.tailored = null;
      fields.checks = null; // the new plan gets double-checked too (PRD FR10)
      const translations = row.translations || {};
      for (const lang of Object.keys(translations)) delete translations[lang].tailored;
      fields.translations = translations;
    }
  }
  // "You decide": one change at a time, merged into what is saved. The app sends them one after
  // another, so two quick taps can't overwrite each other.
  if (body.decisions !== undefined) fields.decisions = changeDecisions(row, body.decisions);

  if (!Object.keys(fields).length && situation === undefined) throw new HttpError(400, 'Nothing to change.');
  if (Object.keys(fields).length) await updateContract(`id=eq.${id}&device_id=eq.${deviceId}`, fields);
  return Response.json({
    ok: true,
    ...(situation === undefined ? {} : { situation }),
    ...(fields.decisions ? { decisions: fields.decisions } : {}),
  });
}

// `decisions` = { risks: { "<warning index>": "ask"|"ok"|"wrong" }, message, message_plain: { lang, text },
// plain_outdated, draft_for: [warning indexes the draft was made for], choice, updated_at }
function changeDecisions(row, change) {
  if (!change || typeof change !== 'object') throw new HttpError(400, 'Nothing to change.');
  const saved = row.decisions || {};
  const next = {
    risks: { ...(saved.risks || {}) },
    message: saved.message || '',
    message_plain: saved.message_plain || null,
    plain_outdated: Boolean(saved.plain_outdated),
    draft_for: saved.draft_for || [],
    choice: saved.choice || null,
  };
  if (change.mark !== undefined) {
    const index = Number(change.mark?.index);
    if (!Number.isInteger(index) || index < 0 || index >= (row.risks?.items?.length || 0)) {
      throw new HttpError(400, 'That warning could not be found.');
    }
    const value = change.mark?.value ?? null;
    if (value !== null && !MARKS.includes(value)) throw new HttpError(400, 'Please choose a valid mark.');
    if (value === null) delete next.risks[index];
    else next.risks[index] = value;
  }
  if (change.message !== undefined) {
    // The user's own edits: NRIC/FIN and bank numbers are still hidden before saving.
    const message = hidePersonalNumbers(String(change.message ?? '').slice(0, MAX_MESSAGE_CHARS)).text;
    if (message !== next.message) {
      next.message = message;
      next.plain_outdated = Boolean(next.message_plain);
    }
  }
  if (change.choice !== undefined) {
    if (change.choice !== null && !CHOICES.includes(change.choice)) throw new HttpError(400, 'Please choose a valid option.');
    next.choice = change.choice;
  }
  next.updated_at = new Date().toISOString();
  return next;
}

async function remove(deviceId, id) {
  const [row] = await selectContracts(`select=file_path&id=eq.${id}&device_id=eq.${deviceId}`);
  if (!row) throw new HttpError(404, 'Contract not found. It may have already been deleted.');

  // Contracts uploaded before files stopped being stored still have one: remove it first.
  // If that fails the row stays, so the user can simply try again.
  if (row.file_path) await removeFile(row.file_path);
  await deleteContractRow(`id=eq.${id}&device_id=eq.${deviceId}`);
  return Response.json({ deleted: true });
}

function pick(body, name, allowed) {
  const value = String(body[name] || '');
  if (!allowed.includes(value)) throw new HttpError(400, `Please choose a valid ${name.replace('_', ' ')}.`);
  return value;
}
