// Comic kit: flat pastel backgrounds and supporting characters drawn in the same style as Mei
// (round head, big eyes with a highlight, flat colours, no outlines), plus composePanel() to build
// a comic panel from those parts. Mei herself comes from mei.js (window.renderMei) and is never
// redrawn here.
//
// Panels are 320 x 240. Characters share Mei's 200 x 260 canvas so they line up with her.

const W = 320;
const H = 240;
const INK = '#2B2140';

// ---------- Backgrounds ----------

const window_ = (x, y, w, h, inside) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#FFFFFF"/>
  <rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="3" fill="#DCEBFF"/>
  ${inside}
  <rect x="${x + w / 2 - 2}" y="${y + 5}" width="4" height="${h - 10}" fill="#FFFFFF"/>`;

const plant = (x, y) => `
  <path d="M${x} ${y} l-10 -26 l12 14 l0 -30 l8 30 l12 -16 l-8 28 z" fill="#7CC9A0"/>
  <path d="M${x - 10} ${y} h32 l-4 22 h-24 z" fill="#E9A07A"/>`;

export const BACKGROUNDS = {
  // Office: lavender wall, city window, wall clock, desk at the back, plant
  office: () => `
    <rect width="${W}" height="${H}" fill="#EEE8FB"/>
    <rect y="186" width="${W}" height="54" fill="#DCD3F3"/>
    ${window_(186, 26, 112, 86, `
      <rect x="200" y="62" width="18" height="45" fill="#C5D4F0"/><rect x="222" y="48" width="22" height="59" fill="#B9CAEA"/>
      <rect x="248" y="70" width="16" height="37" fill="#C5D4F0"/><rect x="268" y="56" width="22" height="51" fill="#B9CAEA"/>`)}
    <circle cx="44" cy="46" r="18" fill="#FFFFFF"/><circle cx="44" cy="46" r="14" fill="#F6F2FF"/>
    <path d="M44 46 V36 M44 46 L51 50" stroke="#5B2BC4" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="176" y="150" width="134" height="10" rx="3" fill="#C9BCEB"/><rect x="186" y="160" width="8" height="30" fill="#C9BCEB"/><rect x="292" y="160" width="8" height="30" fill="#C9BCEB"/>
    <rect x="236" y="124" width="40" height="26" rx="3" fill="#5B2BC4"/><rect x="240" y="128" width="32" height="18" rx="2" fill="#E6DCFF"/>
    ${plant(24, 186)}`,

  // HDB room: peach wall, window onto an HDB block, ceiling fan, door, floor tiles
  hdb_room: () => `
    <rect width="${W}" height="${H}" fill="#FCEFE3"/>
    <rect y="186" width="${W}" height="54" fill="#F3DCC6"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${i * 44} 186 V240" stroke="#EBCDB2" stroke-width="2"/>`).join('')}
    <path d="M0 212 H${W}" stroke="#EBCDB2" stroke-width="2"/>
    ${window_(196, 34, 104, 84, `
      <rect x="208" y="48" width="80" height="66" fill="#F7CDAE"/>
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${214 + c * 19}" y="${54 + r * 15}" width="11" height="8" rx="1.5" fill="#FFFFFF" opacity="0.85"/>`).join('')).join('')}`)}
    <rect x="22" y="70" width="58" height="116" rx="4" fill="#E9C7A4"/><circle cx="70" cy="132" r="3.5" fill="#B98A62"/>
    <path d="M160 0 V14" stroke="#C9A889" stroke-width="3"/>
    <ellipse cx="160" cy="18" rx="44" ry="5" fill="#E2BE9C"/><circle cx="160" cy="18" r="7" fill="#C9A889"/>`,

  // Phone shop: mint wall, display shelves of phones, "NEW PLANS" banner
  phone_shop: () => `
    <rect width="${W}" height="${H}" fill="#E3F5EF"/>
    <rect y="186" width="${W}" height="54" fill="#CDEBE1"/>
    <path d="M18 18 h120 l-10 14 l10 14 h-120 z" fill="#F7C948"/>
    <text x="70" y="38" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800" fill="${INK}">NEW PLANS</text>
    ${[66, 116].map((y) => `
      <rect x="176" y="${y + 34}" width="132" height="6" rx="2" fill="#A9D9C8"/>
      ${[0, 1, 2, 3].map((i) => `
        <rect x="${184 + i * 31}" y="${y}" width="20" height="34" rx="4" fill="${INK}"/>
        <rect x="${187 + i * 31}" y="${y + 4}" width="14" height="24" rx="2" fill="${['#E6DCFF', '#FFE3CC', '#CDEBE1', '#DCEBFF'][i]}"/>`).join('')}`).join('')}
    <rect x="186" y="156" width="26" height="12" rx="3" fill="#FFFFFF"/><text x="199" y="165" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="700" fill="#E0565B">$0</text>
    ${plant(30, 186)}`,

  // Bank counter: pale blue wall, teller windows with glass, queue number board
  bank_counter: () => `
    <rect width="${W}" height="${H}" fill="#EAF0FB"/>
    <rect y="186" width="${W}" height="54" fill="#D6E1F5"/>
    <rect x="22" y="22" width="76" height="34" rx="6" fill="${INK}"/>
    <text x="60" y="45" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="800" fill="#F7C948">A023</text>
    <rect x="150" y="60" width="160" height="96" rx="4" fill="#FFFFFF"/>
    ${[0, 1, 2].map((i) => `
      <rect x="${158 + i * 51}" y="68" width="44" height="58" rx="3" fill="#DCEBFF" opacity="0.8"/>
      <circle cx="${180 + i * 51}" cy="80" r="7" fill="#C9D6EE"/>
      <text x="${180 + i * 51}" y="84" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="800" fill="#5B6B8C">${i + 1}</text>`).join('')}
    <rect x="144" y="136" width="172" height="20" rx="4" fill="#B9C9E6"/>
    <rect x="144" y="156" width="172" height="34" fill="#C9D6EE"/>
    ${plant(30, 186)}`,

  // Home desk: soft lilac wall, sunny window, bookshelf, desk with laptop and lamp
  home_desk: () => `
    <rect width="${W}" height="${H}" fill="#F5F0FB"/>
    <rect y="186" width="${W}" height="54" fill="#E7DDF5"/>
    ${window_(28, 28, 92, 76, `<circle cx="96" cy="50" r="10" fill="#F7C948"/><path d="M40 92 q16 -14 32 0 q14 -10 30 0 v4 h-62 z" fill="#FFFFFF"/>`)}
    <rect x="214" y="22" width="92" height="8" rx="2" fill="#D9C9EF"/>
    ${['#8B6CF0', '#F7C948', '#7CC9A0', '#F29BB0', '#5B2BC4', '#E9A07A'].map((col, i) => `<rect x="${218 + i * 14}" y="${i % 2 ? 2 : 0}" width="11" height="${20 - (i % 2 ? 2 : 0)}" rx="2" fill="${col}" transform="translate(0 2)"/>`).join('')}
    <rect x="186" y="148" width="124" height="10" rx="3" fill="#D9C9EF"/><rect x="196" y="158" width="8" height="32" fill="#D9C9EF"/><rect x="292" y="158" width="8" height="32" fill="#D9C9EF"/>
    <path d="M226 148 l8 -30 h44 l8 30 z" fill="#B9A6EE"/><rect x="238" y="122" width="36" height="22" rx="2" fill="#E6DCFF"/>
    <path d="M200 148 v-34" stroke="#8B6CF0" stroke-width="3"/><path d="M188 116 h24 l-6 -14 h-12 z" fill="#F7C948"/>`,
};

