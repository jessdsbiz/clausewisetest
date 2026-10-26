// /.netlify/functions/translate
//   POST ?id=...&lang=zh&part=summary|risks|comic:<clause>  -> { lang, part, result }
// Translates one part of the AI's explanations, once, and saves it in `translations[lang][part]`.
// Original clause text is never translated: the app always shows the contract's own words.

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { chat, TRANSLATE_MODEL } from '../lib/nvidia.mjs';
import { translateSystem } from '../lib/prompts.mjs';
import { inScript } from '../lib/scripts.mjs';

const LANGS = ['zh', 'ms', 'ta'];

// Strings go to the AI in small batches at the same time: one big Tamil request took ~20s,
// and a retry pushed it past the 30s function limit.
const BATCH = 6;

// The English strings for one part, in a fixed order, plus how to rebuild the result from them.
function partStrings(row, part) {
  if (part === 'summary') {
    const items = row.summary || [];
    return {
      strings: items.flatMap((s) => [s.label, s.plain_text || '']),
      build: (t) => items.map((s, i) => ({ label: t[i * 2], plain_text: t[i * 2 + 1] })),
    };
  }
  if (part === 'risks') {
    const items = row.risks?.items || [];
    return {
      strings: items.flatMap((r) => [r.title, r.explanation || '']),
      build: (t) => items.map((r, i) => ({ title: t[i * 2], explanation: t[i * 2 + 1] })),
    };
  }
  const number = part.slice('comic:'.length);
  const comic = (row.comics || []).find((c) => c.clause_number === number);
  if (!comic) throw new HttpError(404, 'Open the comic first, then translate it.');
  const a = comic.assumptions.length;
  const n = comic.panels.length;
  return {
    strings: [comic.title, ...comic.assumptions, ...comic.panels.map((p) => p.caption), ...comic.panels.map((p) => p.speech?.text || '')],
    build: (t) => ({
      title: t[0],
      assumptions: t.slice(1, 1 + a),
      captions: t.slice(1 + a, 1 + a + n),
      speeches: t.slice(1 + a + n, 1 + a + 2 * n), // '' where a panel has no bubble
    }),
  };
}

// Translates one batch. Returns one string per input, or null where the AI's version
// was missing or in the wrong script (after one retry of just the failed ones).
async function translateBatch(batch, lang) {
  const result = batch.map(() => null);
  for (let attempt = 0; attempt < 2; attempt++) {
    const missing = batch.map((s, i) => [s, i]).filter(([, i]) => result[i] === null);
    if (!missing.length) break;
    try {
      const text = await chat({
        model: TRANSLATE_MODEL,
        thinking: false,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: translateSystem(lang) },
          { role: 'user', content: JSON.stringify(missing.map(([s]) => s)) },
        ],
      });
      const t = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).t;
      if (!Array.isArray(t) || t.length !== missing.length) continue;
      missing.forEach(([, i], k) => {
        const s = typeof t[k] === 'string' ? t[k].replace(/\*\*/g, '').trim() : '';
        if (s && inScript(lang, s)) result[i] = s;
      });
    } catch (err) {
      console.error(`Translation batch to ${lang} failed (attempt ${attempt + 1}):`, err.message);
    }
  }
  return result;
}

async function translate(strings, lang) {
  // Only non-empty strings go to the AI; empty ones stay empty.
  const todo = strings.map((s, i) => [s, i]).filter(([s]) => s && s.trim());
  const batches = [];
  for (let k = 0; k < todo.length; k += BATCH) batches.push(todo.slice(k, k + BATCH));
  const results = await Promise.all(batches.map((b) => translateBatch(b.map(([s]) => s), lang)));

  const out = strings.map(() => '');
  let failed = 0;
  batches.forEach((b, bi) => b.forEach(([s, i], k) => {
    // A string that would not translate cleanly stays in English rather than failing the page.
    out[i] = results[bi][k] ?? s;
    if (results[bi][k] === null) failed++;
  }));
  if (failed) console.error(`Translation to ${lang}: ${failed} of ${todo.length} strings kept in English`);
  if (todo.length && failed === todo.length) {
    throw new HttpError(502, 'The translation did not come out right. Please try again.');
  }
  return out;
}

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');

    const params = new URL(req.url).searchParams;
    const lang = params.get('lang');
    const part = params.get('part') || '';
    if (!LANGS.includes(lang)) throw new HttpError(400, 'Please choose Chinese, Malay or Tamil.');
    if (!/^(summary|risks|comic:.{1,40})$/.test(part)) throw new HttpError(400, 'Nothing to translate.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=summary,risks,comics,translations&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');

    const translations = row.translations || {};
    const saved = translations[lang]?.[part];
    if (saved) return Response.json({ lang, part, result: saved });

    if (part === 'summary' && !row.summary) throw new HttpError(409, 'The summary is not ready yet.');
    if (part === 'risks' && !row.risks) throw new HttpError(409, 'The risk check is not ready yet.');

    const { strings, build } = partStrings(row, part);
    const result = build(await translate(strings, lang));

    // Re-read before saving so two parts translated close together don't overwrite each other.
    const [latest] = await selectContracts(`select=translations&${query}`);
    const merged = latest?.translations || {};
    merged[lang] = { ...(merged[lang] || {}), [part]: result };
    await updateContract(query, { translations: merged });
    return Response.json({ lang, part, result });
  } catch (err) {
    return errorResponse(err);
  }
};
