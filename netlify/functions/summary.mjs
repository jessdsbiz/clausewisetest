// /.netlify/functions/summary
//   POST ?id=...  -> { clauses, summary } for one contract, made once and then saved.
//
// "In plain words" has different rows for each contract type (see SUMMARY_ROWS). Rows the
// contract doesn't mention are saved with found: false, so the app can list them as
// "Not in this contract". Every other row must come with exact quotes from the contract that
// contain all its numbers, dates and names (checked in verify.mjs); a row that fails is not shown.
// Its clause numbers are the clauses those quotes come from.

import { contractTask, clauseLookup, withReferencedParts, TYPE_LABELS } from '../lib/contract-task.mjs';
import {
  summarySystem, SUMMARY_ROWS, OTHER_TYPE_WORDS, PLAIN_SWAPS, SHORTEN_SYSTEM, REPAIR_SYSTEM, clausesForPrompt,
} from '../lib/prompts.mjs';
import { chatJsonHedged, SUMMARY_MODEL } from '../lib/ai.mjs';
import { cleanText } from '../lib/wording.mjs';
import { checkPoint, unsupportedFacts } from '../lib/verify.mjs';

const MAX_WORDS = 35;
const SUMMARY_CALL_MS = 20000;

export default contractTask({ field: 'summary', run: makeSummary });

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

// Plain-words clean-up the AI can't be trusted to do every time: banned wording out, legal
// terms swapped for everyday ones, no sentences borrowed from another kind of contract, and
// no sentences that belong to another row (`offTopic`, e.g. a joining fee under Pay).
function polish(text, type, offTopic) {
  let s = cleanText(text, 600);
  for (const [pattern, plain] of PLAIN_SWAPS) s = s.replace(pattern, plain);
  const sentences = s.split(/(?<=[.!?])\s+/);
  const foreign = OTHER_TYPE_WORDS[type];
  let kept = sentences.filter((sentence) => !(foreign && foreign.test(sentence)));
  // If the off-topic rule would empty the row, keep it rather than wrongly saying "not in this contract".
  const onTopic = offTopic ? kept.filter((sentence) => !offTopic.test(sentence)) : kept;
  if (onTopic.length) kept = onTopic;
  return kept.join(' ').trim();
}

async function shorten(text, type, label, offTopic, timeLeft) {
  if (timeLeft() < 4000) return text; // no time left: a long row is better than no row
  try {
    // Usually ~1s; capped short so a slow moment can't push the summary past the time limit.
    const { plain } = await chatJsonHedged({
      model: SUMMARY_MODEL,
      thinking: false,
      maxTokens: 200,
      messages: [
        { role: 'system', content: SHORTEN_SYSTEM },
        { role: 'user', content: `Topic: ${label}\nCurrent length: ${wordCount(text)} words (too long)\nText: ${text}` },
      ],
    }, { hedgeAfterMs: 2500, timeoutMs: Math.min(4500, timeLeft() - 1500) });
    const short = polish(plain, type, offTopic);
    return short && wordCount(short) < wordCount(text) ? short : text;
  } catch {
    return text; // a long row is better than no row
  }
}

