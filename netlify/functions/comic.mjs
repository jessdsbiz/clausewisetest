// /.netlify/functions/comic
//   POST ?id=...&clause=4.4  -> { comic } for one clause, made once and then saved in `comics`.
//   comic = { clause_number, title, assumptions: [..], panels: [{ background, expression, holding,
//             character, character_mood, speech: { who, text } | null, caption, key }] x4 }
//
// The AI only writes the storyboard: for each panel it picks the parts (background, Mei's
// expression and what she holds, any supporting character) plus a speech bubble and a caption.
// The app builds the panel from those parts with Mei (mei.js) and the comic kit. No AI images.
// The clause's original text always comes from our own copy of the contract, never from the AI.

import { HttpError, errorResponse, requireDevice, contractIdParam } from '../lib/http.mjs';
import { selectContracts, updateContract } from '../lib/supabase.mjs';
import { splitClauses } from '../lib/clauses.mjs';
import { chatJsonHedged, COMIC_MODEL, MAX_CALL_MS } from '../lib/ai.mjs';
import { COMIC_SYSTEM, COMIC_PARTS } from '../lib/prompts.mjs';
import { clauseLookup, TYPE_LABELS } from '../lib/contract-task.mjs';
import { cleanText } from '../lib/wording.mjs';

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const deviceId = requireDevice(req);
    const id = contractIdParam(req);
    if (!id) throw new HttpError(400, 'Missing contract ID.');

    const query = `id=eq.${id}&device_id=eq.${deviceId}`;
    const [row] = await selectContracts(`select=contract_type,raw_text,clauses,comics&${query}`);
    if (!row) throw new HttpError(404, 'Contract not found. It may have been deleted.');

    const clauses = row.clauses?.length ? row.clauses : splitClauses(row.raw_text);
    const number = clauseLookup(clauses)(new URL(req.url).searchParams.get('clause') || '');
    if (!number) throw new HttpError(400, 'Please choose a clause from this contract.');

    const comics = Array.isArray(row.comics) ? row.comics : [];
    const saved = comics.find((c) => c.clause_number === number);
    if (saved) return Response.json({ comic: saved });

    const clause = clauses.find((c) => c.number === number);
    // Clauses this one refers to ("the fee in Clause 5.3") give the AI the context it needs.
    const related = [...new Set([...clause.text.matchAll(/\bClause\s+(\d+(?:\.\d+)?)/gi)].map((m) => m[1]))]
      .filter((n) => n !== number)
      .map((n) => clauses.find((c) => c.number === n))
      .filter(Boolean);

    const ai = await chatJsonHedged({
      model: COMIC_MODEL,
      thinking: false,
      maxTokens: 1500,
      messages: [
        { role: 'system', content: COMIC_SYSTEM },
        {
          role: 'user',
          content: [
            `Contract type: ${TYPE_LABELS[row.contract_type]}`,
            `Clause to draw: [${clause.number}]${clause.heading && clause.heading !== clause.number ? ` (${clause.heading})` : ''} ${clause.text}`,
            ...related.map((r) => `For context only, it refers to: [${r.number}] ${r.text}`),
          ].join('\n\n'),
        },
      ],
    }, { hedgeAfterMs: 9000, timeoutMs: MAX_CALL_MS });

    const comic = buildComic(ai, clause);
    await updateContract(query, { clauses, comics: [...comics, comic] });
    return Response.json({ comic });
  } catch (err) {
    return errorResponse(err);
  }
};

const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// Speech bubbles stay under 8 words. A longer one is dropped rather than cut off mid-sentence,
// so it can't end up saying something the clause doesn't.
function speechOf(s, hasCharacter) {
  const text = cleanText(String(s?.text ?? ''), 80).replace(/^["'“]|["'”]$/g, '');
  if (!text || text.split(/\s+/).length > 7) return null;
  return { who: s?.who === 'character' && hasCharacter ? 'character' : 'mei', text };
}

function buildPanel(p) {
  const character = oneOf(p?.character, Object.keys(COMIC_PARTS.characters), 'none');
  return {
    background: oneOf(p?.background, Object.keys(COMIC_PARTS.backgrounds), 'home_desk'),
    expression: oneOf(p?.expression, COMIC_PARTS.expressions, 'thinking'),
    holding: oneOf(p?.holding, COMIC_PARTS.holding, 'none'),
    character,
    character_mood: character === 'none' ? null : oneOf(p?.character_mood, COMIC_PARTS.moods, 'neutral'),
    speech: p?.speech ? speechOf(p.speech, character !== 'none') : null,
    caption: cleanText(String(p?.caption ?? '').replace(/^key:\s*/i, ''), 120),
    key: p?.key === true,
  };
}

function buildComic(ai, clause) {
  const panels = (Array.isArray(ai?.panels) ? ai.panels : []).slice(0, 4).map(buildPanel);
  if (panels.length < 4 || panels.some((p) => !p.caption)) {
    throw new HttpError(502, 'The comic did not come out right. Please try again.');
  }
  // Exactly one key panel; default to panel 3 (where the rule usually lands).
  const marked = panels.findIndex((p) => p.key);
  const keyIndex = marked >= 0 ? marked : 2;
  panels.forEach((p, i) => { p.key = i === keyIndex; });

  const assumptions = (Array.isArray(ai?.assumptions) ? ai.assumptions : [])
    .map((a) => cleanText(a, 140))
    .filter(Boolean)
    .map((a) => (/^assumed:/i.test(a) ? a : `Assumed: ${a}`))
    .slice(0, 3);

  return {
    clause_number: clause.number,
    title: cleanText(ai?.title, 40) || clause.heading || 'This clause',
    assumptions,
    panels,
    created_at: new Date().toISOString(),
  };
}