// ---------- Supporting characters (same style as Mei) ----------

// Big eyes with a highlight, brows, cheeks and mouth, matching Mei's face.
function face(mood, browColour = INK) {
  const brows = {
    smile: ['M70 92 Q78 88 86 92', 'M114 92 Q122 88 130 92'],
    neutral: ['M70 92 L86 92', 'M114 92 L130 92'],
    stern: ['M70 88 L86 94', 'M114 94 L130 88'],
  }[mood] || ['M70 92 L86 92', 'M114 92 L130 92'];
  const mouth = {
    smile: '<path d="M88 130 Q100 142 112 130" stroke="#2B2140" stroke-width="3" fill="none" stroke-linecap="round"/>',
    neutral: '<path d="M91 134 L109 134" stroke="#2B2140" stroke-width="3" fill="none" stroke-linecap="round"/>',
    stern: '<path d="M90 137 Q100 130 110 137" stroke="#2B2140" stroke-width="3" fill="none" stroke-linecap="round"/>',
  }[mood] || '';
  return `
    <ellipse cx="78" cy="110" rx="7.5" ry="9.5" fill="${INK}"/><ellipse cx="122" cy="110" rx="7.5" ry="9.5" fill="${INK}"/>
    <circle cx="80.5" cy="106" r="2.8" fill="#FFFFFF"/><circle cx="124.5" cy="106" r="2.8" fill="#FFFFFF"/>
    <path d="${brows[0]}" stroke="${browColour}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="${brows[1]}" stroke="${browColour}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="65" cy="126" rx="9" ry="5" fill="#F29BB0" opacity="0.45"/><ellipse cx="135" cy="126" rx="9" ry="5" fill="#F29BB0" opacity="0.45"/>
    ${mouth}`;
}