async function makeSummary(clauses, row, timeLeft, { demo } = {}) {
  const type = row.contract_type;
  const rows = SUMMARY_ROWS[type];
  const contract = clausesForPrompt(clauses);
  // Haiku sometimes takes 13-15s here, so these calls get up to 20s; that still leaves 6s of the
  // budget for rewrites and saving.
  const ask = (subset, withDates) => chatJsonHedged({
    model: SUMMARY_MODEL,
    thinking: false,
    maxTokens: 3500, // quotes make replies long; 1800 cut long contracts off mid-JSON
    messages: [
      { role: 'system', content: summarySystem(TYPE_LABELS[type], subset, withDates) },
      { role: 'user', content: contract },
    ],
  }, { hedgeAfterMs: 6000, timeoutMs: Math.min(SUMMARY_CALL_MS, timeLeft() - 6000) });

  // Three small calls at the same time (two rows each, key dates with the last) finish sooner than
  // two bigger ones.
  const groups = rows ? [rows.slice(0, 2), rows.slice(2, 4), rows.slice(4)].filter((g) => g.length) : [];
  const parts = rows
    ? await Promise.all(groups.map((g, i) => ask(g, i === groups.length - 1)))
    : [await ask(null, true)];

  const lookup = clauseLookup(clauses);
  const validRefs = (refs) => [...new Set((Array.isArray(refs) ? refs : []).flat().map(lookup).filter(Boolean))];

  // Fixed rows for the four main types; AI-chosen rows for Business / Other.
  const raw = rows
    ? rows.map(([key, label, , offTopic]) => {
      const r = parts.find((p) => p?.rows?.[key])?.rows[key] || { found: false };
      return { key, label, r, offTopic };
    })
    : (Array.isArray(parts[0]?.rows) ? parts[0].rows : []).slice(0, 6).map((r, i) => ({
      key: `term_${i + 1}`,
      // Labels should be 1-3 words; a long one is cut at a word, never mid-word.
      label: cleanText(r?.label, 60).replace(/^(.{1,32})\s.*$/, '$1').replace(/[\s,;:–-]+$/, '') || 'Key term',
      r,
    }));

  const datesPart = parts.find((p) => Array.isArray(p?.key_dates));
  const dates = (datesPart?.key_dates || []).slice(0, 3).map((r) => ({ key: 'key_date', label: 'Key date', r }));

  // Every point must pass the quote check. A point that fails gets one rewrite (all at the same
  // time), told what was wrong; if that fails too, the point is not shown.
  const items = await Promise.all([...raw, ...dates].map(async ({ key, label, r, offTopic }) => {
    const plain = r?.found === false ? '' : polish(r?.plain, type, offTopic);
    if (!plain) return key === 'key_date' ? null : { key, label, found: false, plain_text: '', clause_numbers: [] };

    const cited = validRefs(r?.clauses);
    let check = checkPoint(clauses, { texts: [plain], quotes: r?.quotes, cited });
    let text = plain;
    if (!check.ok) {
      const fixed = await repair(clauses, label, plain, cited, check.why, timeLeft);
      text = fixed ? polish(fixed.plain, type, offTopic) : '';
      const recheck = text && checkPoint(clauses, { texts: [text], quotes: fixed.quotes, cited: validRefs(fixed.clauses) });
      console.log(`Summary point (${label}) failed the check: ${check.why}. Rewrite ${recheck?.ok ? 'passed' : `failed${recheck ? `: ${recheck.why}` : ''}`}.`);
      if (!recheck?.ok) return null;
      check = recheck;
    }

    // A row that is still too long gets one shorter rewrite. It is checked against the same
    // quotes, so the rewrite can't slip in a new fact.
    if (wordCount(text) > MAX_WORDS) {
      const short = await shorten(text, type, label, offTopic, timeLeft);
      if (!unsupportedFacts(short, check.quotes).length) text = short;
    }
    return { key, label, found: true, plain_text: text, clause_numbers: check.clause_numbers };
  }));

  const summary = items.filter(Boolean);
  return demo ? plantDemoMistake(summary) : summary;
}

// Demo mode for judges (PRD FR10, only with ?demo=fail): the 30-day notice period is changed to
// 3 days on purpose, so the second check can be seen catching it. Marked so the app labels it.
function plantDemoMistake(summary) {
  const row = summary.find((s) => s.key === 'notice' && /\b30\b|thirty/i.test(s.plain_text))
    || summary.find((s) => /\b30 days\b|thirty \(30\) days/i.test(s.plain_text || ''));
  if (row) {
    row.plain_text = row.plain_text.replace(/thirty \(30\)/i, 'three (3)').replace(/\b30\b/, '3');
    row.demo_mistake = true;
  }
  return summary;
}

// Second try for a point that failed the quote check: the AI sees what was wrong and the parts
// of the contract it cited (plus any schedule they mention), and must quote every fact or drop it.
async function repair(clauses, label, plain, cited, why, timeLeft) {
  if (timeLeft() < 6000) return null;
  const parts = cited.length ? withReferencedParts(clauses, clauses.filter((c) => cited.includes(c.number))) : clauses;
  try {
    return await chatJsonHedged({
      model: SUMMARY_MODEL,
      thinking: false,
      maxTokens: 1000,
      messages: [
        { role: 'system', content: REPAIR_SYSTEM },
        { role: 'user', content: `Topic: ${label}\nPoint: ${plain}\nProblem: ${why}. For each of those items, add a quote that contains it or leave it out.\n\nTHE CONTRACT PARTS:\n${clausesForPrompt(parts).slice(0, 20000)}` },
      ],
    }, { hedgeAfterMs: 5000, timeoutMs: Math.min(8000, timeLeft() - 2000) });
  } catch {
    return null;
  }
}
