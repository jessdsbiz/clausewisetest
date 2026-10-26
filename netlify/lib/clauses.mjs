// Splits contract text into numbered clauses with plain rules (no AI), so every
// clause keeps the contract's exact wording and its own number (e.g. "4.4").
//
// Returns [{ number, heading, text }]:
//   - "4.4"        a numbered clause, heading = its section title ("Probation")
//   - "13"         a section with no sub-clauses
//   - "Intro"      text before the first clause (letterhead, greeting)
//   - "Acceptance" an unnumbered section after the last clause
//   - "Para 1"...  paragraphs, for documents with no numbered clauses (letters, notices)

const SUB_CLAUSE = /^(\d{1,2}(?:\.\d{1,2}){1,2})\.?\s+(\S.*)$/; // "4.4 During the…"
const SECTION = /^(\d{1,2})\.\s+([A-Z][^.:;]{2,80})$/; // "4. Probation"
const PAGE_LINE = /^(page\s*)?\d+\s*(of|\/)\s*\d+$/i; // "Page 3 of 9"
// A line ending like this means the next line continues the sentence ("…in Clause" / "5.3.").
const CONTINUES = /\b(clauses?|sections?|paragraphs?|in|of|and|to|under|per|with)$/i;
// Short title-like line after the numbered clauses, e.g. "Acceptance", "Employee's Acceptance".
const LOOSE_HEADING = /^[A-Z][A-Za-z’'&\- ]{2,40}$/;

// `keepBlank` keeps empty lines (as '') so paragraph breaks can be seen.
function cleanLines(text, keepBlank = false) {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());

  // Running headers/footers repeat on every page: drop short lines seen 3+ times.
  const counts = new Map();
  for (const l of lines) if (l && l.length < 120) counts.set(l, (counts.get(l) || 0) + 1);

  return lines.filter((l) => (keepBlank && !l) || (l && !PAGE_LINE.test(l) && !(counts.get(l) >= 3)));
}

// "5.10" > "5.9": compare clause numbers part by part.
function after(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

function joinLines(lines) {
  // Re-join wrapped lines; keep a line break before list-like lines.
  return lines.reduce((acc, l) => {
    if (!acc) return l;
    if (/^(\(?[a-z0-9]\)|[-•*]|[A-Z][a-z]+ ?[a-z]*:)/.test(l)) return `${acc}\n${l}`;
    return /-$/.test(acc) ? acc + l : `${acc} ${l}`;
  }, '').trim();
}

export function splitClauses(rawText) {
  const lines = cleanLines(rawText || '');
  const clauses = [];
  let current = null;
  let sectionTitle = '';
  let lastNumber = '0';
  let numberedSeen = false;

  const start = (number, heading, firstLine) => {
    current = { number, heading, lines: firstLine ? [firstLine] : [] };
    clauses.push(current);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1] || '';
    const continuing = CONTINUES.test(prev);

    const sub = !continuing && line.match(SUB_CLAUSE);
    if (sub && after(sub[1], lastNumber)) {
      start(sub[1], sectionTitle, sub[2]);
      lastNumber = sub[1];
      numberedSeen = true;
      continue;
    }

    const section = !continuing && line.match(SECTION);
    if (section && after(section[1], lastNumber.split('.')[0])) {
      sectionTitle = section[2].trim();
      // Holds the section's own text if it has no sub-clauses; dropped later if empty.
      start(section[1], sectionTitle, '');
      lastNumber = section[1];
      numberedSeen = true;
      continue;
    }

    if (numberedSeen && LOOSE_HEADING.test(line) && current && current.lines.length > 0 && lines[i + 1]) {
      // Only after the numbered part, and only if it isn't the middle of a sentence.
      if (/[.;:)]$/.test(prev) || prev.length < 60) {
        sectionTitle = '';
        start(line, line, '');
        continue;
      }
    }

    if (!current) start('Intro', 'Introduction', '');
    current.lines.push(line);
  }

  let result = clauses
    .map((c) => ({ number: c.number, heading: c.heading, text: joinLines(c.lines) }))
    .filter((c) => c.text);

  // No numbered clauses (a letter or notice): split by paragraph so every summary point,
  // warning and answer can still point to a place in the document.
  if (result.filter((c) => /^\d/.test(c.number)).length < 3) {
    result = paragraphs(rawText);
  }
  return result;
}

const MIN_PARA = 30; // shorter pieces ("Dear Sir,") join the next paragraph
const MAX_PARA = 900; // longer ones are split at sentence ends

export function paragraphs(rawText) {
  const lines = cleanLines(rawText || '', true);

  // 1. Blank lines between paragraphs (photos are read this way).
  let blocks = [];
  let buf = [];
  for (const l of lines) {
    if (!l) {
      if (buf.length) blocks.push(buf);
      buf = [];
    } else {
      buf.push(l);
    }
  }
  if (buf.length) blocks.push(buf);

  // 2. No blank lines (common in PDFs): a paragraph ends on a short line that finishes a
  //    sentence, or before a "Dear …" / "Yours …" line.
  if (blocks.length < 3) {
    const all = blocks.flat();
    const widths = all.map((l) => l.length).sort((a, b) => a - b);
    const typical = widths[Math.floor(widths.length * 0.75)] || 80;
    blocks = [];
    buf = [];
    all.forEach((l, i) => {
      buf.push(l);
      const next = all[i + 1] || '';
      const shortEnd = /[.:!?)]$/.test(l) && l.length < typical * 0.8;
      if (shortEnd || /^(Dear|Yours|Thank you|Regards|Best regards)\b/i.test(next)) {
        blocks.push(buf);
        buf = [];
      }
    });
    if (buf.length) blocks.push(buf);
  }

  // 3. Join each paragraph's lines, merge tiny pieces into the next, split very long ones.
  const paras = blocks.map(joinLines).filter(Boolean);
  const merged = [];
  for (let i = 0; i < paras.length; i++) {
    if (paras[i].length < MIN_PARA && i < paras.length - 1) {
      paras[i + 1] = `${paras[i]}\n${paras[i + 1]}`;
    } else {
      merged.push(paras[i]);
    }
  }
  return merged
    .flatMap((p) => (p.length > MAX_PARA ? splitLong(p) : [p]))
    .map((text, i) => ({ number: `Para ${i + 1}`, heading: '', text }));
}

function splitLong(text) {
  const chunks = [];
  let chunk = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (chunk && (chunk + ' ' + sentence).length > MAX_PARA * 0.66) {
      chunks.push(chunk);
      chunk = sentence;
    } else {
      chunk = chunk ? `${chunk} ${sentence}` : sentence;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