const arms = (colour, skin) => `
  <path d="M70 194 C56 204 52 222 56 238" stroke="${colour}" stroke-width="15" stroke-linecap="round" fill="none"/>
  <path d="M130 194 C144 204 148 222 144 238" stroke="${colour}" stroke-width="15" stroke-linecap="round" fill="none"/>
  <circle cx="56" cy="240" r="8" fill="${skin}"/><circle cx="144" cy="240" r="8" fill="${skin}"/>`;

export const CHARACTERS = {
  // The boss: grey side-parted hair, glasses, moustache, navy suit and red tie
  boss: (mood = 'neutral') => {
    const skin = '#E6B993';
    return `
      <path d="M54 260 C54 200 74 176 100 176 C126 176 146 200 146 260 Z" fill="#33406A"/>
      <path d="M86 178 L100 214 L114 178 Z" fill="#FFFFFF"/>
      <path d="M96 184 L104 184 L106 212 L100 222 L94 212 Z" fill="#E0565B"/>
      <path d="M84 178 L100 216 L88 232 Z" fill="#26315A"/><path d="M116 178 L100 216 L112 232 Z" fill="#26315A"/>
      <rect x="91" y="148" width="18" height="34" rx="6" fill="${skin}"/>
      ${arms('#33406A', skin)}
      <circle cx="43" cy="106" r="9" fill="#DCAA83"/><circle cx="157" cy="106" r="9" fill="#DCAA83"/>
      <ellipse cx="100" cy="100" rx="57" ry="54" fill="${skin}"/>
      <path d="M44 98 C40 54 70 36 100 36 C132 36 160 56 156 98 C150 78 138 66 120 62 C104 60 90 62 84 72 C78 64 70 62 62 68 C52 76 46 86 44 98 Z" fill="#8E8AA0"/>
      ${face(mood, '#6E6A80')}
      <rect x="64" y="98" width="28" height="24" rx="8" fill="none" stroke="${INK}" stroke-width="3"/>
      <rect x="108" y="98" width="28" height="24" rx="8" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M92 108 H108" stroke="${INK}" stroke-width="3"/>
      <path d="M84 125 Q100 117 116 125 Q100 130 84 125 Z" fill="#8E8AA0"/>`;
  },

  // The landlord: a friendly auntie with a silver bun, teal blouse, gold earrings, holding keys
  landlord: (mood = 'smile') => {
    const skin = '#EFC4A2';
    return `
      <circle cx="100" cy="36" r="20" fill="#B9B4C8"/>
      <path d="M58 260 C58 204 76 178 100 178 C124 178 142 204 142 260 Z" fill="#3FA58A"/>
      ${[[78, 214], [118, 206], [96, 236], [124, 240], [70, 244]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#FFFFFF" opacity="0.55"/>`).join('')}
      <rect x="92" y="150" width="16" height="32" rx="6" fill="${skin}"/>
      <path d="M84 180 L100 198 L116 180 L110 177 L100 188 L90 177 Z" fill="#FFFFFF"/>
      ${arms('#3FA58A', skin)}
      <g transform="translate(150 232)">
        <circle r="7" fill="none" stroke="#F7C948" stroke-width="3"/>
        <path d="M6 4 L20 14 M14 10 L12 14 M18 13 L16 17" stroke="#F7C948" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      <circle cx="43" cy="106" r="9" fill="#E6B795"/><circle cx="157" cy="106" r="9" fill="#E6B795"/>
      <circle cx="43" cy="118" r="3.5" fill="#F7C948"/><circle cx="157" cy="118" r="3.5" fill="#F7C948"/>
      <ellipse cx="100" cy="100" rx="56" ry="54" fill="${skin}"/>
      <path d="M44 100 C40 58 66 40 100 40 C134 40 160 58 156 100 C152 88 146 82 138 80 C134 70 124 66 116 70 C108 62 92 62 84 70 C76 66 66 70 62 80 C54 82 48 88 44 100 Z" fill="#B9B4C8"/>
      ${face(mood, '#8C879C')}`;
  },

  // Phone shop staff: young, spiky dark hair, orange polo with a name badge, headset, tablet
  shop_staff: (mood = 'smile') => {
    const skin = '#D9A07A';
    return `
      <path d="M58 260 C58 204 76 178 100 178 C124 178 142 204 142 260 Z" fill="#F2883A"/>
      <path d="M86 178 L100 196 L114 178 L108 176 L100 186 L92 176 Z" fill="#FFFFFF"/>
      <rect x="112" y="204" width="22" height="11" rx="2" fill="#FFFFFF"/><rect x="115" y="208" width="14" height="3" rx="1.5" fill="#F2883A"/>
      <rect x="92" y="150" width="16" height="32" rx="6" fill="${skin}"/>
      ${arms('#F2883A', skin)}
      <rect x="30" y="206" width="30" height="40" rx="5" fill="${INK}"/><rect x="34" y="211" width="22" height="30" rx="2" fill="#FFE3CC"/>
      <circle cx="43" cy="106" r="9" fill="#CC946F"/><circle cx="157" cy="106" r="9" fill="#CC946F"/>
      <ellipse cx="100" cy="100" rx="56" ry="54" fill="${skin}"/>
      <path d="M44 92 C42 62 58 46 70 44 L74 30 L86 42 L96 26 L106 40 L120 28 L124 44 C144 48 158 64 156 92 C146 76 128 68 110 70 C94 72 74 72 60 80 C52 84 46 88 44 92 Z" fill="#3A2A22"/>
      <path d="M43 112 C46 132 62 140 80 136" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="82" cy="136" r="3.5" fill="${INK}"/>
      ${face(mood)}`;
  },
};

// Same canvas as Mei, so the characters can be placed exactly like her.
export const characterSvg = (name, mood) => `<svg viewBox="0 0 200 260" aria-hidden="true">${CHARACTERS[name](mood)}</svg>`;

// Mei's own drawing from mei.js, unchanged: just placed inside the panel.
function meiInner(mei) {
  return window.renderMei(mei).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

// ---------- Speech bubble ----------

// Bubble text is regular weight in the app's font (Noto fallbacks for Chinese and Tamil), dark on white.
// The panel is drawn small on a phone or in a narrow column, so the text stays large: 16 units is
// about 14px on screen (panels are one column below 600px, two columns above it).
const BUBBLE_FONT = "'Plus Jakarta Sans', 'Noto Sans SC', 'Noto Sans Tamil', sans-serif";
const BUBBLE_INK = '#150E30';
const BUBBLE_MAX_LINES = 3;
const BUBBLE_INNER = W - 64; // room inside the bubble, in picture units

// Rough width of one character, in font-size units (Chinese is a full square, Tamil is wide).
const charUnits = (ch, size) => size * (/[\u3000-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 1 : /[\u0B80-\u0BFF]/.test(ch) ? 0.62 : 0.56);
const textUnits = (s, size) => [...s].reduce((n, ch) => n + charUnits(ch, size), 0);

// Breaks the text into lines that fit. A word too long for one line (Chinese has no spaces) is split
// by character. Words are never dropped: a cut-off bubble could say something different from the clause.
function wrapFit(text, size, max) {
  const lines = [];
  let line = '';
  const addWord = (word) => {
    const joined = line ? `${line} ${word}` : word;
    if (textUnits(joined, size) <= max) {
      line = joined;
      return;
    }
    if (line) lines.push(line);
    line = '';
    if (textUnits(word, size) <= max) {
      line = word;
      return;
    }
    for (const ch of word) {
      if (line && textUnits(line + ch, size) > max) {
        lines.push(line);
        line = '';
      }
      line += ch;
    }
  };
  for (const word of String(text).split(/\s+/).filter(Boolean)) addWord(word);
  if (line) lines.push(line);
  return lines;
}

// The biggest size in `sizes` at which the text fits in BUBBLE_MAX_LINES lines. Sizes are in picture units:
// on a phone the 2 x 2 panels draw at about half size, so 24 units is about 12px on screen.
function layoutBubble(text, sizes) {
  for (const size of sizes) {
    const lines = wrapFit(text, size, BUBBLE_INNER);
    if (lines.length <= BUBBLE_MAX_LINES) return { size, lines };
  }
  const last = sizes[sizes.length - 1];
  return { size: last, lines: wrapFit(text, last, BUBBLE_INNER) };
}

const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bubble(text, speakerX, sizes) {
  const { size, lines } = layoutBubble(text, sizes);
  const widest = Math.max(...lines.map((l) => textUnits(l, size)));
  const width = Math.min(W - 12, widest + 28);
  const lineH = Math.round(size * 1.3);
  const height = lines.length * lineH + 14;
  const x = Math.min(Math.max(speakerX - width / 2, 6), W - width - 6);
  const tail = Math.min(Math.max(speakerX, x + 18), x + width - 18);
  return `
    <path d="M${x + 12} 8 h${width - 24} a12 12 0 0 1 12 12 v${height - 24} a12 12 0 0 1 -12 12 H${tail + 8} l-10 12 l-2 -12 H${x + 12} a12 12 0 0 1 -12 -12 v-${height - 24} a12 12 0 0 1 12 -12 z" fill="#FFFFFF" stroke="#D9CFF5" stroke-width="2"/>
    ${lines.map((l, i) => `<text x="${x + width / 2}" y="${8 + size + i * lineH}" text-anchor="middle" font-family="${BUBBLE_FONT}" font-size="${size}" font-weight="400" fill="${BUBBLE_INK}">${escapeXml(l)}</text>`).join('')}`;
}

// ---------- A whole panel ----------

const CHAR_W = 140;
const CHAR_H = 182;

// The sign beside Mei's head: a red "!" triangle (possible scam sign or high risk), an amber "?" circle
// (check this), or a green tick (good outcome). It sits to the right of her head and below the bubble,
// so it never covers her face or the bubble.
function riskSign(kind, meiX) {
  if (!kind || kind === 'none') return '';
  const cx = meiX + 122;
  const cy = 100;
  if (kind === 'high') {
    return `<g aria-hidden="true"><path d="M${cx} ${cy - 17} L${cx + 16} ${cy + 12} L${cx - 16} ${cy + 12} Z" fill="#B42318" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/><path d="M${cx} ${cy - 6} v8" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + 6}" r="1.8" fill="#FFFFFF"/></g>`;
  }
  if (kind === 'medium') {
    return `<g aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="14" fill="#B54708" stroke="#FFFFFF" stroke-width="2"/><path d="M${cx - 5} ${cy - 5} a5 5 0 1 1 7 4.6 c-1.3 .6 -2 1.4 -2 2.6 v1.3" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + 8}" r="1.5" fill="#FFFFFF"/></g>`;
  }
  if (kind === 'good') {
    return `<g aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="14" fill="#027A48" stroke="#FFFFFF" stroke-width="2"/><path d="M${cx - 7} ${cy} l5 5 l9 -10" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  return '';
}

// spec: { background, mei: { expression, outfit, holding }, other, otherMood, speech: { who: 'mei' | 'other', text }, sign }
export function composePanel({ background = 'home_desk', mei = {}, other = null, otherMood, speech = null, sign = null, dense = false }) {
  // Phone panels are drawn about half size (25 units ~ 12px); desktop panels about 3/4 size (17 units ~ 13px).
  const sizes = dense ? [17, 16] : [25, 23, 20, 16];
  const withOther = other && CHARACTERS[other];
  const meiX = withOther ? 12 : (W - CHAR_W) / 2;
  const otherX = W - CHAR_W - 12;
  const y = H - CHAR_H;
  const speakerX = speech?.who === 'other' && withOther ? otherX + CHAR_W / 2 : meiX + CHAR_W / 2;
  return `
    <svg class="comic-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      ${(BACKGROUNDS[background] || BACKGROUNDS.home_desk)()}
      ${withOther ? `<svg x="${otherX}" y="${y}" width="${CHAR_W}" height="${CHAR_H}" viewBox="0 0 200 260">${CHARACTERS[other](otherMood)}</svg>` : ''}
      <svg x="${meiX}" y="${y}" width="${CHAR_W}" height="${CHAR_H}" viewBox="0 0 200 260">${meiInner(mei)}</svg>
      ${speech?.text ? bubble(speech.text, speakerX, sizes) : ''}
      ${riskSign(sign, meiX)}
    </svg>`;
}
