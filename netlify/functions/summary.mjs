// /.netlify/functions/summary
//   POST ?id=...  -> { clauses, summary } for one contract, made once and then saved.
//
// "In plain words" has different rows for each contract type (see SUMMARY_ROWS). Rows the
// contract doesn't mention are saved with found: false, so the app can list them as
// "Not in this contract". Every row keeps only clause numbers that really exist.

import { contractTask, clauseLookup, TYPE_LABELS } from '../lib/contract-task.mjs';
import {
  summarySystem, SUMMARY_ROWS, OTHER_TYPE_WORDS, PLAIN_SWAPS, SHORTEN_SYSTEM, clausesForPrompt,
} from '../lib/prompts.mjs';
import { chatJsonHedged, SUMMARY_MODEL } from '../lib/nvidia.mjs';
import { cleanText } from '../lib/wording.mjs';

const MAX_WORDS = 35;

export default contractTask({ field: 'summary', run: makeSummary });

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

// Plain-words clean-up the AI can't be trusted to do every time: banned wording out, legal
// terms swapped for everyday ones, no sentences borrowed from another kind of contract, and
// no sentences that belong to another row (`offTopic`, e.g. the S$350 fee under Pay).
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

async function shorten(text, type, label, offTopic) {
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
    }, { hedgeAfterMs: 2500, timeoutMs: 4500 });
    const short = polish(plain, type, offTopic);
    return short && wordCount(short) < wordCount(text) ? short : text;
  } catch {
    return text; // a long row is better than no row
  }
}

async function makeSummary(clauses, row) {
  const type = row.contract_type;
  const rows = SUMMARY_ROWS[type];
  const contract = clausesForPrompt(clauses);
  const ask = (subset, withDates) => chatJsonHedged({
    model: SUMMARY_MODEL,
    thinking: false,
    maxTokens: 1200,
    messages: [
      { role: 'system', content: summarySystem(TYPE_LABELS[type], subset, withDates) },
      { role: 'user', content: contract },
    ],
  }, { hedgeAfterMs: 9000, timeoutMs: 23000 });

  // Two smaller calls at the same time finish sooner than one big one.
  const parts = rows
    ? await Promise.all([ask(rows.slice(0, 3), false), ask(rows.slice(3), true)])
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
      label: cleanText(r?.label, 30) || 'Key term',
      r,
    }));

  const items = [];
  const offTopicFor = new Map();
  for (const { key, label, r, offTopic } of raw) {
    const plain = r?.found === false ? '' : polish(r?.plain, type, offTopic);
    const clauseNumbers = validRefs(r?.clauses);
    if (!plain) {
      items.push({ key, label, found: false, plain_text: '', clause_numbers: [] });
    } else if (clauseNumbers.length) {
      items.push({ key, label, found: true, plain_text: plain, clause_numbers: clauseNumbers });
      offTopicFor.set(key, offTopic);
    }
    // A row with text but no real clause is left out: every row must point to the contract.
  }

  // Any row that is still too long gets one rewrite, all at the same time.
  await Promise.all(items.map(async (it) => {
    if (it.found && wordCount(it.plain_text) > MAX_WORDS) {
      it.plain_text = await shorten(it.plain_text, type, it.label, offTopicFor.get(it.key));
    }
  }));

  const datesPart = parts.find((p) => Array.isArray(p?.key_dates));
  const dates = (datesPart?.key_dates || [])
    .map((d) => ({ key: 'key_date', label: 'Key date', found: true, plain_text: polish(d?.plain, type), clause_numbers: validRefs(d?.clauses) }))
    .filter((d) => d.plain_text && d.clause_numbers.length)
    .slice(0, 3);

  return [...items, ...dates];
}
