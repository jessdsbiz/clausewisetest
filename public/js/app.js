// ClauseWise app shell: hash router, bottom nav, scan screen and contract tabs.

import { api } from './api.js';
import { pdfToText, preparePhoto, readPage } from './extract.js';
import { composePanel } from './comic-kit.js';
import { hidePersonalNumbers } from './privacy.js';
import { UI_TEXT, UI_PATTERNS } from './ui-text.js';
import { speak, stop as stopSpeaking, togglePause, speechSupported, isSpeaking, onSpeakingChange, onSpeechError, onLoadingChange } from './speech.js';
import { voiceSupported, listenInto, stopListening } from './voice.js';

const screen = document.getElementById('screen');
const header = document.querySelector('.app-header');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');
const langBtn = document.getElementById('lang-btn');
const speakBtn = document.getElementById('speak-btn');
const comicBtn = document.getElementById('comic-btn');
const bottomNav = document.querySelector('.bottom-nav');

const CONTRACT_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'risks', label: 'Risks' },
  { id: 'comic', label: 'Comic' },
  { id: 'ask', label: 'Ask' },
];

// Order matches the mockup's 3 x 2 grid.
const CONTRACT_TYPES = [
  { id: 'job_offer', label: 'Job offer', icon: 'briefcase' },
  { id: 'rental', label: 'Rental', icon: 'house' },
  { id: 'loan', label: 'Loan', icon: 'coin' },
  { id: 'phone_subscription', label: 'Phone / Subscription', icon: 'subscription' },
  { id: 'business', label: 'Business', icon: 'handshake' },
  { id: 'other', label: 'Other', icon: 'dots' },
  { id: 'unsure', label: 'Not sure', icon: 'help' }, // the AI chooses (see effectiveType)
];

const EXPLAIN_MODES = [
  { id: 'plain', label: 'Plain words', icon: 'lines' },
  { id: 'comic', label: 'Comic', icon: 'comicGrid' },
  { id: 'audio', label: 'Audio', icon: 'speaker' },
];

const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN', name: 'English' },
  { id: 'zh', label: '中文', short: '中文', name: 'Chinese' },
  { id: 'ms', label: 'Bahasa Melayu', short: 'BM', name: 'Malay' },
  { id: 'ta', label: 'தமிழ்', short: 'தமிழ்', name: 'Tamil' },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const labelOf = (list, id) => list.find((x) => x.id === id)?.label || id;

const icons = {
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  idcard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 10h4M14 14h3"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 18h.01"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/></svg>',
  comic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  caret: '<svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  lines: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  comicGrid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v8"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9z"/><path d="M17.5 9a4.5 4.5 0 0 1 0 6"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/></svg>',
  house: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5V20H4z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.6c-.4-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 1.9s1.2 1.6 2.8 1.9 2.8.8 2.8 1.9-1.2 1.9-2.8 1.9c-1.3 0-2.4-.5-2.8-1.4M12 6.5v11"/></svg>',
  subscription: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16M9 4v4M15 4v4"/></svg>',
  handshake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12L8 6.5l4 2 4-2 5.5 5.5-9.5 7z"/><path d="M8.5 12.5l3 3M12 8.5l-3 3"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M12 8v4M12 15.5h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  building: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M4 10h16M12 3l8 4H4zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  chevSmall: '<svg class="chev-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" fill="currentColor" stroke="none"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
  stopSquare: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/></svg>',
};

// ClauseWise logo: a "C" with a spark, as in the mockups.
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true" style="stroke:none">
  <path d="M24.6 9.4A10.8 10.8 0 1 0 24.6 22.6" fill="none" stroke="#6d28d9" stroke-width="5" stroke-linecap="round"/>
  <path d="M16 10.6l1.3 3.9 3.9 1.5-3.9 1.5L16 21.4l-1.3-3.9-3.9-1.5 3.9-1.5z" fill="#6d28d9"/>
</svg>`;

// While a contract with "Hide these too" switched on is on screen, this hides its names,
// addresses, phone numbers and emails. All contract text is shown through escapeHtml, so
// hiding it here covers the Summary, clauses, Risks, comics and chat in one place.
let redactor = null;

function escapeHtml(s) {
  const text = redactor ? redactor(String(s ?? '')) : String(s ?? '');
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "Lim Mei Ling" -> "L** M** L***", "+65 8000 0000" -> "**** 0000", "mei@mail.com" -> "m***@mail.com"
const maskName = (v) => v.split(/\s+/).map((w) => (w.includes('/') ? w : w[0] + '*'.repeat(Math.max(w.length - 1, 1)))).join(' ');
const maskPhone = (v) => `**** ${v.replace(/\D/g, '').slice(-4)}`;
const maskEmail = (v) => v.replace(/^([^@])[^@]*@/, '$1***@');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `keep`: names that stay visible, e.g. the payee in Risks so the scam check still makes sense.
function makeRedactor(c, keep = []) {
  const p = c.personal;
  if (!p?.hide_extra) return null;
  const kept = keep.filter(Boolean).map((k) => k.toLowerCase());
  const items = [
    ...p.found.names.filter((n) => !kept.some((k) => k.includes(n.toLowerCase()) || n.toLowerCase().includes(k))).map((v) => [v, maskName(v)]),
    ...p.found.addresses.map((v) => [v, '[home address hidden]']),
    ...p.found.phones.map((v) => [v, maskPhone(v)]),
    ...p.found.emails.map((v) => [v, maskEmail(v)]),
  ].sort((a, b) => b[0].length - a[0].length); // longest first: "Lim Mei Ling" before "Mei Ling"
  const rules = items.map(([v, mask]) => [new RegExp(v.split(/\s+/).map(escapeRe).join('\\s+'), 'g'), mask]);
  return (text) => rules.reduce((t, [re, mask]) => t.replace(re, mask), text);
}

// Card for features that aren't built yet (or a list that's empty).
function emptyState({ icon, tone = 'purple', title, text, pill = '', action = '' }) {
  return `
    <div class="empty-card">
      <span class="empty-icon tone-${tone}">${icon}</span>
      ${pill ? `<span class="step-pill">${pill}</span>` : ''}
      <h3>${title}</h3>
      <p>${text}</p>
      ${action}
    </div>`;
}

// Dark banner, as in mockup 7 ("THIS WEEK") and mockup 5 ("Want a real person to check?").
function darkBanner({ icon, eyebrow, text }) {
  return `
    <div class="banner-dark">
      <span class="banner-icon">${icon}</span>
      <span>
        <span class="banner-eyebrow">${eyebrow}</span>
        <span class="banner-text">${text}</span>
      </span>
    </div>`;
}

function notice(kind, text) {
  return `<div class="notice notice-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${escapeHtml(text)}</div>`;
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// One-off message shown on the next screen (e.g. after a delete).
let flash = null;

// ---------- Home (scan a contract) ----------

// The language picked last (on Home, or on a contract) is kept, and used on every screen.
const LANGUAGE_KEY = "clausewise-language";
function savedLanguage() {
  try {
    const v = localStorage.getItem(LANGUAGE_KEY);
    return LANGUAGES.some((l) => l.id === v) ? v : "en";
  } catch {
    return "en";
  }
}
function saveLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch { /* not remembered, but still used now */ }
}

const scan = {
  file: null, // a PDF
  pages: [], // photos: [{ id, image, thumb, result: { text, readable, problem, printed_page } | null, error }]
  retake: null, // index of the page being retaken
  stage: 'pick', // pick -> (pdf) reading -> ready, or (photos) pages -> reading -> review -> ready
  progress: null, // { done, total } while reading pages
  reordered: false,
  problems: [],
  text: '', // the whole contract, masked, once read
  readError: null,
  detected: null,
  detecting: false,
  detectError: null,
  typeTouched: false,
  contractType: 'job_offer',
  explainMode: 'plain',
  language: savedLanguage(),
  situation: '',
  busy: false, // saving
};

const MAX_PAGES = 20;
const READ_AT_ONCE = 3;

// "Tell us about you" (PRD FR7): optional, in the user's own words.
const SITUATION_MAX = 500;
const SITUATION_HINT = "e.g. My first full-time job. I want to study part-time next year. I can't afford to lose money upfront.";
const SITUATION_NOTE = "Optional. Don't include your NRIC or bank details.";

// New wording on the scan screen and the mic buttons ("No more typing", PRD FR9), in the language
// chosen for explanations. Fixed text, not AI. (Tamil still needs a native speaker's check.)
const SCAN_WORDS = {
  en: {
    addPage: 'Add another page', addGallery: 'Add from gallery', done: 'Done – read my contract',
    pagesCount: (n) => `${n} of ${MAX_PAGES} pages`, page: (n) => `Page ${n}`,
    retake: 'Retake', remove: 'Delete', up: 'Move up', down: 'Move down',
    nric: 'Cover your NRIC and bank numbers before you take each photo.',
    tooMany: `You can add up to ${MAX_PAGES} pages.`,
    reading: (x, n) => `Reading page ${x} of ${n}…`, ordering: 'Putting your pages in order…',
    reordered: 'We put your pages in order.', checkHeading: 'Please check these pages',
    unclear: (n, why) => `Page ${n} is hard to read${why ? ` (${why})` : ''} – retake it?`,
    failed: (n) => `Page ${n} could not be read.`,
    missingClauses: (a, b) => `Clauses jump from ${a} to ${b} – is a page missing?`,
    missingPages: (p) => (p.length > 1 ? `Pages ${p.join(' and ')} look missing – did you skip them?` : `Page ${p[0]} looks missing – did you skip it?`),
    duplicate: (a, b) => `Pages ${a} and ${b} look the same – delete one?`,
    retakePage: (n) => `Retake page ${n}`, deletePage: (n) => `Delete page ${n}`, addMissing: 'Add the missing page',
    tryAgain: 'Try again', continueAnyway: 'Continue anyway', startOver: 'Start over',
    readingPdf: 'Reading your PDF…', noText: 'We could not read any text in these photos. Try again with better light, holding the phone flat above each page.',
    detecting: 'Working out what this contract is…',
    detected: (type, party) => (party ? `Detected: ${type} from ${party}` : `Detected: ${type}`),
    change: 'Change', writtenIn: (l) => `Written in ${l}`,
    detectFailed: 'We could not work out what kind of contract this is. Pick it below.',
    types: { job_offer: 'Job offer', rental: 'Rental', phone_subscription: 'Phone / Subscription', loan: 'Loan', business: 'Business', other: 'Other', unsure: 'Not sure' },
    mic: 'Speak instead of typing', listening: 'Listening… tap to stop',
    micBlocked: 'Allow the microphone to use voice input.', noSpeech: 'We didn\'t hear anything. Tap the mic and try again.',
  },
  zh: {
    addPage: '再拍一页', addGallery: '从相册添加', done: '完成 – 读取我的合同',
    pagesCount: (n) => `已拍 ${n} 页（最多 ${MAX_PAGES} 页）`, page: (n) => `第 ${n} 页`,
    retake: '重拍', remove: '删除', up: '上移', down: '下移',
    nric: '每次拍照前，请遮住你的 NRIC 和银行账号。',
    tooMany: `最多可以添加 ${MAX_PAGES} 页。`,
    reading: (x, n) => `正在读取第 ${x} 页，共 ${n} 页…`, ordering: '正在把你的页面排好顺序…',
    reordered: '我们已把你的页面排好顺序。', checkHeading: '请检查这些页面',
    unclear: (n, why) => `第 ${n} 页看不清楚${why ? `（${why}）` : ''} – 要重拍吗？`,
    failed: (n) => `第 ${n} 页读取失败。`,
    missingClauses: (a, b) => `条款从 ${a} 跳到 ${b} – 是不是少了一页？`,
    missingPages: (p) => `好像少了第 ${p.join('、')} 页 – 是不是漏拍了？`,
    duplicate: (a, b) => `第 ${a} 页和第 ${b} 页看起来一样 – 要删除一页吗？`,
    retakePage: (n) => `重拍第 ${n} 页`, deletePage: (n) => `删除第 ${n} 页`, addMissing: '补拍缺少的页',
    tryAgain: '再试一次', continueAnyway: '仍然继续', startOver: '重新开始',
    readingPdf: '正在读取你的 PDF…', noText: '这些照片里读不到文字。请在光线好的地方，把手机平放在每一页上方再拍。',
    detecting: '正在判断这是什么合同…',
    detected: (type, party) => (party ? `识别结果：来自 ${party} 的${type}` : `识别结果：${type}`),
    change: '更改', writtenIn: (l) => `文件语言：${l}`,
    detectFailed: '我们无法判断这是什么合同。请在下面选择。',
    types: { job_offer: '工作录用', rental: '租房', phone_subscription: '电话 / 订阅', loan: '贷款', business: '商业', other: '其他', unsure: '不确定' },
    mic: '用说话代替打字', listening: '正在听… 点一下停止',
    micBlocked: '请允许使用麦克风来语音输入。', noSpeech: '没有听到声音。请点麦克风再试一次。',
  },
  ms: {
    addPage: 'Tambah halaman lagi', addGallery: 'Tambah dari galeri', done: 'Selesai – baca kontrak saya',
    pagesCount: (n) => `${n} daripada ${MAX_PAGES} halaman`, page: (n) => `Halaman ${n}`,
    retake: 'Ambil semula', remove: 'Padam', up: 'Naik', down: 'Turun',
    nric: 'Tutup NRIC dan nombor bank anda sebelum mengambil setiap gambar.',
    tooMany: `Anda boleh menambah sehingga ${MAX_PAGES} halaman.`,
    reading: (x, n) => `Membaca halaman ${x} daripada ${n}…`, ordering: 'Menyusun halaman anda…',
    reordered: 'Kami telah menyusun halaman anda mengikut urutan.', checkHeading: 'Sila semak halaman ini',
    unclear: (n, why) => `Halaman ${n} sukar dibaca${why ? ` (${why})` : ''} – ambil semula?`,
    failed: (n) => `Halaman ${n} tidak dapat dibaca.`,
    missingClauses: (a, b) => `Fasal melompat dari ${a} ke ${b} – adakah satu halaman tertinggal?`,
    missingPages: (p) => `Halaman ${p.join(' dan ')} nampaknya tiada – adakah anda terlepas?`,
    duplicate: (a, b) => `Halaman ${a} dan ${b} nampak sama – padam satu?`,
    retakePage: (n) => `Ambil semula halaman ${n}`, deletePage: (n) => `Padam halaman ${n}`, addMissing: 'Tambah halaman yang tiada',
    tryAgain: 'Cuba lagi', continueAnyway: 'Teruskan juga', startOver: 'Mula semula',
    readingPdf: 'Membaca PDF anda…', noText: 'Kami tidak dapat membaca sebarang teks dalam gambar ini. Cuba lagi di tempat yang terang, dengan telefon rata di atas setiap halaman.',
    detecting: 'Mengenal pasti jenis kontrak ini…',
    detected: (type, party) => (party ? `Dikesan: ${type} daripada ${party}` : `Dikesan: ${type}`),
    change: 'Tukar', writtenIn: (l) => `Ditulis dalam ${l}`,
    detectFailed: 'Kami tidak dapat mengenal pasti jenis kontrak ini. Pilih di bawah.',
    types: { job_offer: 'Tawaran kerja', rental: 'Sewa', phone_subscription: 'Telefon / Langganan', loan: 'Pinjaman', business: 'Perniagaan', other: 'Lain-lain', unsure: 'Tidak pasti' },
    mic: 'Bercakap dan bukan menaip', listening: 'Sedang mendengar… tekan untuk berhenti',
    micBlocked: 'Benarkan mikrofon untuk menggunakan input suara.', noSpeech: 'Kami tidak mendengar apa-apa. Tekan mikrofon dan cuba lagi.',
  },
  ta: {
    addPage: 'இன்னொரு பக்கத்தைச் சேர்', addGallery: 'கேலரியிலிருந்து சேர்', done: 'முடிந்தது – என் ஒப்பந்தத்தைப் படி',
    pagesCount: (n) => `${MAX_PAGES} இல் ${n} பக்கங்கள்`, page: (n) => `பக்கம் ${n}`,
    retake: 'மீண்டும் எடு', remove: 'நீக்கு', up: 'மேலே', down: 'கீழே',
    nric: 'ஒவ்வொரு படம் எடுக்கும் முன் உங்கள் NRIC மற்றும் வங்கி எண்களை மறைக்கவும்.',
    tooMany: `அதிகபட்சம் ${MAX_PAGES} பக்கங்கள் சேர்க்கலாம்.`,
    reading: (x, n) => `${n} இல் பக்கம் ${x} படிக்கப்படுகிறது…`, ordering: 'உங்கள் பக்கங்கள் வரிசைப்படுத்தப்படுகின்றன…',
    reordered: 'உங்கள் பக்கங்களை வரிசைப்படுத்தினோம்.', checkHeading: 'இந்தப் பக்கங்களைச் சரிபார்க்கவும்',
    unclear: (n, why) => `பக்கம் ${n} படிக்கக் கடினமாக உள்ளது${why ? ` (${why})` : ''} – மீண்டும் எடுக்கவா?`,
    failed: (n) => `பக்கம் ${n} ஐப் படிக்க முடியவில்லை.`,
    missingClauses: (a, b) => `பிரிவுகள் ${a} இலிருந்து ${b} க்குத் தாவுகின்றன – ஒரு பக்கம் விடுபட்டதா?`,
    missingPages: (p) => `பக்கம் ${p.join(', ')} விடுபட்டது போல் உள்ளது – எடுக்க மறந்தீர்களா?`,
    duplicate: (a, b) => `பக்கங்கள் ${a} மற்றும் ${b} ஒன்று போல் உள்ளன – ஒன்றை நீக்கவா?`,
    retakePage: (n) => `பக்கம் ${n} ஐ மீண்டும் எடு`, deletePage: (n) => `பக்கம் ${n} ஐ நீக்கு`, addMissing: 'விடுபட்ட பக்கத்தைச் சேர்',
    tryAgain: 'மீண்டும் முயற்சி செய்', continueAnyway: 'எப்படியும் தொடர்', startOver: 'மீண்டும் தொடங்கு',
    readingPdf: 'உங்கள் PDF படிக்கப்படுகிறது…', noText: 'இந்தப் படங்களில் எந்த எழுத்தையும் படிக்க முடியவில்லை. நல்ல வெளிச்சத்தில், ஒவ்வொரு பக்கத்தின் மேலும் தொலைபேசியைத் தட்டையாகப் பிடித்து மீண்டும் முயற்சிக்கவும்.',
    detecting: 'இது என்ன ஒப்பந்தம் என்று கண்டறியப்படுகிறது…',
    detected: (type, party) => (party ? `கண்டறியப்பட்டது: ${party} இடமிருந்து ${type}` : `கண்டறியப்பட்டது: ${type}`),
    change: 'மாற்று', writtenIn: (l) => `மொழி: ${l}`,
    detectFailed: 'இது என்ன வகை ஒப்பந்தம் என்று கண்டறிய முடியவில்லை. கீழே தேர்ந்தெடுக்கவும்.',
    types: { job_offer: 'வேலை வாய்ப்பு', rental: 'வாடகை', phone_subscription: 'தொலைபேசி / சந்தா', loan: 'கடன்', business: 'வணிகம்', other: 'மற்றவை', unsure: 'உறுதியில்லை' },
    mic: 'தட்டச்சுக்குப் பதிலாகப் பேசுங்கள்', listening: 'கேட்கிறது… நிறுத்த தட்டவும்',
    micBlocked: 'குரல் உள்ளீட்டைப் பயன்படுத்த மைக்ரோஃபோனை அனுமதிக்கவும்.', noSpeech: 'எதுவும் கேட்கவில்லை. மைக்கைத் தட்டி மீண்டும் முயற்சிக்கவும்.',
  },
};
const scanWords = (lang = scan.language) => SCAN_WORDS[lang] || SCAN_WORDS.en;

// The type check (PRD FR2): the type the user picked against the one the AI detects.
const TYPE_WORDS = {
  en: {
    guess: (t) => `We think this is a ${t}. Is that right?`,
    insurance: 'Insurance policy',
    readOriginal: 'Read the original clause', hideOriginal: 'Hide the original clause',
    looks: (sug, pick) => `This looks like a ${sug}, not a ${pick}.`,
    switchTo: (sug) => `Switch to ${sug}`, keep: (pick) => `Keep ${pick}`,
    note: (pick, sug) => `You chose ${pick}. ClauseWise thinks this is a ${sug}.`, switch: 'Switch',
  },
  zh: {
    guess: (t) => `我们认为这是${t}。对吗？`,
    insurance: '保险单',
    readOriginal: '阅读原始条款', hideOriginal: '隐藏原始条款',
    looks: (sug, pick) => `这看起来像是${sug}，而不是${pick}。`,
    switchTo: (sug) => `改为${sug}`, keep: (pick) => `保留${pick}`,
    note: (pick, sug) => `你选择了${pick}。ClauseWise 认为这是${sug}。`, switch: '切换',
  },
  ms: {
    guess: (t) => `Kami fikir ini ialah ${t}. Betulkah?`,
    insurance: 'Polisi insurans',
    readOriginal: 'Baca klausa asal', hideOriginal: 'Sembunyikan klausa asal',
    looks: (sug, pick) => `Ini kelihatan seperti ${sug}, bukan ${pick}.`,
    switchTo: (sug) => `Tukar kepada ${sug}`, keep: (pick) => `Kekalkan ${pick}`,
    note: (pick, sug) => `Anda pilih ${pick}. ClauseWise fikir ini ialah ${sug}.`, switch: 'Tukar',
  },
  ta: {
    guess: (t) => `இது ${t} என்று நினைக்கிறோம். சரியா?`,
    insurance: 'காப்பீட்டுக் கொள்கை',
    readOriginal: 'அசல் பிரிவைப் படி', hideOriginal: 'அசல் பிரிவை மறை',
    looks: (sug, pick) => `இது ${sug} போல் தெரிகிறது, ${pick} அல்ல.`,
    switchTo: (sug) => `${sug} ஆக மாற்று`, keep: (pick) => `${pick} ஆக வைத்திரு`,
    note: (pick, sug) => `நீங்கள் ${pick} என்று தேர்ந்தெடுத்தீர்கள். ClauseWise இது ${sug} என்று நினைக்கிறது.`, switch: 'மாற்று',
  },
};
const typeWords = (lang) => TYPE_WORDS[lang] || TYPE_WORDS.en;
// The type buttons are hidden when the AI is confident. They show when the user taps "Change", picks a
// type, when the AI is unsure, or when detection failed.
const typeChoicesShown = () => {
  const d = scan.detected;
  if (scan.detecting) return false;
  if (scan.showTypeChoices || scan.typeTouched || scan.detectError || !d) return true;
  return !d.confident;
};
// "What kind of contract?" and its buttons (or nothing, when the AI is confident). Unsure: the best guess is
// highlighted with "We think this is a [type]. Is that right?"
function typeChoiceHtml(tag) {
  if (!typeChoicesShown()) return '';
  const d = scan.detected;
  const types = scanWords(scan.language).types;
  const tw = typeWords(scan.language);
  const guess = d && !d.confident && !scan.typeTouched && d.contract_type !== 'other'
    ? `<p class="type-lead" lang="${scan.language}">${esc(tw.guess(types[d.contract_type]))}</p>` : '';
  return `${guess}<${tag} class="h2" id="type-heading">What kind of contract?</${tag}>
    ${tileGroup('contract_type', CONTRACT_TYPES, scan.contractType, 'tiles-type', 'What kind of contract?')}`;
}
// The type the contract is saved as: the user's pick, or the AI's when they chose "Not sure".
const effectiveType = () => (scan.contractType === 'unsure' ? (scan.detected?.contract_type || 'other') : scan.contractType);
// Shown when the AI thinks the picked type is wrong. Nothing changes until the user taps a button.
function typeCheckHtml() {
  const d = scan.detected;
  if (!d || scan.contractType === 'unsure' || scan.typeCheckDismissed || d.contract_type === scan.contractType) return '';
  const types = scanWords(scan.language).types;
  const tw = typeWords(scan.language);
  return `
    <div class="type-check" role="alert" lang="${scan.language}">
      <p class="type-check-text">${esc(tw.looks(types[d.contract_type], types[scan.contractType]))}</p>
      <div class="type-check-actions">
        <button class="btn btn-primary btn-small" type="button" data-type-switch="${d.contract_type}">${esc(tw.switchTo(types[d.contract_type]))}</button>
        <button class="btn btn-secondary btn-small" type="button" data-type-keep>${esc(tw.keep(types[scan.contractType]))}</button>
      </div>
    </div>`;
}
// On the contract screen: the type the user saved, and the one ClauseWise thinks it is.
function typeNoteHtml(c) {
  const check = c.decisions?.type_check;
  if (!check || check.suggested === c.contract_type) return '';
  const types = (SCAN_WORDS[c.language] || SCAN_WORDS.en).types;
  const tw = typeWords(c.language);
  return `
    <div class="type-note" role="note" lang="${c.language || 'en'}">
      <p>${esc(tw.note(types[c.contract_type] || c.contract_type, types[check.suggested] || check.suggested))}</p>
      <button class="btn btn-secondary btn-small" type="button" data-type-switch-contract="${c.id}" data-to="${check.suggested}">${esc(tw.switch)}</button>
    </div>`;
}

function tileGroup(name, options, selected, className, label) {
  return `
    <div class="tiles ${className}" role="radiogroup" aria-label="${label}">
      ${options.map((o) => `
        <label class="tile">
          <input type="radio" name="${name}" value="${o.id}" ${o.id === selected ? 'checked' : ''}>
          <span class="tile-inner">${icons[o.icon]}<span>${o.label}</span></span>
        </label>`).join('')}
    </div>`;
}

// A mic button for a text box (hidden where the browser can't do speech recognition).
function micButton(target, lang) {
  if (!voiceSupported) return '';
  const w = scanWords(lang);
  return `<button class="mic-btn" type="button" data-mic="${target}" data-lang="${lang}" aria-pressed="false" aria-label="${escapeHtml(w.mic)}" title="${escapeHtml(w.mic)}">${icons.mic}</button>`;
}

function chosenPdfHtml() {
  const f = scan.file;
  return `
    <div class="scan-file">
      <span class="doc-icon">${icons.doc}</span>
      <span class="file-info">
        <p class="card-title">${escapeHtml(f.name || 'Contract')}</p>
        <p class="card-meta">PDF &middot; ${formatSize(f.size)}</p>
      </span>
      <button class="icon-btn" type="button" id="remove-file" aria-label="Remove this file" ${scan.busy ? 'disabled' : ''}>${icons.x}</button>
    </div>`;
}

// The photographed pages: a numbered thumbnail strip, each with retake, move and delete.
function pagesHtml() {
  const w = scanWords();
  const busy = scan.stage === 'reading' || scan.busy;
  const off = busy ? 'disabled' : '';
  const n = scan.pages.length;
  return `
    <div class="pages-head">
      <span>${escapeHtml(w.pagesCount(n))}</span>
      <button class="link-btn" type="button" data-start-over ${off}>${escapeHtml(w.startOver)}</button>
    </div>
    <ol class="page-strip" aria-label="${escapeHtml(w.pagesCount(n))}">
      ${scan.pages.map((p, i) => `
        <li class="page-tile${p.result && p.result.readable !== 'yes' ? ' page-bad' : ''}">
          <span class="page-num">${i + 1}</span>
          <img src="${p.thumb}" alt="${escapeHtml(w.page(i + 1))}">
          <span class="page-tools">
            <button type="button" data-page-retake="${i}" aria-label="${escapeHtml(`${w.retake} – ${w.page(i + 1)}`)}" ${off}>${icons.camera}</button>
            <button type="button" data-page-up="${i}" aria-label="${escapeHtml(`${w.up} – ${w.page(i + 1)}`)}" ${i === 0 || busy ? 'disabled' : ''}>${icons.arrowUp}</button>
            <button type="button" data-page-down="${i}" aria-label="${escapeHtml(`${w.down} – ${w.page(i + 1)}`)}" ${i === n - 1 || busy ? 'disabled' : ''}>${icons.arrowDown}</button>
            <button type="button" data-page-delete="${i}" aria-label="${escapeHtml(`${w.remove} – ${w.page(i + 1)}`)}" ${off}>${icons.trash}</button>
          </span>
        </li>`).join('')}
    </ol>
    <p class="pages-nric">${icons.lock} ${escapeHtml(w.nric)}</p>
    ${scan.stage === 'pages' ? `
      <div class="pages-actions">
        <label class="pick scan-sub${n >= MAX_PAGES ? ' pick-off' : ''}">
          <input type="file" id="camera-input" accept="image/*" capture="environment" ${n >= MAX_PAGES ? 'disabled' : ''}>
          <span>${icons.camera} ${escapeHtml(w.addPage)}</span>
        </label>
        <label class="pick scan-sub${n >= MAX_PAGES ? ' pick-off' : ''}">
          <input type="file" id="photo-input" accept="image/*" multiple ${n >= MAX_PAGES ? 'disabled' : ''}>
          <span>${icons.image} ${escapeHtml(w.addGallery)}</span>
        </label>
      </div>
      <button class="btn btn-light btn-block" type="button" data-read-pages>${icons.check} ${escapeHtml(w.done)}</button>` : ''}
    ${scan.stage === 'review' || scan.stage === 'ready' ? `<input type="file" id="camera-input" accept="image/*" capture="environment" hidden>` : ''}`;
}

// What happened while reading: progress, page order, and anything to check.
function readStatusHtml() {
  const w = scanWords();
  if (scan.stage === 'reading') {
    const p = scan.progress;
    const label = p ? (p.done < p.total ? w.reading(p.done + 1, p.total) : w.ordering) : w.readingPdf;
    return `
      <div class="read-progress" role="status">
        <span class="spinner" aria-hidden="true"></span> ${escapeHtml(label)}
        ${p ? `<span class="progress-bar"><span style="width:${Math.round((p.done / p.total) * 100)}%"></span></span>` : ''}
      </div>`;
  }
  const parts = [];
  if (scan.readError) parts.push(notice('error', scan.readError));
  if (scan.reordered && scan.pages.length) parts.push(`<p class="read-note">${icons.check} ${escapeHtml(w.reordered)}</p>`);
  if (scan.stage === 'review' && scan.problems.length) {
    parts.push(`
      <div class="page-problems" role="alert">
        <p class="problems-title">${escapeHtml(w.checkHeading)}</p>
        <ul>${scan.problems.map((pr) => `<li><span>${escapeHtml(pr.text)}</span>${pr.actions.map((a) => `
          <button class="btn btn-secondary btn-small" type="button" ${a.attr}>${escapeHtml(a.label)}</button>`).join('')}</li>`).join('')}</ul>
        <button class="btn btn-light btn-block" type="button" data-continue-pages>${escapeHtml(w.continueAnyway)}</button>
      </div>`);
  }
  return parts.join('');
}

// "Detected: Job offer from BrightPath Solutions · Change"
function detectedHtml() {
  if (scan.stage !== 'ready') return '';
  const w = scanWords();
  if (scan.detecting) return `<div class="detected"><span class="spinner" aria-hidden="true"></span> ${escapeHtml(w.detecting)}</div>`;
  if (scan.detectError) {
    return `<div class="detected detected-off">${escapeHtml(w.detectFailed)}
      <button class="link-btn" type="button" data-detect-again>${escapeHtml(w.tryAgain)}</button></div>`;
  }
  const d = scan.detected;
  if (!d) return '';
  const extra = [d.language && w.writtenIn(d.language), ...d.key_dates.map((k) => `${k.what}: ${k.date}`)].filter(Boolean);
  const unsure = !d.confident && !scan.typeTouched;
  const insuranceLabel = d.insurance && effectiveType() === 'other' ? scanWords(scan.language) && typeWords(scan.language).insurance : null;
  const reason = d.reason ? `<span class="detected-reason">${escapeHtml(d.reason)}</span>` : '';
  return `
    ${typeCheckHtml()}
    <div class="detected" lang="${scan.language}">
      <span class="detected-icon">${icons.sparkle}</span>
      <span class="detected-body">
        ${unsure ? '' : `<span class="detected-main">${escapeHtml(w.detected(insuranceLabel || w.types[effectiveType()] || w.types.other, d.other_party))} ·
          <button class="link-btn" type="button" data-change-type>${escapeHtml(w.change)}</button></span>`}
        ${reason}
        ${extra.length ? `<span class="detected-extra">${escapeHtml(extra.join(' · '))}</span>` : ''}
      </span>
    </div>`;
}

// "Tell us about you" (PRD FR7), with its mic (FR9). Phone Home; desktop Home's start card.
function situationFields(off, tag = 'h2') {
  return `
    <${tag} class="h2"><label for="situation-input">Tell us about you</label> <span class="h2-tag">Optional</span></${tag}>
    <div class="voice-box">
      <textarea class="situation-input" id="situation-input" maxlength="${SITUATION_MAX}" rows="3"
        placeholder="${escapeHtml(SITUATION_HINT)}" aria-describedby="situation-note" ${off}>${escapeHtml(scan.situation)}</textarea>
      ${micButton('situation-input', scan.language)}
    </div>
    <p class="situation-note" id="situation-note">${icons.lock} ${escapeHtml(SITUATION_NOTE)} We use your words to show what matters most for you.</p>`;
}

function renderHome() {
  const off = scan.busy ? 'disabled' : '';
  const photos = scan.pages.length > 0;
  return `
    <div class="home-top">
      <span class="logo">${LOGO}<span>Clause<b>Wise</b> SG</span></span>
      <label class="lang-pill" title="Language for explanations">
        ${icons.globe}
        <span aria-hidden="true">${LANGUAGES.find((l) => l.id === scan.language).short}</span>
        ${icons.caret}
        <select id="lang-select" aria-label="Language for explanations" ${off}>
          ${LANGUAGES.map((l) => `<option value="${l.id}" ${l.id === scan.language ? 'selected' : ''}>${l.label}</option>`).join('')}
        </select>
      </label>
    </div>

    ${DEMO_FAIL ? `<div class="demo-label" role="note"><strong>${escapeHtml(checkWords({ language: scan.language }).demo)}</strong> ${escapeHtml(checkWords({ language: scan.language }).demoNote)}</div>` : ''}
    <p class="eyebrow">Understand before you sign</p>
    <h1 class="display">Got a contract to sign? Check it first.</h1>

    <section class="scan-card" aria-label="Add your contract">
      ${scan.file ? chosenPdfHtml() : photos ? pagesHtml() : `
        <label class="pick scan-main">
          <input type="file" id="camera-input" accept="image/*" capture="environment" ${off}>
          <span>${icons.camera} Scan a contract</span>
        </label>
        <div class="scan-row">
          <label class="pick scan-sub">
            <input type="file" id="pdf-input" accept="application/pdf" ${off}>
            <span>${icons.doc} Upload PDF</span>
          </label>
          <label class="pick scan-sub">
            <input type="file" id="photo-input" accept="image/*" multiple ${off}>
            <span>${icons.image} Photo</span>
          </label>
        </div>
        <p class="photo-note">${icons.camera} <span>${escapeHtml(scanWords().nric)}</span> <span>Photos are read by AI before we can hide anything.</span></p>`}
      ${readStatusHtml()}
      <p class="scan-note">${icons.lock} Your original file is never saved · delete anytime</p>
    </section>

    ${detectedHtml()}

    <h2 class="h2">Explain it as</h2>
    ${tileGroup('explain_mode', EXPLAIN_MODES, scan.explainMode, 'tiles-mode', 'Explain it as')}

    ${typeChoiceHtml('h2')}

    ${situationFields(off)}

    <div id="scan-status" aria-live="polite"></div>
    ${scan.stage === 'ready' ? `
      <button class="btn btn-primary btn-block submit" type="button" id="scan-submit" ${off || (scan.detecting ? 'disabled' : '')}>
        ${scan.busy ? '<span class="spinner" aria-hidden="true"></span> Working…' : 'Explain my contract'}
      </button>` : ''}`;
}

function setScanStatus(html) {
  const el = document.getElementById('scan-status');
  if (el) el.innerHTML = html;
}

// Back to an empty scan screen (the photos are dropped; nothing was stored).
function resetUpload() {
  scan.file = null;
  scan.pages = [];
  scan.retake = null;
  scan.stage = 'pick';
  scan.progress = null;
  scan.reordered = false;
  scan.problems = [];
  scan.text = '';
  scan.readError = null;
  scan.detected = null;
  scan.detecting = false;
  scan.detectError = null;
  scan.typeTouched = false;
}

// Pages changed: anything read so far no longer stands for the whole contract.
function pagesChanged() {
  scan.stage = 'pages';
  scan.text = '';
  scan.problems = [];
  scan.reordered = false;
  scan.readError = null;
  scan.detected = null;
  scan.detectError = null;
}

async function choosePdf(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    setScanStatus(notice('error', 'Please choose a PDF file.'));
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    setScanStatus(notice('error', 'This PDF is bigger than 5 MB. Try a smaller file.'));
    return;
  }
  resetUpload();
  scan.file = file;
  scan.stage = 'reading';
  render();
  try {
    const { text } = await pdfToText(file);
    // Hidden here on the device, before the text is saved or sent to any AI.
    scan.text = hidePersonalNumbers(text).text;
    scan.stage = 'ready';
    render();
    detectContract();
  } catch (err) {
    resetUpload();
    render();
    setScanStatus(notice('error', err.message));
  }
}

// Photos from the camera (one) or the gallery (several). A retake replaces that page.
async function addPhotos(files) {
  const list = [...files].filter(Boolean);
  if (!list.length) return;
  const w = scanWords();
  const retake = scan.retake;
  scan.retake = null;
  if (retake === null && scan.pages.length + list.length > MAX_PAGES) toast(w.tooMany);
  const room = retake === null ? MAX_PAGES - scan.pages.length : 1;
  try {
    const prepared = await Promise.all(list.slice(0, room).map(preparePhoto));
    const pages = prepared.map((p) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...p, result: null, error: null }));
    if (retake !== null && scan.pages[retake]) scan.pages[retake] = pages[0];
    else scan.pages.push(...pages);
    scan.file = null;
    pagesChanged();
  } catch (err) {
    toast(err.message);
  }
  render();
  document.querySelector('.page-strip li:last-child')?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
}

// "Done – read my contract": each page that hasn't been read yet is read by Claude vision in its
// own call, a few at a time; then the AI puts the pages in order and points out problems.
async function readPages() {
  const w = scanWords();
  const todo = scan.pages.filter((p) => !p.result);
  scan.stage = 'reading';
  scan.readError = null;
  scan.progress = { done: scan.pages.length - todo.length, total: scan.pages.length };
  render();
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const page = todo[next++];
      try {
        page.result = await readPage(page.image, api, scan.pages.indexOf(page) + 1);
        page.error = null;
      } catch (err) {
        page.error = err.message;
      }
      scan.progress.done++;
      render();
    }
  };
  await Promise.all(Array.from({ length: READ_AT_ONCE }, worker));

  let order = null;
  const read = scan.pages.filter((p) => p.result?.text);
  if (scan.pages.length > 1 && read.length > 1) {
    try {
      order = await api('collate', {
        method: 'POST',
        what: 'putting your pages in order',
        json: { pages: scan.pages.map((p) => ({ text: p.result?.text || '', printed_page: p.result?.printed_page || null, readable: p.result?.readable || 'no' })) },
      });
    } catch (err) {
      scan.readError = err.message; // the pages keep the order they were taken in
    }
  }

  // Apply the AI's order (photo numbers in the order they were taken) and note what changed.
  const taken = [...scan.pages];
  if (order?.reordered) scan.pages = order.order.map((n) => taken[n - 1]);
  scan.reordered = Boolean(order?.reordered);
  const pos = (photoNo) => scan.pages.indexOf(taken[photoNo - 1]) + 1;

  const problems = [];
  scan.pages.forEach((p, i) => {
    const n = i + 1;
    if (p.error) {
      problems.push({ text: `${w.failed(n)} ${p.error}`, actions: [{ label: w.tryAgain, attr: 'data-read-pages' }, { label: w.retakePage(n), attr: `data-page-retake="${i}"` }] });
    } else if (p.result && p.result.readable !== 'yes') {
      problems.push({ text: w.unclear(n, p.result.problem), actions: [{ label: w.retakePage(n), attr: `data-page-retake="${i}"` }, { label: w.deletePage(n), attr: `data-page-delete="${i}"` }] });
    }
  });
  for (const m of order?.missing || []) {
    problems.push({ text: m.from && m.to ? w.missingClauses(m.from, m.to) : w.missingPages(m.pages), actions: [{ label: w.addMissing, attr: 'data-add-missing' }] });
  }
  for (const group of order?.duplicates || []) {
    const [a, ...rest] = group.map(pos).sort((x, y) => x - y);
    for (const b of rest) problems.push({ text: w.duplicate(a, b), actions: [{ label: w.deletePage(b), attr: `data-page-delete="${b - 1}"` }] });
  }
  scan.problems = problems;
  scan.progress = null;
  if (problems.length) {
    scan.stage = 'review';
    render();
    document.querySelector('.page-problems')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    finishPages();
  }
}

// Combine the pages, in order, into one contract (masked like a PDF), then detect what it is.
function finishPages() {
  const text = scan.pages.map((p) => p.result?.text || '').filter(Boolean).join('\n\n').trim();
  if (!text) {
    scan.stage = 'pages';
    scan.readError = scanWords().noText;
    render();
    return;
  }
  scan.text = hidePersonalNumbers(text).text;
  scan.stage = 'ready';
  scan.problems = [];
  render();
  detectContract();
}

// AI works out the contract type, language, other party and key dates, and pre-fills the type
// unless the user has already picked one themselves.
async function detectContract() {
  scan.detecting = true;
  scan.detectError = null;
  render();
  try {
    const d = await api('detect', { method: 'POST', json: { text: scan.text.slice(0, 15000), lang: scan.language }, what: 'working out what this contract is' });
    scan.detected = d;
    scan.showTypeChoices = false;
    scan.typeCheckDismissed = false; // a new scan gets the type check again
    if (!scan.typeTouched) scan.contractType = d.contract_type; // the best guess (or the confident answer) is selected
  } catch (err) {
    scan.detectError = err.message;
  } finally {
    scan.detecting = false;
    render();
  }
}

async function submitScan() {
  // The type must be known first: a click during detection would save the wrong type.
  if (scan.stage !== 'ready' || !scan.text || scan.busy || scan.detecting) return;
  scan.busy = true;
  render();
  try {
    setScanStatus(notice('info', 'Saving…'));
    const isPdf = Boolean(scan.file);
    const d = scan.detected;
    const typeName = scan.detected?.insurance && effectiveType() === 'other' ? typeWords(scan.language).insurance : (CONTRACT_TYPES.find((t) => t.id === effectiveType())?.label || 'Contract');
    // Only the masked text is sent. The original PDF or photos are not uploaded or kept.
    const { id } = await api('contracts', {
      method: 'POST',
      what: 'saving your contract',
      json: {
        raw_text: scan.text,
        file_name: isPdf ? scan.file.name || 'contract.pdf' : `photos-${scan.pages.length}-pages.jpg`,
        title: d?.other_party ? `${typeName} – ${d.other_party}` : isPdf ? '' : `${typeName} (${scan.pages.length} photo${scan.pages.length > 1 ? 's' : ''})`,
        source_type: isPdf ? 'pdf' : 'photo',
        contract_type: effectiveType(),
        // The user kept a type the AI thinks is wrong: saved so the contract screen can offer "Switch".
        type_check: d && d.contract_type !== effectiveType() ? { picked: effectiveType(), suggested: d.contract_type } : null,
        explain_mode: scan.explainMode,
        language: scan.language,
        // Masked like the contract before it leaves the device.
        situation: hidePersonalNumbers(scan.situation.slice(0, SITUATION_MAX)).text.trim(),
      },
    });

    resetUpload(); // the photos are dropped here
    scan.situation = '';
    scan.busy = false;
    refreshContractsList();
    // First the "Personal details found" screen; its Continue button goes where "Explain it as"
    // says: Comic opens the comics, Plain words and Audio open the Overview.
    location.hash = `#/contract/${id}/personal/${scan.explainMode === 'comic' ? 'comic' : 'summary'}`;
  } catch (err) {
    scan.busy = false;
    render();
    setScanStatus(notice('error', err.message));
  }
}

screen.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'pdf-input') {
    choosePdf(t.files[0]);
  } else if (t.id === 'dt-file-input') {
    dtFiles([...t.files]);
  } else if (t.id === 'photo-input' || t.id === 'camera-input') {
    addPhotos(t.files);
  } else if (t.id === 'comic-clause' && t.value) {
    location.hash = `#/contract/${parseRoute().params[0]}/comic/${encodeURIComponent(t.value)}`;
  } else if (t.id === 'lang-select') {
    scan.language = t.value;
    saveLanguage(t.value);
    render();
  } else if (t.name === 'contract_type') {
    scan.contractType = t.value;
    scan.typeTouched = true;
    scan.typeCheckDismissed = false;
    // The detected line names the type the user picked.
    const detected = document.querySelector('.detected');
    document.querySelectorAll('.type-check').forEach((n) => n.remove());
    if (detected && scan.detected) detected.outerHTML = detectedHtml();
  } else if (t.name === 'explain_mode') {
    scan.explainMode = t.value;
  }
});

// Typing doesn't re-render, so the box keeps its cursor.
screen.addEventListener('input', (e) => {
  if (e.target.id === 'situation-input') scan.situation = e.target.value;
  if (e.target.id === 'draft-text') {
    const c = contractCache.get(parseRoute().params[0]);
    if (c) draftEdited(c, e.target.value);
  }
});

// Scan screen buttons for pages, problems and detection.
function scanClick(e) {
  const btn = e.target.closest('button');
  // On a contract screen: the original-clause toggle in a comic.
  if (btn?.matches('[data-toggle-original]')) {
    const box = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    if (box) box.hidden = !open;
    const tw = typeWords(shellLang());
    btn.textContent = open ? tw.hideOriginal : tw.readOriginal;
    return true;
  }
  // On a contract screen: "Switch" on the type note (the only button there that this handles).
  if (btn?.matches('[data-type-switch-contract]')) {
    const id = btn.dataset.typeSwitchContract;
    btn.disabled = true;
    api(`contracts?id=${encodeURIComponent(id)}`, { method: 'PATCH', json: { contract_type: btn.dataset.to }, what: 'switching the contract type' })
      .then(() => {
        // The summary, warnings and plan are made again for the new type.
        contractCache.delete(id);
        render();
      })
      .catch((err) => { toast(err.message); btn.disabled = false; });
    return true;
  }
  if (!btn || parseRoute().name !== 'home') return false;
  const i = (name) => Number(btn.dataset[name]);
  if (btn.matches('[data-page-retake]')) {
    scan.retake = i('pageRetake');
    document.getElementById('camera-input')?.click();
  } else if (btn.matches('[data-page-delete]')) {
    scan.pages.splice(i('pageDelete'), 1);
    if (!scan.pages.length) resetUpload();
    else pagesChanged();
    render();
  } else if (btn.matches('[data-page-up], [data-page-down]')) {
    const from = btn.matches('[data-page-up]') ? i('pageUp') : i('pageDown');
    const to = btn.matches('[data-page-up]') ? from - 1 : from + 1;
    [scan.pages[from], scan.pages[to]] = [scan.pages[to], scan.pages[from]];
    pagesChanged();
    render();
  } else if (btn.matches('[data-read-pages]')) {
    readPages();
  } else if (btn.matches('[data-add-missing]')) {
    pagesChanged();
    render();
    document.getElementById('camera-input')?.click();
  } else if (btn.matches('[data-continue-pages]')) {
    finishPages();
  } else if (btn.matches('[data-start-over]')) {
    resetUpload();
    render();
  } else if (btn.matches('[data-detect-again]')) {
    detectContract();
  } else if (btn.matches('[data-type-switch]')) {
    scan.contractType = btn.dataset.typeSwitch;
    scan.typeTouched = true;
    scan.typeCheckDismissed = false;
    render();
  } else if (btn.matches('[data-type-keep]')) {
    scan.typeCheckDismissed = true;
    render();
  } else if (btn.matches('[data-change-type]')) {
    scan.showTypeChoices = true;
    render().then(() => {
      const tiles = document.querySelector('.tiles-type');
      tiles?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tiles?.querySelector('input:checked')?.focus({ preventScroll: true });
    });
  } else {
    return false;
  }
  return true;
}

// Mic buttons (scan screen and Ask tab).
function micClick(e) {
  const btn = e.target.closest('[data-mic]');
  if (!btn) return false;
  if (!document.getElementById(btn.dataset.mic)) return true;
  const w = scanWords(btn.dataset.lang);
  listenInto(btn.dataset.mic, btn.dataset.lang, {
    onState: (on) => {
      // While listening the button reads "Stop": one tap ends the session, and the text stays editable.
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('mic-btn-stop', on);
      btn.innerHTML = on ? `${icons.stopSquare}<span>Stop</span>` : icons.mic;
      btn.title = on ? w.listening : w.mic;
      btn.setAttribute('aria-label', on ? 'Stop listening' : w.mic);
    },
    onError: (code) => toast(code === 'not-allowed' || code === 'service-not-allowed' ? w.micBlocked : code === 'no-speech' ? w.noSpeech : w.noSpeech),
  });
  return true;
}

// ---------- Contracts list ----------

async function renderContracts() {
  const rows = await api('contracts', { what: 'loading your contracts' });
  const message = flash ? notice('success', flash) : '';
  flash = null;

  const head = `
    <div class="page-head">
      <h1 class="page-h1">Contracts</h1>
      <a class="add-pill" href="#/home">${icons.plus} Scan</a>
    </div>
    <p class="page-sub">Only you can see these. Delete any of them anytime.</p>`;

  if (!rows.length) {
    return `
      ${message}
      ${head}
      ${emptyState({
    icon: icons.doc,
    title: 'No contracts yet',
    text: 'Contracts you scan or upload will appear here.',
    action: `<a class="btn btn-primary" href="#/home">${icons.camera} Scan a contract</a>`,
  })}`;
  }

  return `
    ${message}
    ${head}
    ${rows.map((c) => `
      <div class="card contract-row">
        <a class="card-link" href="#/contract/${c.id}/summary">
          <span class="doc-icon">${c.source_type === 'photo' ? icons.camera : icons.doc}</span>
          <span class="file-info">
            <p class="card-title">${escapeHtml(displayTitle(c.title))}</p>
            <p class="card-meta">${labelOf(CONTRACT_TYPES, c.contract_type)} &middot; ${formatDate(c.created_at)}</p>
          </span>
        </a>
        <button class="icon-btn" type="button" data-delete="${c.id}" aria-label="Delete ${escapeHtml(displayTitle(c.title))}">${icons.trash}</button>
      </div>`).join('')}`;
}

// ---------- Deadlines / Experts (Nice to Have, not in this version) ----------

// Upcoming key dates from every saved contract, soonest first; undated ones last. The Deadlines
// page and the sidebar badge both use this list, so their counts always match. Past dates are left out.
const ONE_DAY = 86400000;
const DEADLINE_KINDS = [
  ['probation', /probation/i],
  ['reply', /reply|respond|acceptance|accept |sign and return|return the signed|lapse/i],
  ['start', /\bstart|commence|\bbegin/i],
  ['notice', /notice/i],
  ['pay', /\bpay|payment|\bdue\b|invoice|\bfee/i],
  ['end', /\bend|expir|terminat|renew|finish|complete/i],
];
const deadlineKind = (text) => (DEADLINE_KINDS.find(([, re]) => re.test(text)) || ['other'])[0];

function deadlineRows() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rows = [];
  for (const r of contractsList || []) {
    (r.key_dates || []).forEach((kd, i) => {
      const text = kd.text || '';
      const source = kd.source || text; // the English original: dates and kinds are read from it
      const date = parseDayMonth(source);
      const days = date ? Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - today) / ONE_DAY) : null;
      if (days !== null && days < 0) return;
      rows.push({ key: `${r.id}:${i}`, contractId: r.id, title: r.title, text, clause: kd.clauses?.[0] || '', kind: deadlineKind(source), date, days });
    });
  }
  return rows.sort((a, b) => (a.date && b.date ? a.date - b.date : a.date ? -1 : b.date ? 1 : 0));
}

// The rows as the Deadlines page shows them, so a row's "Add to calendar" knows its date.
let deadlineRowsShown = [];
const DL_LOCALE = { en: 'en-SG', zh: 'zh-CN', ms: 'ms-MY', ta: 'ta-IN' };

function renderDeadlines() {
  const lang = shellLang();
  const L = dtLang(lang);
  const w = dtWords(lang);
  const d = w.deadlines;
  const head = `<h1 class="${isDesktop() ? 'dt-inner-h1' : 'page-h1'}" lang="${L}">${esc(d.title)}</h1>`;
  if (!contractsList) {
    return `${head}${contractsListError ? notice('error', d.loadFailed) : '<div class="loading"><span class="spinner"></span></div>'}`;
  }
  deadlineRowsShown = deadlineRows();
  if (!deadlineRowsShown.length) {
    return `${head}${emptyState({
      icon: icons.calendar,
      title: esc(d.empty.title),
      text: esc(d.empty.text),
      action: `<a class="btn btn-primary" href="#/scan">${esc(d.empty.scan)}</a>`,
    })}`;
  }
  return `${head}
    <p class="page-sub" lang="${L}">${esc(d.sub)}</p>
    <ol class="dl-list" lang="${L}">${deadlineRowsShown.map((r, i) => deadlineRowHtml(r, i, w, L)).join('')}</ol>`;
}

function deadlineRowHtml(r, i, w, L) {
  const d = w.deadlines;
  const locale = DL_LOCALE[L] || 'en-SG';
  const dateCell = r.date
    ? `<span class="dl-day">${r.date.getDate()}</span><span class="dl-mon">${esc(r.date.toLocaleDateString(locale, { month: 'short', year: 'numeric' }))}</span>
       <span class="visually-hidden">${esc(r.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }))}</span>`
    : `<span class="dl-day" aria-hidden="true">–</span><span class="visually-hidden">${esc(d.noDate)}</span>`;
  const clause = r.clause ? (/^\d/.test(r.clause) ? `${d.clause} ${r.clause}` : r.clause) : '';
  const days = r.days === null ? d.noDate : d.daysLeft(r.days);
  const name = displayTitle(r.title);
  return `
    <li class="dl-row">
      <span class="dl-date">${dateCell}</span>
      <span class="dl-main">
        <span class="dl-kind">${esc(d.kinds[r.kind])}</span>
        <span class="dl-text">${escapeHtml(r.text)}</span>
        <span class="dl-meta"><a class="dl-contract" href="#/contract/${r.contractId}/summary">${escapeHtml(name)}</a>${clause ? `<span> · ${esc(clause)}</span>` : ''}</span>
      </span>
      <span class="dl-side">
        <span class="dl-days${r.days !== null && r.days <= 7 ? ' dl-soon' : ''}">${esc(days)}</span>
        <button class="dl-ics" type="button" data-ics="${i}" ${r.date ? '' : 'disabled'} aria-label="${esc(`${d.addCal}: ${d.kinds[r.kind]}, ${name}`)}">${icons.calendar}<span aria-hidden="true">${esc(d.addCal)}</span></button>
      </span>
    </li>`;
}

// One key date as an iCalendar (.ics) all-day event, for "Add to calendar".
const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFor(r, w) {
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`;
  const next = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const name = displayTitle(r.title);
  const desc = [r.text, r.clause ? `${w.deadlines.clause} ${r.clause}` : '', name, 'ClauseWise SG explains contracts. It is not legal advice.'].filter(Boolean).join('\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClauseWise SG//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${r.key}-${stamp}@clausewise`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(r.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${icsEscape(`${w.deadlines.kinds[r.kind]}: ${name}`)}`, `DESCRIPTION:${icsEscape(desc)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function downloadIcs(i) {
  const r = deadlineRowsShown[i];
  if (!r?.date) return;
  const blob = new Blob([icsFor(r, dtWords(shellLang()))], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clausewise-${r.kind}-${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderExperts() {
  return `
    <h1 class="page-h1">Experts</h1>
    <p class="page-sub">Talk to a real person about your contract.</p>
    ${emptyState({
    icon: icons.chat,
    title: 'Big decision?',
    text: 'ClauseWise SG explains contracts but isn\'t legal advice. For a big decision, ask a qualified professional to review your contract.',
  })}`;
}

// ---------- Contract screen ----------

// Keeps loaded contracts so switching tabs doesn't refetch.
const contractCache = new Map();

async function loadContract(id) {
  if (!contractCache.has(id)) {
    const c = await api(`contracts?id=${encodeURIComponent(id)}`, { what: 'opening this contract' });
    contractCache.set(id, c);
    // The language chosen last is used for this contract too (its summary etc. are translated on demand).
    if (c.language && c.language !== scan.language) {
      c.language = scan.language;
      api(`contracts?id=${encodeURIComponent(id)}`, { method: 'PATCH', json: { language: c.language } })
        .catch(() => toast('Could not save your language choice. It will reset next time.'));
    }
  }
  return contractCache.get(id);
}

// "4.4" -> "Clause 4.4"; named sections like "Acceptance" stay as they are.
const clauseLabel = (n) => (/^\d/.test(n) ? `Clause ${n}` : n);

// "4.4" -> "Cl. 4.4" for the compact reference on the right of a row.
const shortRef = (n) => (/^\d/.test(n) ? `Cl. ${n}` : n);

const clauseHeading = (cl) => `${escapeHtml(clauseLabel(cl.number))}${cl.heading && cl.heading !== cl.number ? ` &middot; ${escapeHtml(cl.heading)}` : ''}`;

// The original wording of every clause a point comes from, shown when the row is tapped.
function clauseQuotes(c, numbers) {
  return numbers.map((n) => c.clauses?.find((cl) => cl.number === n)).filter(Boolean).map((cl) => `
    <div class="clause-quote">
      <p class="quote-head">${clauseHeading(cl)}</p>
      <blockquote>${escapeHtml(cl.text)}</blockquote>
    </div>`).join('');
}

// A row in an "In plain words" / "Dates to note" card. Tapping it shows the original clauses.
// `after`: extra HTML under the row that isn't part of the button (e.g. a help link).
let pointSeq = 0;
function pointRow(c, { lead, title, sub, numbers, muted = false, after = '' }) {
  const tappable = numbers.length > 0;
  const desk = isDesktop();
  const ref = tappable ? `${desk ? dtRef(numbers[0]) : shortRef(numbers[0])}${numbers.length > 1 ? ` +${numbers.length - 1}` : ''}` : '';
  const id = `pt-${++pointSeq}`;
  // The clause reference sits beside the title so the explanation can use the full width.
  const inner = `
    ${lead}
    <span class="point-body">
      <span class="point-head">
        <span class="point-title">${title}</span>
        ${ref ? `<span class="point-ref">${escapeHtml(ref)}</span>` : ''}
      </span>
      ${sub ? `<span class="point-sub">${sub}</span>` : ''}
    </span>`;
  // Desktop: the clause is shown in the "Original contract" panel beside the list instead.
  if (desk && tappable) {
    return `
    <li class="point${muted ? ' point-muted' : ''}">
      <button class="point-row" type="button" data-dt-clause="${escapeHtml(numbers.join('|'))}" aria-controls="dt-clauses">${inner}</button>
      ${after}
    </li>`;
  }
  return `
    <li class="point${muted ? ' point-muted' : ''}">
      ${tappable
    ? `<button class="point-row" type="button" aria-expanded="false" aria-controls="${id}">${inner}</button>
         <div class="point-clauses" id="${id}" hidden>${clauseQuotes(c, numbers)}</div>`
    : `<div class="point-row">${inner}</div>`}
      ${after}
    </li>`;
}

const ROW_SHAPES = {
  money: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h8"/></svg>',
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a7 7 0 0 1 12-3l3 3M20 15a7 7 0 0 1-12 3l-3-3M19 4v5h-5M5 20v-5h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l3 3"/></svg>',
  tool: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-2.5z"/></svg>',
  percent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
};

// Icon for each "In plain words" row, across all contract types (older saved summaries too).
const POINT_ICONS = {
  pay: ROW_SHAPES.money, hours: ROW_SHAPES.clock, probation: ROW_SHAPES.hourglass, notice: ROW_SHAPES.mail,
  leave: ROW_SHAPES.sun, start_date: ROW_SHAPES.flag,
  monthly_price: ROW_SHAPES.money, contract_length: ROW_SHAPES.calendar, early_termination_fee: ROW_SHAPES.exit,
  how_to_cancel: ROW_SHAPES.mail, auto_renewal: ROW_SHAPES.repeat, extra_charges: ROW_SHAPES.plus,
  monthly_rent: ROW_SHAPES.money, deposit: ROW_SHAPES.key, lease_length: ROW_SHAPES.calendar,
  repairs: ROW_SHAPES.tool, early_termination: ROW_SHAPES.exit,
  amount: ROW_SHAPES.money, interest_rate: ROW_SHAPES.percent, monthly_repayment: ROW_SHAPES.card,
  loan_length: ROW_SHAPES.calendar, late_fees: ROW_SHAPES.clock, early_repayment: ROW_SHAPES.exit,
  fees: ROW_SHAPES.card,
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Calendar-style block for a key date: "DEC / 1" when the text has a date, otherwise a clock.
function dateBlock(text) {
  const m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
    || text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/i);
  const urgent = /\bwithin\s+\d+\s+hours?\b|\b24\s*hours?\b|\btoday\b|\btomorrow\b/i.test(text);
  if (m) {
    const [day, mon] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    if (MONTHS.includes(mon.toLowerCase())) {
      return `<span class="date-block${urgent ? ' urgent' : ''}" aria-hidden="true"><span class="mon">${mon.slice(0, 3).toUpperCase()}</span><span class="day">${Number(day)}</span></span>`;
    }
  }
  return `<span class="date-block date-block-icon${urgent ? ' urgent' : ''}" aria-hidden="true">${POINT_ICONS.hours}</span>`;
}

const statedIn = (numbers) => (numbers.length
  ? `Stated in ${numbers.map((n) => (/^\d/.test(n) ? `Clause ${n}` : /^Para \d/.test(n) ? n : `the ${n} section`)).join(', ')}`
  : 'Clause not identified, check the full text below');

function fullText(c) {
  const clauses = c.clauses || [];
  return `
    <details class="card all-clauses">
      <summary>Full contract text &middot; ${clauses.length} clauses</summary>
      ${clauses.map((cl) => `
        <div class="clause-item">
          <p class="clause-num">${clauseHeading(cl)}</p>
          <p class="clause-text">${escapeHtml(cl.text)}</p>
        </div>`).join('')}
    </details>`;
}

// "brightpath-offer" -> "Brightpath offer"
function displayTitle(title) {
  const t = String(title || 'Contract').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Summaries and risk checks are made once per contract (10–20 seconds each), then saved.
// "Your situation" (`tailored`) is made from both, so it comes last.
const aiRequests = new Map();
const AI_ENDPOINTS = { summary: 'summary', risks: 'risks', tailored: 'tailor' };

function loadAi(c, field) {
  const key = `${field}:${c.id}`;
  if (aiRequests.has(key)) return;
  delete c[`${field}Error`];
  const what = { summary: 'making the summary', risks: 'checking for warning signs', tailored: 'making your plan' }[field];
  const extra = field === 'summary' || field === 'risks' ? demoParam() : '';
  const call = () => api(`${AI_ENDPOINTS[field]}?id=${encodeURIComponent(c.id)}${extra}`, { method: 'POST', what });
  let stale = false;
  aiRequests.set(key, call()
    // The free AI service is sometimes slow or busy: retry once before showing an error.
    .catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)))
    .then((data) => {
      // Made from words the user has since changed: ask again for the new ones.
      if (field === 'tailored' && (data.situation || '') !== (c.situation || '')) {
        stale = true;
        return;
      }
      if (data.clauses) c.clauses = data.clauses;
      c[field] = data[field];
    })
    .catch((err) => {
      c[`${field}Error`] = err.message;
    })
    .finally(() => {
      aiRequests.delete(key);
      if (field === 'summary' && !c.risks && !c.risksError) loadAi(c, 'risks');
      // The plan needs both the summary and the risk check, which are made at the same time.
      if ((field === 'summary' || field === 'risks' || stale) && c.summary && c.risks && !c.tailored && !c.tailoredError) loadAi(c, 'tailored');
      if (field === 'tailored' && c.summary && c.risks) loadCheck(c); // then the double check (PRD FR10)
      const { name, params } = parseRoute();
      if (name !== 'contract' || params[0] !== c.id) return;
      const tab = params[1] || 'summary';
      // Still waiting for the final answer: move the progress message on.
      if (!finalState(c) && (tab === 'summary' || tab === 'risks')) {
        render();
        return;
      }
      if (field === 'tailored') {
        if (tab === 'summary') updateTailored(c);
        else if (tab === 'risks') render();
        return;
      }
      if (field === 'risks' && tab === 'summary') updateRiskChrome(c); // don't close rows the reader has open
      else if ((field === 'summary' && tab === 'summary') || (field === 'risks' && (tab === 'risks' || tab === 'doc'))) render();
      else if (tab === 'comic' && !params[2]) render(); // the comic list is built from both
      else if (tab === 'personal' && field === 'risks') render(); // shows the note about the payee
      else if (field === 'risks') updateRiskChrome(c);
    }));
}

function retryButton(field) {
  return `<button class="btn btn-primary btn-block" type="button" data-retry="${field}">Try again</button>`;
}

function renderSummary(c) {
  // Desktop: the violet banner, the "Original contract" panel and the right column show the scam
  // check, the clauses and the plan, so they aren't repeated here.
  const desk = isDesktop();
  const banner = desk ? '' : `<div id="risk-banner">${riskBanner(c)}</div>`;
  if (c.summaryError) {
    return `
      ${banner}
      ${notice('error', c.summaryError)}
      ${retryButton('summary')}
      ${desk ? '' : fullText(c)}`;
  }
  // Nothing is shown until the final, double-checked answer is ready (PRD FR10).
  const waiting = waitingCard(c, 'summary');
  if (waiting) return waiting;

  // Rows the contract doesn't mention are hidden and listed in one grey line instead.
  // The rest come in the order that fits the user's situation, once that is ready.
  const terms = orderedTerms(c, c.summary.filter((s) => s.key !== 'key_date' && s.found));
  const reordered = Boolean(c.situation && c.tailored);
  const missing = c.summary.filter((s) => s.key !== 'key_date' && !s.found);
  const dates = c.summary.filter((s) => s.key === 'key_date');
  // Translated wording, matched by position in the saved summary.
  const tr = translated(c, 'summary');
  const t = (s, field) => tr?.[c.summary.indexOf(s)]?.[field] || s[field];
  const missingLabels = missing.map((s) => (tr ? t(s, 'label') : s.label.toLowerCase())).join(', ');

  const termRow = (s) => pointRow(c, {
    lead: `<span class="point-icon">${POINT_ICONS[s.key] || icons.doc}</span>`,
    title: escapeHtml(t(s, 'label')),
    sub: s.checked === 'unclear' ? unclearHtml(c, s.clause_numbers) : escapeHtml(t(s, 'plain_text')),
    numbers: s.clause_numbers,
  });

  const dateRow = (d) => pointRow(c, {
    lead: dateBlock(d.plain_text), // the date block is read from the English wording
    title: escapeHtml(t(d, 'plain_text')),
    sub: statedIn(d.clause_numbers),
    numbers: d.clause_numbers,
  });

  const listen = c.explain_mode === 'audio' && speechSupported
    ? `<button class="listen-bar" type="button" data-listen>${isSpeaking() ? `${icons.stopSquare} Stop reading` : `${icons.play} Listen to this summary`}</button>`
    : '';

  return `
    ${banner}
    ${checkedTick(c)}
    <div id="for-you">${forYouBanner(c)}</div>
    ${languageNote(c, 'summary')}
    ${listen}
    <div class="section-row">
      <h2 class="h2">In plain words</h2>
      ${reordered ? '<span class="section-note">Ordered for your situation</span>' : ''}
    </div>
    ${terms.length ? `<ul class="list-card">${terms.map(termRow).join('')}</ul>` : ''}
    ${missing.length ? `<p class="not-in-contract">Not in this contract: ${escapeHtml(missingLabels)}</p>` : ''}

    ${dates.length ? `
      <h2 class="h2">Dates to note</h2>
      <ul class="list-card">${dates.map(dateRow).join('')}</ul>` : ''}

    ${desk ? '' : `<div id="plan-slot">${planSection(c)}</div>`}

    ${c.risks && !desk ? decideCard(c) : ''}

    ${behindScenes(c)}

    ${desk ? '' : fullText(c)}

    ${desk
    ? `<p class="tab-foot" lang="${dtLang(c.language)}">${esc(dtWords(c.language).clickHint)} ${esc(dtWords(c.language).aiMade)}</p>`
    : '<p class="tab-foot">Tap any point to see the original clause. Made by AI from your contract.</p>'}

    <button class="btn btn-danger-ghost btn-block" type="button" data-delete="${c.id}">${icons.trash} Delete this contract</button>

    ${desk ? '' : `<a class="fab" href="#/contract/${c.id}/ask">${icons.sparkle} Ask AI</a>`}`;
}

// ---------- Your situation (PRD FR7) ----------

// Where a plan step can send someone. The AI only picks the key; links and numbers live here.
const HELP_LINKS = {
  mom: { label: 'MOM', href: 'https://www.mom.gov.sg/employment-practices' },
  tadm: { label: 'TADM', href: 'https://www.tal.sg/tadm' },
  probono: { label: 'Pro Bono SG', href: 'https://www.probono.sg/' },
  scamshield: { label: 'ScamShield 1799', href: 'tel:1799' },
  acra: { label: 'ACRA BizFile', href: 'https://www.bizfile.gov.sg/' },
  case: { label: 'CASE', href: 'https://www.case.org.sg/' },
};

// Summary rows, most relevant to the user first (the saved order until that's ready).
function orderedTerms(c, terms) {
  const order = c.tailored?.summary_order;
  if (!order?.length) return terms;
  const pos = (s) => (order.includes(s.key) ? order.indexOf(s.key) : order.length);
  return [...terms].sort((a, b) => pos(a) - pos(b));
}

const RISK_LEVELS = ['high', 'medium', 'info'];

// Warnings in the order shown: High, then Medium, then Info; scam signs before other terms; then
// what matters most for this person. The user's situation can move a risky term between Info and
// Medium, never a scam sign. `index` is the position in the saved list (used in links and
// translations), `why` the "Why this matters for you" line.
function riskList(c) {
  const items = c.risks?.items || [];
  const tailored = c.tailored?.risks || [];
  const list = items.map((r, index) => {
    const t = tailored.find((x) => x.index === index);
    const level = t && r.kind === 'risky_term' && ['info', 'medium'].includes(t.level) ? t.level : r.level;
    return { ...r, index, level, why: t?.why_for_you || '', rel: t ? tailored.indexOf(t) : tailored.length };
  });
  const rank = (i) => RISK_LEVELS.indexOf(i.level) * 2 + (i.kind === 'scam_sign' ? 0 : 1);
  return list.sort((a, b) => rank(a) - rank(b) || a.rel - b.rel || a.index - b.index);
}

// Translated "Why this matters" lines and plan steps, or null (starts the translation if needed).
function tailoredTr(c) {
  const t = c.tailored;
  if (!t || !c.language || c.language === 'en') return null;
  if (!t.plan.length && !t.risks.some((r) => r.why_for_you)) return null;
  const tr = translated(c, 'tailored');
  if (!tr && !c.translateErrors?.[`${c.id}:${c.language}:tailored`]) loadTranslation(c, 'tailored');
  return tr;
}

// The fixed wording around the parts made for the user, in each language the app explains in.
// Written here rather than by the AI, so it shows straight away. (Tamil still needs a native
// speaker's check, like the other Tamil text.)
const FOR_YOU_WORDS = {
  en: {
    heading: 'Made for you',
    ready: 'What matters most for you comes first, and your plan before you sign is ready.',
    loading: 'Fitting this to your situation…',
    failed: 'We could not fit this to your situation yet.',
    button: 'See your plan',
    why: 'Why this matters for you:',
  },
  zh: {
    heading: '为你定制',
    ready: '对你最重要的内容排在前面，你的签约前计划也已准备好。',
    loading: '正在根据你的情况调整…',
    failed: '暂时无法根据你的情况调整。',
    button: '查看你的计划',
    why: '为什么这对你很重要：',
  },
  ms: {
    heading: 'Dibuat untuk anda',
    ready: 'Perkara yang paling penting untuk anda ditunjukkan dahulu, dan pelan anda sebelum menandatangani sudah sedia.',
    loading: 'Sedang disesuaikan dengan keadaan anda…',
    failed: 'Kami belum dapat menyesuaikannya dengan keadaan anda.',
    button: 'Lihat pelan anda',
    why: 'Mengapa ini penting untuk anda:',
  },
  ta: {
    heading: 'உங்களுக்காக உருவாக்கப்பட்டது',
    ready: 'உங்களுக்கு மிக முக்கியமானவை முதலில் காட்டப்படுகின்றன, கையெழுத்திடும் முன் உங்கள் திட்டம் தயாராக உள்ளது.',
    loading: 'உங்கள் நிலைமைக்கு ஏற்ப மாற்றப்படுகிறது…',
    failed: 'உங்கள் நிலைமைக்கு ஏற்ப இன்னும் மாற்ற முடியவில்லை.',
    button: 'உங்கள் திட்டத்தைப் பார்க்கவும்',
    why: 'இது உங்களுக்கு ஏன் முக்கியம்:',
  },
};
const forYouWords = (c) => FOR_YOU_WORDS[c.language] || FOR_YOU_WORDS.en;

// A "Why this matters for you" line, with its label in the same language as the line: the
// translated line under a translated label, or the English line (until it's translated) in English.
const translatedWhy = (r, tr) => tr?.risks?.find((x) => x.index === r.index)?.why_for_you;

function whyLine(c, r, tr) {
  if (!r.why) return '';
  const translatedLine = translatedWhy(r, tr);
  const label = translatedLine ? forYouWords(c).why : FOR_YOU_WORDS.en.why;
  return `<span class="risk-why"${translatedLine ? ` lang="${c.language}"` : ''}><strong>${escapeHtml(label)}</strong> ${escapeHtml(translatedLine || r.why)}</span>`;
}

// "Made for you" banner at the top of the Overview when the user told us about themselves.
function forYouBanner(c) {
  if (!c.situation) return '';
  const w = forYouWords(c);
  const text = c.tailored ? w.ready : c.tailoredError ? w.failed : w.loading;
  return `
    <div class="for-you" lang="${FOR_YOU_WORDS[c.language] ? c.language : 'en'}">
      <span class="for-you-icon">${icons.sparkle}</span>
      <div class="for-you-body">
        <h2 class="for-you-title">${escapeHtml(w.heading)}</h2>
        <p class="for-you-text">${escapeHtml(text)}</p>
      </div>
      <button class="for-you-btn" type="button" data-jump-plan>${escapeHtml(w.button)}</button>
    </div>`;
}

// "Your plan before you sign" at the end of the Overview: 3-6 steps, each with its clause and
// somewhere to get help.
function planSection(c) {
  const head = `
    <div class="section-row" id="plan">
      <h2 class="h2">Your plan before you sign</h2>
      ${c.situation ? `<a class="section-link" href="#/contract/${c.id}/situation">Edit about you</a>` : ''}
    </div>`;
  if (c.tailoredError) {
    return `${head}${notice('error', c.tailoredError)}${retryButton('tailored')}`;
  }
  if (!c.tailored) {
    return `${head}
      <div class="card loading">
        <span class="spinner" aria-hidden="true"></span>
        <span>${c.risks ? 'Making your plan from your contract' : 'Your plan comes after the risk check'}${c.situation ? ' and what you told us' : ''}…</span>
      </div>`;
  }
  const { plan } = c.tailored;
  const tr = tailoredTr(c);
  const onlyContract = c.situation ? '' : `
    <p class="plan-note">Based on the contract only. <a href="#/contract/${c.id}/situation">Tell us about you</a> for a plan that fits you.</p>`;
  if (!plan.length) {
    return `${head}${onlyContract}
      <div class="card plan-empty"><p>We couldn't make steps we could check against your contract. Ask the chatbot, or a qualified professional, about anything unclear.</p></div>`;
  }
  const helpLink = (key) => {
    const h = HELP_LINKS[key] || HELP_LINKS.probono;
    const outside = h.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a class="help-chip" href="${h.href}"${outside}>${h.href.startsWith('tel:') ? icons.phone : icons.building} ${escapeHtml(h.label)}</a>`;
  };
  return `${head}${onlyContract}
    <ol class="list-card plan-list">
      ${plan.map((s, i) => pointRow(c, {
    lead: `<span class="step-num" aria-hidden="true">${i + 1}</span>`,
    title: s.checked === 'unclear' ? unclearHtml(c, s.clause_numbers) : escapeHtml(tr?.plan?.[i] || s.text),
    numbers: s.clause_numbers,
    after: `<div class="plan-help">Help: ${helpLink(s.help)}</div>`,
  })).join('')}
    </ol>`;
}

// The plan arrived while the Overview is open. Redraw it, unless the reader has a row open, in
// which case only the banner and the plan change (the new order shows next time).
function updateTailored(c) {
  if (!document.querySelector('button.point-row[aria-expanded="true"]')) {
    render();
    return;
  }
  const forYou = document.getElementById('for-you');
  if (forYou) forYou.innerHTML = forYouBanner(c);
  const slot = document.getElementById('plan-slot');
  if (slot) slot.innerHTML = planSection(c);
}

// "Your situation" screen: add or change the words later. Only the parts made for you change.
function renderSituation(c) {
  return `
    <p class="tab-lead">Tell us a little about you, in your own words. We show what matters most for you first, and make a plan before you sign.</p>
    <textarea class="situation-input" id="situation-edit" maxlength="${SITUATION_MAX}" rows="5" aria-label="Tell us about you"
      placeholder="${escapeHtml(SITUATION_HINT)}" aria-describedby="situation-note">${escapeHtml(c.situation || '')}</textarea>
    <p class="situation-note" id="situation-note">${icons.lock} ${escapeHtml(SITUATION_NOTE)} NRIC and bank numbers are hidden automatically.</p>
    <div id="situation-status" aria-live="polite"></div>
    <button class="btn btn-primary btn-block" type="button" data-save-situation>Save and update my plan</button>
    ${c.situation ? '<button class="btn btn-ghost btn-block" type="button" data-clear-situation>Clear what I wrote</button>' : ''}
    <p class="tab-foot">Only the parts made for you change. Your summary and warnings stay the same.</p>`;
}

async function saveSituation(c, text, button) {
  button.disabled = true;
  const status = document.getElementById('situation-status');
  if (status) status.innerHTML = notice('info', 'Saving…');
  try {
    const masked = hidePersonalNumbers(text.slice(0, SITUATION_MAX)).text.trim();
    const { situation } = await api(`contracts?id=${encodeURIComponent(c.id)}`, {
      method: 'PATCH', json: { situation: masked }, what: 'saving what you told us',
    });
    if (situation !== (c.situation || '')) {
      c.situation = situation;
      c.tailored = null;
      c.checks = null; // the new plan gets double-checked too (PRD FR10)
      delete c.tailoredError;
      for (const lang of Object.keys(c.translations || {})) delete c.translations[lang].tailored;
      for (const key of Object.keys(c.translateErrors || {})) if (key.endsWith(':tailored')) delete c.translateErrors[key];
    }
    location.hash = `#/contract/${c.id}/summary`;
  } catch (err) {
    button.disabled = false;
    if (status) status.innerHTML = notice('error', err.message);
  }
}

// ---------- Make it fail: two AIs work together in the background (PRD FR10) ----------
// Claude writes, NVIDIA checks, Claude fixes; the user sees only the final answer, with a small
// "✓ Checked twice" tick. The Summary and Risks tabs wait for it (with simple progress messages),
// but never more than 20 seconds for the check: after that, or if it fails, they show Claude's
// answer (which already passed the code checks) without the tick.

// Judge view, only with ?judge=1: a "Behind the scenes" panel shows what changed in this scan.
// Demo mode, only with ?demo=fail&judge=1: two mistakes are planted on purpose (notice period
// 30 -> 3 days, the S$350 fee warning left out) so the catch can be shown reliably.
const URL_FLAGS = new URLSearchParams(location.search);
const JUDGE = URL_FLAGS.get('judge') === '1';
const DEMO_FAIL = JUDGE && URL_FLAGS.get('demo') === 'fail';
const demoParam = () => (DEMO_FAIL ? '&demo=fail' : '');
const isDemoContract = (c) => Boolean(c.checks?.demo || c.risks?.demo || (c.summary || []).some((s) => s.demo_mistake));
const CHECK_WAIT_MS = 20000;

// Fixed wording, in the language chosen for explanations. (Tamil still needs a native speaker's check.)
const CHECK_WORDS = {
  en: {
    reading: 'Reading your contract…', finding: 'Finding what matters…', checking: 'Double-checking everything…',
    tick: 'Checked twice',
    unclear: 'This part is hard to explain. Read the clause or ask an expert.',
    behind: 'Behind the scenes', behindIntro: 'What the two AIs did on this scan. Users don\'t see this panel.',
    ai1: 'AI 1 (Claude) wrote', ai2: (who) => `AI 2 (${who}) caught`, ai2Found: (who) => `AI 2 (${who}) found a risk AI 1 missed`,
    ai2Doubt: (who) => `AI 2 (${who}) questioned this scam sign`, final: 'Final answer',
    keptScam: 'Kept as it is: the scam sign is in the contract\'s own words, so it can be questioned but not weakened.',
    hard: 'Shown as the clause itself, with "This part is hard to explain".',
    planted: 'Planted mistake', nvidia: 'NVIDIA', claudeBackup: 'Claude, as backup',
    nothing: 'AI 2 checked every item and found nothing to change on this scan.',
    notYet: 'The double check hasn\'t finished for this scan. Open it again in a minute.',
    timing: (who, s) => `Checked by ${who} in ${s}s.`,
    demo: 'Demo: 2 mistakes planted on purpose', demoNote: 'The notice period was changed from 30 to 3 days and the S$350 fee warning was left out, to show AI 2 catching them.',
  },
  zh: {
    reading: '正在读取你的合同…', finding: '正在找出重点…', checking: '正在再检查一遍…',
    tick: '已检查两次',
    unclear: '这一部分很难解释。请阅读条款原文，或咨询专家。',
    behind: '幕后过程', behindIntro: '这次扫描中两个 AI 做了什么。普通用户看不到这个面板。',
    ai1: 'AI 1（Claude）写的是', ai2: (who) => `AI 2（${who}）发现`, ai2Found: (who) => `AI 2（${who}）发现了 AI 1 漏掉的风险`,
    ai2Doubt: (who) => `AI 2（${who}）质疑这个诈骗迹象`, final: '最终答案',
    keptScam: '保持不变：这个诈骗迹象来自合同原文，可以被质疑，但不能被削弱。',
    hard: '直接显示条款原文，并注明“这一部分很难解释”。',
    planted: '故意加入的错误', nvidia: 'NVIDIA', claudeBackup: 'Claude（备用）',
    nothing: 'AI 2 检查了每一项，这次扫描没有需要修改的地方。',
    notYet: '这次扫描的复查还没完成。请过一分钟再打开。',
    timing: (who, s) => `由 ${who} 检查，用时 ${s} 秒。`,
    demo: '演示：故意加入了 2 个错误', demoNote: '通知期从 30 天改成了 3 天，并删掉了 S$350 费用的警告，用来展示 AI 2 如何发现它们。',
  },
  ms: {
    reading: 'Membaca kontrak anda…', finding: 'Mencari perkara penting…', checking: 'Menyemak semula semuanya…',
    tick: 'Disemak dua kali',
    unclear: 'Bahagian ini sukar diterangkan. Baca fasal itu atau tanya pakar.',
    behind: 'Di sebalik tabir', behindIntro: 'Apa yang dilakukan oleh dua AI pada imbasan ini. Pengguna biasa tidak melihat panel ini.',
    ai1: 'AI 1 (Claude) menulis', ai2: (who) => `AI 2 (${who}) mengesan`, ai2Found: (who) => `AI 2 (${who}) menemui risiko yang terlepas oleh AI 1`,
    ai2Doubt: (who) => `AI 2 (${who}) mempersoalkan tanda penipuan ini`, final: 'Jawapan akhir',
    keptScam: 'Dikekalkan: tanda penipuan ini ada dalam perkataan kontrak sendiri, jadi ia boleh dipersoalkan tetapi tidak dilemahkan.',
    hard: 'Ditunjukkan sebagai fasal itu sendiri, dengan "Bahagian ini sukar diterangkan".',
    planted: 'Kesilapan yang sengaja dimasukkan', nvidia: 'NVIDIA', claudeBackup: 'Claude, sebagai sandaran',
    nothing: 'AI 2 menyemak setiap perkara dan tidak menemui apa-apa untuk diubah pada imbasan ini.',
    notYet: 'Semakan kedua untuk imbasan ini belum selesai. Buka semula dalam seminit.',
    timing: (who, s) => `Disemak oleh ${who} dalam ${s} saat.`,
    demo: 'Demo: 2 kesilapan sengaja dimasukkan', demoNote: 'Tempoh notis ditukar daripada 30 kepada 3 hari dan amaran yuran S$350 dibuang, untuk menunjukkan AI 2 mengesannya.',
  },
  ta: {
    reading: 'உங்கள் ஒப்பந்தம் படிக்கப்படுகிறது…', finding: 'முக்கியமானவை கண்டறியப்படுகின்றன…', checking: 'அனைத்தும் மீண்டும் சரிபார்க்கப்படுகிறது…',
    tick: 'இருமுறை சரிபார்க்கப்பட்டது',
    unclear: 'இந்தப் பகுதியை விளக்குவது கடினம். பிரிவைப் படியுங்கள் அல்லது நிபுணரிடம் கேளுங்கள்.',
    behind: 'திரைக்குப் பின்னால்', behindIntro: 'இந்த ஸ்கேனில் இரண்டு AI களும் செய்தவை. பயனர்கள் இந்தப் பகுதியைப் பார்ப்பதில்லை.',
    ai1: 'AI 1 (Claude) எழுதியது', ai2: (who) => `AI 2 (${who}) கண்டுபிடித்தது`, ai2Found: (who) => `AI 1 தவறவிட்ட அபாயத்தை AI 2 (${who}) கண்டுபிடித்தது`,
    ai2Doubt: (who) => `AI 2 (${who}) இந்த மோசடி அறிகுறியைக் கேள்வி கேட்டது`, final: 'இறுதிப் பதில்',
    keptScam: 'அப்படியே வைக்கப்பட்டது: இந்த மோசடி அறிகுறி ஒப்பந்தத்தின் சொந்த வார்த்தைகளில் உள்ளது, எனவே கேள்வி கேட்கலாம், ஆனால் பலவீனப்படுத்த முடியாது.',
    hard: 'பிரிவே காட்டப்படுகிறது, "இந்தப் பகுதியை விளக்குவது கடினம்" என்ற குறிப்புடன்.',
    planted: 'வேண்டுமென்றே சேர்த்த தவறு', nvidia: 'NVIDIA', claudeBackup: 'Claude, மாற்றாக',
    nothing: 'AI 2 ஒவ்வொன்றையும் சரிபார்த்தது; இந்த ஸ்கேனில் மாற்ற வேண்டியது எதுவும் இல்லை.',
    notYet: 'இந்த ஸ்கேனின் இரண்டாவது சரிபார்ப்பு இன்னும் முடியவில்லை. ஒரு நிமிடம் கழித்து மீண்டும் திறக்கவும்.',
    timing: (who, s) => `${who} ${s} வினாடிகளில் சரிபார்த்தது.`,
    demo: 'டெமோ: 2 தவறுகள் வேண்டுமென்றே சேர்க்கப்பட்டன', demoNote: 'AI 2 அவற்றைக் கண்டுபிடிப்பதைக் காட்ட, அறிவிப்புக் காலம் 30 இலிருந்து 3 நாட்களாக மாற்றப்பட்டு, S$350 கட்டண எச்சரிக்கை நீக்கப்பட்டது.',
  },
};
const checkWords = (c) => CHECK_WORDS[c?.language] || CHECK_WORDS.en;

// "checked": the double check finished and its answer is shown (with the tick). "unchecked": it
// took over 20s or failed, so Claude's answer is shown without the tick. null: still waiting.
function finalState(c) {
  if (c.final) return c.final;
  if (c.checks?.stage === 'done') return 'checked';
  if (c.summary && c.risksError) return 'unchecked';
  return null;
}

// While the Summary or Risks tab waits for the final answer: simple progress messages. In Chinese,
// Malay or Tamil it also waits for that part's translation, so the answer appears in one go.
// Returns '' once there is something to show.
function waitingCard(c, part) {
  if (!c.summary && !c.summaryError) loadAi(c, 'summary');
  if (!c.risks && !c.risksError) loadAi(c, 'risks');
  const w = checkWords(c);
  let step = 0;
  if (!finalState(c)) {
    step = !c.summary ? 0 : !c.risks || (!c.tailored && !c.tailoredError) ? 1 : 2;
  } else if (c.language && c.language !== 'en' && untranslated(c, part).length) {
    untranslated(c, part).forEach((p) => loadTranslation(c, p));
    step = 2;
  } else {
    return '';
  }
  const steps = [w.reading, w.finding, w.checking];
  return `
    <div class="card wait-card" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <p class="wait-now">${escapeHtml(steps[step])}</p>
      <ol class="wait-steps">${steps.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'now' : ''}">${i < step ? icons.check : ''}<span>${escapeHtml(s)}</span></li>`).join('')}</ol>
    </div>`;
}

// The parts a tab shows that still need translating: its own part, and the plan steps and
// "Why this matters" lines (if any). A part whose translation failed is shown in English.
function untranslated(c, part) {
  const t = c.tailored;
  const hasTailored = t && (t.plan?.length || t.risks?.some((r) => r.why_for_you));
  return [part, ...(hasTailored ? ['tailored'] : [])]
    .filter((p) => (p === 'tailored' ? t : c[p]) && !translated(c, p) && !c.translateErrors?.[`${c.id}:${c.language}:${p}`]);
}

// The small tick at the top of the Summary and Risks tabs: no details, no mention of two AIs.
function checkedTick(c) {
  return finalState(c) === 'checked' ? `<p class="checked-tick">${icons.check} ${escapeHtml(checkWords(c).tick)}</p>` : '';
}

// The clause itself, in place of an explanation that couldn't be made right.
function unclearHtml(c, numbers) {
  const cl = c.clauses?.find((x) => x.number === numbers?.[0]);
  const text = cl ? cl.text.replace(/\s+/g, ' ').slice(0, 260) : '';
  return `<span class="unclear-note">${escapeHtml(checkWords(c).unclear)}</span>${text ? `<span class="unclear-clause">“${escapeHtml(text)}${cl.text.length > 260 ? '…' : ''}”</span>` : ''}`;
}

// Judge view only (?judge=1): what really happened on this scan, under the final results.
function behindScenes(c) {
  if (!JUDGE) return '';
  const w = checkWords(c);
  const ch = c.checks;
  const demo = isDemoContract(c)
    ? `<div class="demo-label" role="note"><strong>${escapeHtml(w.demo)}</strong> ${escapeHtml(w.demoNote)}</div>` : '';
  if (!ch || ch.stage !== 'done') return `<section class="behind">${demo}<h2 class="h2">${escapeHtml(w.behind)}</h2><p class="behind-intro">${escapeHtml(w.notYet)}</p></section>`;
  const who = ch.checker === 'nvidia' ? w.nvidia : w.claudeBackup;
  const whoMissed = (ch.missed_checker || ch.checker) === 'nvidia' ? w.nvidia : w.claudeBackup;
  const seconds = (((ch.check_ms || 0) + (ch.fix_ms || 0)) / 1000).toFixed(0);
  const step = (label, body, cls = '') => `<div class="behind-step ${cls}"><span class="behind-label">${escapeHtml(label)}</span><span>${body}</span></div>`;
  // The final answer as the user sees it: translated, if the results above are. (On the Summary tab
  // the warnings' translation may not have been asked for yet.)
  if (c.language && c.language !== 'en') ['risks', 'tailored'].filter((p) => c[p] && !translated(c, p)).forEach((p) => loadTranslation(c, p));
  const finalText = (r) => {
    const [part, n] = String(r.id).split(':');
    const i = Number(n);
    if (part === 'summary') return translated(c, 'summary')?.[i]?.plain_text || r.after;
    if (part === 'risk') {
      const t = translated(c, 'risks')?.[i];
      return t?.title ? `${t.title}. ${t.explanation || ''}`.trim() : r.after;
    }
    return tailoredTr(c)?.plan?.[i] || r.after;
  };
  const rows = (ch.results || []).map((r) => {
    const where = r.clause_numbers?.length ? escapeHtml(r.clause_numbers.map(clauseLabel).join(', ')) : '';
    const final = r.status === 'fixed' ? escapeHtml(finalText(r) || '') : r.status === 'disputed' ? escapeHtml(w.keptScam) : escapeHtml(w.hard);
    return `
      <li class="behind-item">
        <div class="behind-head">${r.planted ? `<span class="planted-pill">${escapeHtml(w.planted)}</span>` : ''}<span class="behind-where">${where}</span></div>
        ${r.added ? step(w.ai2Found(whoMissed), escapeHtml(r.reason || ''), 'caught')
    : `${step(w.ai1, escapeHtml(r.before || ''), 'wrote')}${step(r.status === 'disputed' ? w.ai2Doubt(who) : w.ai2(who), escapeHtml(r.reason || ''), 'caught')}`}
        ${step(w.final, final, 'final')}
      </li>`;
  });
  return `
    <section class="behind">
      ${demo}
      <h2 class="h2">${escapeHtml(w.behind)}</h2>
      <p class="behind-intro">${escapeHtml(w.behindIntro)} ${escapeHtml(w.timing(who, seconds))}</p>
      ${rows.length ? `<ol class="behind-list">${rows.join('')}</ol>` : `<p class="behind-intro">${escapeHtml(w.nothing)}</p>`}
    </section>`;
}

// Runs the double check once the summary, risks and plan are ready: step 1 (the check), then
// step 2 (the fixes) if anything was found; each is its own function call. The tabs wait for it
// for up to 20 seconds; after that (or if it fails) they show Claude's answer without the tick.
// The server still finishes and saves the check, so the next time this contract opens it's checked.
const checkRequests = new Set();
async function loadCheck(c) {
  if (checkRequests.has(c.id) || !c.summary || !c.risks || finalState(c)) return;
  checkRequests.add(c.id);
  const show = (state) => {
    if (c.final) return;
    c.final = state;
    refreshContractsList(); // the status and dates on desktop Home change now
    const { name, params } = parseRoute();
    if (name === 'contract' && params[0] === c.id) render();
  };
  const giveUp = setTimeout(() => show('unchecked'), CHECK_WAIT_MS);
  try {
    let { checks } = await api(`check?id=${encodeURIComponent(c.id)}&step=check`, { method: 'POST', what: 'double-checking' });
    let data = null;
    if (checks?.stage === 'checked') {
      data = await api(`check?id=${encodeURIComponent(c.id)}&step=fix`, { method: 'POST', what: 'double-checking' });
      checks = data.checks;
    }
    if (c.final) return; // already showing Claude's answer: no change under the reader
    for (const part of ['summary', 'risks', 'tailored']) {
      if (data?.[part] && JSON.stringify(data[part]) !== JSON.stringify(c[part])) {
        for (const lang of Object.keys(c.translations || {})) delete c.translations[lang][part];
        c[part] = data[part];
      }
    }
    c.checks = checks;
    show(checks?.stage === 'done' ? 'checked' : 'unchecked');
  } catch (err) {
    console.warn('Double check failed:', err.message);
    show('unchecked');
  } finally {
    clearTimeout(giveUp);
    checkRequests.delete(c.id);
  }
}

// ---------- You decide (PRD FR8, styled after mockup 6) ----------

// Every label on "You decide" and the marks on the Risks tab, in each language the app explains in.
// Fixed wording, not AI, so the options and next steps never depend on the AI. (Tamil still needs a
// native speaker's check, like the other Tamil text.)
const DECIDE_WORDS = {
  en: {
    marks: { ask: 'I\'ll ask about this', ok: 'I\'m OK with this', wrong: 'This looks wrong' },
    disagreed: 'You disagreed',
    title: 'You decide',
    cardText: 'Your marked points, a draft message and your options. The choice is yours.',
    headerSub: 'We help you get ready. You make the call.',
    toAsk: (n) => `${n} to ask about`,
    askHeading: 'What you\'ll ask about',
    noMarks: 'Mark a warning "I\'ll ask about this" on the Risks tab to get a draft message.',
    goRisks: 'Go to Risks',
    messageHeading: (to) => `Your message to ${to}`,
    to: { job_offer: 'the employer', rental: 'the landlord', phone_subscription: 'the telco', loan: 'the lender', business: 'the other company', other: 'the other party' },
    draftLabel: 'AI draft – check and edit before sending',
    drafting: 'Writing your draft message… about 5 to 15 seconds',
    makeDraft: 'Make the draft',
    newDraft: 'Make a new draft',
    replaceDraft: 'Make a new draft? It replaces this one, including your edits.',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Could not copy. Select the text and copy it yourself.',
    saved: 'Saved',
    marksChanged: 'You changed your marks since this draft. Make a new draft to include them.',
    noSend: 'ClauseWise SG never sends anything for you. Copy it into your own email or chat.',
    plainLabel: 'What this message says (not for sending)',
    plainOutdated: 'You changed the message. Tap Update to see what it says now.',
    update: 'Update',
    explaining: 'Explaining your message…',
    optionsHeading: 'Your options',
    pickNote: 'Tap one to note your choice. You can change it any time.',
    options: { sign: 'Sign', negotiate: 'Negotiate first', expert: 'Get expert help', walk_away: 'Walk away' },
    next: {
      sign: 'Keep a signed copy for yourself, and screenshots of your messages with them.',
      negotiate: 'Send your message above, and get their answers in writing before you sign.',
      expert: 'Ask a professional to look at your contract before you sign:',
      walk_away: 'You don\'t have to sign. If you were asked to pay anything, call ScamShield 1799 to check.',
    },
    yourCall: 'ClauseWise SG points out what to check. You make the call. Not legal advice.',
    bigDecision: 'For a big decision, get a qualified professional to review the contract.',
    openDecide: 'Open You decide',
  },
  zh: {
    marks: { ask: '我会问这个', ok: '我可以接受', wrong: '这看起来不对' },
    disagreed: '你不同意',
    title: '由你决定',
    cardText: '你标记的问题、草稿信息和你的选择。决定权在你。',
    headerSub: '我们帮你做好准备，由你做决定。',
    toAsk: (n) => `${n} 个问题要问`,
    askHeading: '你要问的问题',
    noMarks: '在“风险”页把警告标记为“我会问这个”，就能得到草稿信息。',
    goRisks: '去风险页',
    messageHeading: (to) => `给${to}的信息`,
    to: { job_offer: '雇主', rental: '房东', phone_subscription: '电信公司', loan: '贷款方', business: '对方公司', other: '对方' },
    draftLabel: 'AI 草稿 – 发送前请检查和修改',
    drafting: '正在写你的草稿信息… 大约 5 到 15 秒',
    makeDraft: '生成草稿',
    newDraft: '重新生成草稿',
    replaceDraft: '重新生成草稿？这会替换现在的草稿，包括你的修改。',
    copy: '复制',
    copied: '已复制',
    copyFailed: '无法复制。请自己选中文字再复制。',
    saved: '已保存',
    marksChanged: '你在这份草稿之后改了标记。重新生成草稿就能包括它们。',
    noSend: 'ClauseWise SG 不会替你发送任何东西。请把它复制到你自己的电邮或聊天里。',
    plainLabel: '这条信息在说什么（不用发送）',
    plainOutdated: '你改了信息。点“更新”看看它现在在说什么。',
    update: '更新',
    explaining: '正在解释你的信息…',
    optionsHeading: '你的选择',
    pickNote: '点一个记下你的选择，随时可以更改。',
    options: { sign: '签约', negotiate: '先谈条件', expert: '找专家帮忙', walk_away: '不签了' },
    next: {
      sign: '自己留一份签好的副本，并保存你和他们的聊天截图。',
      negotiate: '发送上面的信息，在签约前拿到他们的书面答复。',
      expert: '签约前请专业人士看看你的合同：',
      walk_away: '你不一定要签。如果对方要你付钱，请打 ScamShield 1799 核实。',
    },
    yourCall: 'ClauseWise SG 指出需要检查的地方，由你做决定。这不是法律意见。',
    bigDecision: '如果是重大决定，请找合格的专业人士审阅合同。',
    openDecide: '打开“由你决定”',
  },
  ms: {
    marks: { ask: 'Saya akan tanya', ok: 'Saya OK dengan ini', wrong: 'Ini nampak salah' },
    disagreed: 'Anda tidak bersetuju',
    title: 'Anda yang tentukan',
    cardText: 'Perkara yang anda tandakan, draf mesej dan pilihan anda. Keputusan di tangan anda.',
    headerSub: 'Kami bantu anda bersedia. Anda yang buat keputusan.',
    toAsk: (n) => `${n} perkara untuk ditanya`,
    askHeading: 'Perkara yang anda akan tanya',
    noMarks: 'Tandakan amaran "Saya akan tanya" di tab Risiko untuk mendapat draf mesej.',
    goRisks: 'Pergi ke Risiko',
    messageHeading: (to) => `Mesej anda kepada ${to}`,
    to: { job_offer: 'majikan', rental: 'tuan rumah', phone_subscription: 'syarikat telco', loan: 'pemberi pinjaman', business: 'syarikat lain', other: 'pihak lain' },
    draftLabel: 'Draf AI – semak dan ubah sebelum dihantar',
    drafting: 'Sedang menulis draf mesej anda… kira-kira 5 hingga 15 saat',
    makeDraft: 'Buat draf',
    newDraft: 'Buat draf baharu',
    replaceDraft: 'Buat draf baharu? Ia menggantikan draf ini, termasuk perubahan anda.',
    copy: 'Salin',
    copied: 'Disalin',
    copyFailed: 'Tidak dapat menyalin. Pilih teks dan salin sendiri.',
    saved: 'Disimpan',
    marksChanged: 'Anda menukar tanda selepas draf ini dibuat. Buat draf baharu untuk memasukkannya.',
    noSend: 'ClauseWise SG tidak akan menghantar apa-apa untuk anda. Salin ke e-mel atau sembang anda sendiri.',
    plainLabel: 'Apa yang dikatakan mesej ini (bukan untuk dihantar)',
    plainOutdated: 'Anda telah mengubah mesej. Tekan Kemas kini untuk melihat maksudnya sekarang.',
    update: 'Kemas kini',
    explaining: 'Sedang menerangkan mesej anda…',
    optionsHeading: 'Pilihan anda',
    pickNote: 'Tekan satu untuk mencatat pilihan anda. Anda boleh menukarnya bila-bila masa.',
    options: { sign: 'Tandatangan', negotiate: 'Berunding dahulu', expert: 'Dapatkan bantuan pakar', walk_away: 'Tolak' },
    next: {
      sign: 'Simpan satu salinan yang telah ditandatangani, dan tangkapan skrin mesej anda dengan mereka.',
      negotiate: 'Hantar mesej anda di atas, dan dapatkan jawapan mereka secara bertulis sebelum menandatangani.',
      expert: 'Minta profesional menyemak kontrak anda sebelum menandatangani:',
      walk_away: 'Anda tidak perlu menandatangani. Jika anda diminta membayar apa-apa, hubungi ScamShield 1799 untuk menyemak.',
    },
    yourCall: 'ClauseWise SG menunjukkan perkara yang perlu diperiksa. Anda yang buat keputusan. Bukan nasihat undang-undang.',
    bigDecision: 'Untuk keputusan besar, minta profesional yang layak menyemak kontrak ini.',
    openDecide: 'Buka Anda yang tentukan',
  },
  ta: {
    marks: { ask: 'இதைப் பற்றிக் கேட்பேன்', ok: 'இது எனக்குச் சரி', wrong: 'இது தவறாகத் தெரிகிறது' },
    disagreed: 'நீங்கள் உடன்படவில்லை',
    title: 'நீங்களே முடிவு செய்யுங்கள்',
    cardText: 'நீங்கள் குறித்தவை, வரைவுச் செய்தி மற்றும் உங்கள் தேர்வுகள். முடிவு உங்களுடையது.',
    headerSub: 'நீங்கள் தயாராக உதவுகிறோம். முடிவு உங்களுடையது.',
    toAsk: (n) => `கேட்க ${n} விஷயங்கள்`,
    askHeading: 'நீங்கள் கேட்கப் போவது',
    noMarks: 'வரைவுச் செய்தியைப் பெற, அபாயங்கள் பக்கத்தில் ஒரு எச்சரிக்கையை "இதைப் பற்றிக் கேட்பேன்" எனக் குறிக்கவும்.',
    goRisks: 'அபாயங்களுக்குச் செல்',
    messageHeading: (to) => `${to} க்கு உங்கள் செய்தி`,
    to: { job_offer: 'முதலாளி', rental: 'வீட்டு உரிமையாளர்', phone_subscription: 'தொலைத்தொடர்பு நிறுவனம்', loan: 'கடன் வழங்குநர்', business: 'மற்ற நிறுவனம்', other: 'மற்ற தரப்பு' },
    draftLabel: 'AI வரைவு – அனுப்பும் முன் சரிபார்த்துத் திருத்தவும்',
    drafting: 'உங்கள் வரைவுச் செய்தி எழுதப்படுகிறது… சுமார் 5 முதல் 15 வினாடிகள்',
    makeDraft: 'வரைவை உருவாக்கு',
    newDraft: 'புதிய வரைவை உருவாக்கு',
    replaceDraft: 'புதிய வரைவை உருவாக்கவா? இது உங்கள் திருத்தங்கள் உட்பட இந்த வரைவை மாற்றிவிடும்.',
    copy: 'நகலெடு',
    copied: 'நகலெடுக்கப்பட்டது',
    copyFailed: 'நகலெடுக்க முடியவில்லை. உரையைத் தேர்ந்தெடுத்து நீங்களே நகலெடுக்கவும்.',
    saved: 'சேமிக்கப்பட்டது',
    marksChanged: 'இந்த வரைவுக்குப் பிறகு உங்கள் குறிப்புகளை மாற்றியுள்ளீர்கள். அவற்றைச் சேர்க்க புதிய வரைவை உருவாக்கவும்.',
    noSend: 'ClauseWise SG உங்களுக்காக எதையும் அனுப்பாது. உங்கள் சொந்த மின்னஞ்சல் அல்லது அரட்டையில் நகலெடுக்கவும்.',
    plainLabel: 'இந்தச் செய்தி என்ன சொல்கிறது (அனுப்புவதற்கு அல்ல)',
    plainOutdated: 'நீங்கள் செய்தியை மாற்றியுள்ளீர்கள். இப்போது அது என்ன சொல்கிறது என்று பார்க்க புதுப்பி என்பதைத் தட்டவும்.',
    update: 'புதுப்பி',
    explaining: 'உங்கள் செய்தி விளக்கப்படுகிறது…',
    optionsHeading: 'உங்கள் தேர்வுகள்',
    pickNote: 'உங்கள் தேர்வைக் குறிக்க ஒன்றைத் தட்டவும். எப்போது வேண்டுமானாலும் மாற்றலாம்.',
    options: { sign: 'கையெழுத்திடு', negotiate: 'முதலில் பேச்சுவார்த்தை', expert: 'நிபுணர் உதவி பெறு', walk_away: 'வேண்டாம்' },
    next: {
      sign: 'கையெழுத்திட்ட ஒரு நகலை உங்களிடம் வைத்திருங்கள், அவர்களுடனான உங்கள் செய்திகளின் திரைப்பிடிப்புகளையும் வைத்திருங்கள்.',
      negotiate: 'மேலே உள்ள செய்தியை அனுப்புங்கள், கையெழுத்திடும் முன் அவர்களின் பதில்களை எழுத்து மூலம் பெறுங்கள்.',
      expert: 'கையெழுத்திடும் முன் ஒரு நிபுணரிடம் உங்கள் ஒப்பந்தத்தைப் பார்க்கச் சொல்லுங்கள்:',
      walk_away: 'நீங்கள் கையெழுத்திட வேண்டியதில்லை. பணம் செலுத்தச் சொன்னால், சரிபார்க்க ScamShield 1799 ஐ அழைக்கவும்.',
    },
    yourCall: 'ClauseWise SG சரிபார்க்க வேண்டியவற்றைக் காட்டுகிறது. முடிவு உங்களுடையது. இது சட்ட ஆலோசனை அல்ல.',
    bigDecision: 'பெரிய முடிவுக்கு, தகுதியான நிபுணரிடம் ஒப்பந்தத்தைச் சரிபார்க்கச் சொல்லுங்கள்.',
    openDecide: '"நீங்களே முடிவு செய்யுங்கள்" திற',
  },
};
const decideWords = (c) => DECIDE_WORDS[c.language] || DECIDE_WORDS.en;
const langAttr = (c) => (DECIDE_WORDS[c.language] ? c.language : 'en');

const MARK_ORDER = ['ask', 'ok', 'wrong'];
const CHOICE_ORDER = ['sign', 'negotiate', 'expert', 'walk_away'];
// The help links each option shows, from the app's fixed list (never from the AI).
const CHOICE_HELP = { sign: [], negotiate: [], expert: ['mom', 'tadm', 'probono', 'case'], walk_away: ['scamshield'] };

const markOf = (c, index) => c.decisions?.risks?.[index] || null;

// The three buttons under a warning on the Risks tab. Nothing is selected at first; tapping the
// selected one again clears it.
function markButtons(c, r) {
  const w = decideWords(c);
  return `
    <div class="mark-row" role="group" aria-label="${escapeHtml(w.title)}" lang="${langAttr(c)}">
      ${MARK_ORDER.map((m) => `
        <button class="mark-btn mark-${m}" type="button" data-mark="${m}" data-index="${r.index}" aria-pressed="${markOf(c, r.index) === m}">${escapeHtml(w.marks[m])}</button>`).join('')}
    </div>`;
}

// The way into "You decide", at the end of the Summary and Risks tabs.
function decideCard(c) {
  const w = decideWords(c);
  const asks = Object.values(c.decisions?.risks || {}).filter((m) => m === 'ask').length;
  return `
    <a class="decide-card" href="#/contract/${c.id}/decide" lang="${langAttr(c)}">
      <span class="decide-card-icon">${icons.check}</span>
      <span class="decide-card-body">
        <span class="decide-card-title">${escapeHtml(w.title)}</span>
        <span class="decide-card-text">${escapeHtml(asks ? `${w.toAsk(asks)} · ${w.cardText}` : w.cardText)}</span>
      </span>
      ${icons.chevSmall}
    </a>`;
}

// The draft and its plain-words version, kept apart so typing in the draft doesn't redraw it.
function draftSection(c, asks) {
  const w = decideWords(c);
  const d = c.decisions || {};
  const head = `<h2 class="h2 decide-h2">${escapeHtml(w.messageHeading(w.to[c.contract_type] || w.to.other))}</h2>`;
  if (!asks.length) return '';
  if (c.draftBusy) {
    return `${head}<div class="card loading"><span class="spinner" aria-hidden="true"></span><span>${escapeHtml(w.drafting)}</span></div>`;
  }
  if (c.draftError) {
    return `${head}${notice('error', c.draftError)}<button class="btn btn-primary btn-block" type="button" data-make-draft>${escapeHtml(w.makeDraft)}</button>`;
  }
  if (!d.message) {
    return `${head}<button class="btn btn-primary btn-block" type="button" data-make-draft>${icons.sparkle} ${escapeHtml(w.makeDraft)}</button>`;
  }
  const askIdx = asks.map((r) => r.index).sort((a, b) => a - b).join(',');
  const marksChanged = (d.draft_for || []).slice().sort((a, b) => a - b).join(',') !== askIdx;
  return `${head}
    ${marksChanged ? notice('info', w.marksChanged) : ''}
    <div class="card draft-card">
      <p class="draft-label">${icons.sparkle} ${escapeHtml(w.draftLabel)}</p>
      <textarea class="draft-text" id="draft-text" lang="en" rows="10" aria-label="${escapeHtml(w.draftLabel)}">${escapeHtml(d.message)}</textarea>
      ${d.message_unchecked ? '<p class="draft-note">Check this part against the contract</p>' : ''}
      <div class="draft-status" id="draft-status" aria-live="polite"></div>
      <div class="draft-actions">
        <button class="btn btn-primary" type="button" data-copy-draft>${icons.doc} ${escapeHtml(w.copy)}</button>
        <button class="btn btn-secondary" type="button" data-new-draft>${icons.sparkle} ${escapeHtml(w.newDraft)}</button>
      </div>
      <p class="draft-note">${escapeHtml(w.noSend)}</p>
    </div>
    <div id="plain-slot">${plainSection(c)}</div>`;
}

// "What this message says (not for sending)", only for Chinese, Malay or Tamil.
function plainSection(c) {
  if (!c.language || c.language === 'en') return '';
  const w = decideWords(c);
  const d = c.decisions || {};
  const plain = d.message_plain?.lang === c.language ? d.message_plain.text : '';
  const outdated = !plain || d.plain_outdated;
  let body;
  if (c.plainBusy) body = `<p class="plain-text"><span class="spinner" aria-hidden="true"></span> ${escapeHtml(w.explaining)}</p>`;
  else {
    body = `${plain ? `<p class="plain-text">${escapeHtml(plain)}</p>` : ''}
      ${c.plainError ? notice('error', c.plainError) : ''}
      ${outdated ? `${plain ? `<p class="plain-outdated">${escapeHtml(w.plainOutdated)}</p>` : ''}
        <button class="btn btn-secondary" type="button" data-update-plain>${escapeHtml(w.update)}</button>` : ''}`;
  }
  return `
    <div class="card plain-card" lang="${c.language}">
      <p class="plain-label">${escapeHtml(w.plainLabel)}</p>
      ${body}
    </div>`;
}

// Four options, same size and style, in a fixed order. None is picked or recommended; the chosen
// one shows fixed next-step text and help links from the app's own list.
function optionsSection(c) {
  const w = decideWords(c);
  const choice = c.decisions?.choice || null;
  const helpLink = (key) => {
    const h = HELP_LINKS[key];
    const outside = h.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a class="help-chip" href="${h.href}"${outside}>${h.href.startsWith('tel:') ? icons.phone : icons.building} ${escapeHtml(h.label)}</a>`;
  };
  return `
    <h2 class="h2 decide-h2">${escapeHtml(w.optionsHeading)}</h2>
    <p class="decide-note">${escapeHtml(w.pickNote)}</p>
    <div class="choice-grid" role="group" aria-label="${escapeHtml(w.optionsHeading)}">
      ${CHOICE_ORDER.map((k) => `
        <button class="choice-btn" type="button" data-choice="${k}" aria-pressed="${choice === k}">${escapeHtml(w.options[k])}</button>`).join('')}
    </div>
    ${choice ? `
      <div class="card choice-next" role="status">
        <p><strong>${escapeHtml(w.options[choice])}:</strong> ${escapeHtml(w.next[choice])}</p>
        ${CHOICE_HELP[choice].length ? `<div class="choice-help">${CHOICE_HELP[choice].map(helpLink).join('')}</div>` : ''}
      </div>` : ''}`;
}

function renderDecide(c) {
  const w = decideWords(c);
  if (!c.risks) {
    if (!c.risksError) loadAi(c, 'risks');
    return c.risksError
      ? `${notice('error', c.risksError)}${retryButton('risks')}`
      : `<div class="card loading"><span class="spinner" aria-hidden="true"></span><span>Checking your contract for warning signs first…</span></div>`;
  }
  const tr = translated(c, 'risks');
  const asks = riskList(c).filter((r) => markOf(c, r.index) === 'ask');
  // First visit with points marked: make the draft straight away.
  if (asks.length && !c.decisions?.message && !c.draftBusy && !c.draftError) makeDraft(c);
  return `
    <div lang="${langAttr(c)}">
      <section class="decide-head">
        <span class="decide-count" aria-hidden="true">${asks.length}</span>
        <div>
          <h1 class="decide-title">${escapeHtml(w.title)}</h1>
          <p class="decide-sub">${escapeHtml(w.headerSub)}</p>
          <span class="decide-pill">${escapeHtml(w.toAsk(asks.length))}</span>
        </div>
      </section>

      <h2 class="h2 decide-h2">${escapeHtml(w.askHeading)}</h2>
      ${asks.length ? `
        <ul class="list-card ask-list">
          ${asks.map((r) => `
            <li class="ask-item">
              <span class="ask-dot lvl-${r.level}" aria-hidden="true"></span>
              <span class="ask-text">${escapeHtml(tr?.[r.index]?.title || r.title)}</span>
              <a class="clause-chip lvl-${r.level}" href="#/contract/${c.id}/doc/${r.index}">${escapeHtml(shortRef(r.clause_numbers[0]))}</a>
            </li>`).join('')}
        </ul>` : `
        <div class="card decide-empty">
          <p>${escapeHtml(w.noMarks)}</p>
          <a class="btn btn-secondary btn-block" href="#/contract/${c.id}/risks">${escapeHtml(w.goRisks)}</a>
        </div>`}

      <div id="draft-slot">${draftSection(c, asks)}</div>
      <div id="options-slot">${optionsSection(c)}</div>

      <p class="decide-foot"><strong>${escapeHtml(w.yourCall)}</strong><br>${escapeHtml(w.bigDecision)}</p>
    </div>`;
}

// Saving marks, edits and the choice: one request at a time, in order, so quick taps can't
// overwrite each other. The screen updates straight away; the server only adds what it works out
// itself (whether the plain-words version is out of date).
let decisionsQueue = Promise.resolve();
function saveDecision(c, change) {
  decisionsQueue = decisionsQueue
    // keepalive: a choice made just before closing or reloading the page is still saved.
    .then(() => api(`contracts?id=${encodeURIComponent(c.id)}`, { method: 'PATCH', json: { decisions: change }, what: 'saving your choice', keepalive: true }))
    .then(({ decisions }) => {
      if (decisions && c.decisions) c.decisions.plain_outdated = decisions.plain_outdated;
      return decisions;
    })
    .catch((err) => {
      toast(err.message);
      return null;
    });
  return decisionsQueue;
}

function setMark(c, index, mark) {
  c.decisions = c.decisions || {};
  const risks = { ...(c.decisions.risks || {}) };
  const value = risks[index] === mark ? null : mark; // tap the chosen one again to clear it
  if (value) risks[index] = value;
  else delete risks[index];
  c.decisions.risks = risks;
  saveDecision(c, { mark: { index, value } });
}

async function makeDraft(c) {
  c.draftBusy = true;
  delete c.draftError;
  const redraw = () => {
    const slot = document.getElementById('draft-slot');
    const { name, params } = parseRoute();
    if (slot && name === 'contract' && params[0] === c.id && params[1] === 'decide') {
      slot.innerHTML = draftSection(c, riskList(c).filter((r) => markOf(c, r.index) === 'ask'));
    }
  };
  setTimeout(redraw); // show "Writing…" (also when called while the screen is being drawn)
  try {
    await decisionsQueue; // marks first, so the draft covers them
    const { decisions } = await api(`decide?id=${encodeURIComponent(c.id)}&action=draft`, { method: 'POST', what: 'writing your draft message' });
    c.decisions = decisions;
  } catch (err) {
    c.draftError = err.message;
  } finally {
    c.draftBusy = false;
    redraw();
  }
}

async function updatePlain(c) {
  c.plainBusy = true;
  delete c.plainError;
  const redraw = () => {
    const slot = document.getElementById('plain-slot');
    if (slot) slot.innerHTML = plainSection(c);
  };
  redraw();
  try {
    flushDraft();
    await decisionsQueue; // the latest edits first
    const { decisions } = await api(`decide?id=${encodeURIComponent(c.id)}&action=plain`, { method: 'POST', what: 'explaining your message' });
    c.decisions = { ...c.decisions, message_plain: decisions.message_plain, plain_outdated: decisions.plain_outdated };
  } catch (err) {
    c.plainError = err.message;
  } finally {
    c.plainBusy = false;
    redraw();
  }
}

// Edits to the draft are saved a moment after typing stops, or straight away when the user leaves
// the screen or the page.
let draftTimer;
let draftPending = null;
function draftEdited(c, text) {
  c.decisions = { ...c.decisions, message: text };
  if (c.decisions.message_plain) c.decisions.plain_outdated = true;
  clearTimeout(draftTimer);
  draftPending = { c, text };
  draftTimer = setTimeout(saveDraftNow, 800);
}
function flushDraft() {
  if (!draftPending) return;
  clearTimeout(draftTimer);
  saveDraftNow();
}
window.addEventListener('pagehide', flushDraft);
window.addEventListener('hashchange', flushDraft);
window.addEventListener('hashchange', stopListening); // the mic stops when you leave the screen
async function saveDraftNow() {
  if (!draftPending) return;
  const { c, text } = draftPending;
  draftPending = null;
  const saved = await saveDecision(c, { message: text });
  const status = document.getElementById('draft-status');
  if (saved && status) status.textContent = decideWords(c).saved;
  const plain = document.getElementById('plain-slot');
  if (plain && !c.plainBusy) plain.innerHTML = plainSection(c);
}

async function copyDraft(c, button) {
  const w = decideWords(c);
  const text = document.getElementById('draft-text')?.value || c.decisions?.message || '';
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers: select the text and copy it the old way.
    const box = document.getElementById('draft-text');
    box?.select();
    if (!document.execCommand?.('copy')) {
      toast(w.copyFailed);
      return;
    }
  }
  button.innerHTML = `${icons.check} ${escapeHtml(w.copied)}`;
  setTimeout(() => { button.innerHTML = `${icons.doc} ${escapeHtml(w.copy)}`; }, 2000);
}

// ---------- Risks & scam check (mockups 3 and 3b) ----------

const LEVEL_LABEL = { high: 'High', medium: 'Medium', info: 'Info' };

const RISK_ICONS = {
  pay_to_start: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  personal_account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  pressure: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  company_details: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M4 10h16M12 3l8 4H4zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>',
  credentials: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/></svg>',
  personal_data: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 10h4M14 14h3"/></svg>',
  non_compete: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
  probation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4"/></svg>',
  one_sided_change: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  fee: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.6c-.4-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 1.9s1.2 1.6 2.8 1.9 2.8.8 2.8 1.9-1.2 1.9-2.8 1.9c-1.3 0-2.4-.5-2.8-1.4M12 6.5v11"/></svg>',
  renewal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  cancellation: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 14l4 4M14 14l-4 4"/></svg>',
  other: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 18h.01"/></svg>',
};

function overallLevel(items) {
  if (items.some((i) => i.level === 'high')) return 'high';
  if (items.some((i) => i.level === 'medium')) return 'medium';
  return items.length ? 'info' : 'none';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const asksToPay = (items) => items.some((i) => i.kind === 'scam_sign' && (i.category === 'pay_to_start' || i.category === 'personal_account'));

// Red "SCAM CHECK" banner at the top of the Overview (mockup 2).
function riskBanner(c) {
  const items = riskList(c);
  if (!items.length) return '';
  const scam = items.filter((i) => i.kind === 'scam_sign');
  const text = scam.length
    ? `${plural(scam.length, 'possible scam sign')}.${asksToPay(items) ? " Don't pay anything yet." : ''}`
    : `${plural(items.length, 'term')} worth checking.`;
  return `
    <a class="risk-banner ${overallLevel(items) === 'high' ? 'banner-red' : 'banner-amber'}" href="#/contract/${c.id}/risks">
      <span class="risk-banner-icon">${icons.shield}</span>
      <span class="risk-banner-body">
        <span class="risk-banner-eyebrow">Scam check</span>
        <span class="risk-banner-text">${escapeHtml(text)}</span>
      </span>
      ${icons.chev}
    </a>`;
}

function riskTabDot(c) {
  return riskList(c).some((i) => i.level === 'high')
    ? '<span class="tab-dot"><span class="visually-hidden">(high warnings)</span></span>' : '';
}

// When the risk check finishes while someone is reading the Overview, update just the
// banner and the tab dot instead of re-drawing the screen.
function updateRiskChrome(c) {
  const slot = document.getElementById('risk-banner');
  if (slot) slot.innerHTML = riskBanner(c);
  const tab = document.getElementById('tab-risks');
  if (tab) tab.innerHTML = `Risks${riskTabDot(c)}`;
}

// Semicircle gauge from the mockup; the needle points to the overall level.
function gauge(level) {
  const needle = { high: [59, 31], medium: [40, 20], info: [21, 31], none: [21, 31] }[level];
  return `
    <svg class="gauge" viewBox="0 0 80 48" aria-hidden="true">
      <path d="M10 42A30 30 0 0 1 25 16" stroke="#fcd34d"/>
      <path d="M25 16A30 30 0 0 1 55 16" stroke="#f59e0b"/>
      <path d="M55 16A30 30 0 0 1 70 42" stroke="#b42318"/>
      <path d="M40 42L${needle[0]} ${needle[1]}" stroke="#2b1160" class="needle"/>
      <circle cx="40" cy="42" r="4" fill="#2b1160" stroke="none"/>
    </svg>`;
}

const EYEBROW = { high: 'High warning', medium: 'Worth checking', info: 'Good to know', none: 'No warning signs found' };

const sameName = (a, b) => {
  const n = (s) => String(s || '').toLowerCase().replace(/\b(pte|ltd|private|limited|llp)\b|[^a-z0-9]/g, '');
  return n(a) && n(b) && (n(a).includes(n(b)) || n(b).includes(n(a)));
};

function companyCheck(company) {
  const missing = '<span class="kv-bad">Not stated</span>';
  const row = (label, value) => `<div class="kv-row"><span class="kv-label">${label}</span><span class="kv-value">${value}</span></div>`;
  const payeeDiffers = company.payee && !sameName(company.payee, company.name);
  return `
    <div class="section-row">
      <h2 class="h2">Company check</h2>
      <span class="section-note">From your contract</span>
    </div>
    <div class="card kv-card">
      ${row('Name on contract', company.name ? escapeHtml(company.name) : missing)}
      ${row('UEN on contract', company.uen ? escapeHtml(company.uen) : missing)}
      ${row('Address on contract', company.address ? escapeHtml(company.address) : missing)}
      ${company.payee ? row('You\'re asked to pay', `<span class="${payeeDiffers ? 'kv-bad' : ''}">${escapeHtml(company.payee)}</span>${payeeDiffers ? '<span class="kv-sub">Not the company</span>' : ''}`) : ''}
      <p class="kv-note">${icons.info} Check the company's name and UEN on ACRA BizFile before you pay or sign.</p>
      <a class="btn btn-secondary btn-block" href="https://www.bizfile.gov.sg/" target="_blank" rel="noopener">${icons.building} Look up on ACRA BizFile</a>
    </div>`;
}

// A warning's title or explanation in the chosen language (English until translated).
const riskText = (c, i, field) => translated(c, 'risks')?.[i]?.[field] || c.risks.items[i][field];

function renderRisks(c) {
  if (c.risksError) return `${notice('error', c.risksError)}${retryButton('risks')}`;
  // Nothing is shown until the final, double-checked answer is ready (PRD FR10).
  const waiting = waitingCard(c, 'risks');
  if (waiting) return waiting;

  const { company } = c.risks;
  const items = riskList(c);
  const tr = tailoredTr(c);
  const level = overallLevel(items);
  const scam = items.filter((i) => i.kind === 'scam_sign');
  const title = scam.length
    ? plural(scam.length, 'possible scam sign')
    : items.length ? `${plural(items.length, 'term')} worth checking` : 'We didn\'t find the warning signs we check for';
  const callout = asksToPay(items)
    ? '<strong>Don\'t pay anything or share bank details yet.</strong> Tap a clause to see it highlighted in your document.'
    : items.length ? 'Tap a clause to see it highlighted in your document.'
      : 'This isn\'t a final verdict. Read the contract, and ask an expert if anything is unclear.';

  return `
    ${checkedTick(c)}
    ${languageNote(c, 'risks')}
    <section class="card risk-top">
      <div class="risk-top-head">
        ${gauge(level)}
        <div>
          <p class="risk-eyebrow lvl-${level}">${EYEBROW[level]}</p>
          <h2 class="risk-title">${escapeHtml(title)}</h2>
        </div>
      </div>
      <p class="risk-callout ${scam.length ? 'callout-red' : 'callout-purple'}">${callout}</p>
    </section>

    ${companyCheck(company)}

    ${items.length ? `
      <h2 class="h2">What we found</h2>
      ${items.map((r) => `
        <div class="card risk-card${markOf(c, r.index) === 'wrong' ? ' risk-disagreed' : ''}">
        <a class="risk-item" href="#/contract/${c.id}/doc/${r.index}">
          <span class="risk-icon lvl-${r.level}">${RISK_ICONS[r.category] || RISK_ICONS.other}</span>
          <span class="risk-body">
            <span class="risk-item-title">${escapeHtml(riskText(c, r.index, 'title'))}</span>
            ${r.checked === 'unclear' ? `<span class="risk-item-text">${unclearHtml(c, r.clause_numbers)}</span>`
    : r.explanation ? `<span class="risk-item-text">${escapeHtml(riskText(c, r.index, 'explanation'))}</span>` : ''}
            ${whyLine(c, r, tr)}
            <span class="risk-item-foot">
              <span class="level-pill lvl-${r.level}">${LEVEL_LABEL[r.level]}</span>
              ${markOf(c, r.index) === 'wrong' ? `<span class="disagreed-pill" lang="${langAttr(c)}">${escapeHtml(decideWords(c).disagreed)}</span>` : ''}
              <span class="risk-link">${escapeHtml(clauseLabel(r.clause_numbers[0]))}${r.clause_numbers.length > 1 ? ` +${r.clause_numbers.length - 1}` : ''} ${icons.chevSmall}</span>
            </span>
          </span>
        </a>
        ${markButtons(c, r)}
        </div>`).join('')}` : ''}

    ${decideCard(c)}

    <div class="help-row">
      <a class="btn btn-primary" href="#/contract/${c.id}/ask">${icons.chat} Ask the chatbot</a>
      <a class="btn btn-outline-red" href="tel:1799">${icons.phone} ScamShield 1799</a>
    </div>
    <a class="btn btn-secondary btn-block help-case" href="https://www.case.org.sg/" target="_blank" rel="noopener">${icons.building} Consumer issue? Contact CASE</a>

    <p class="tab-foot">These are warning signs, not a final verdict. ClauseWise SG can never confirm whether a contract is genuine.</p>

    ${behindScenes(c)}`;
}

// Wraps the AI's quote inside the clause in <mark>, matching loosely on spaces and quote marks.
// Quote marks don't count, as in the server's check: the quote may write " as ' or leave out
// the marks around a defined term, so any quote mark in the text may or may not be in the quote.
const QUOTE_MARK = '[\'‘’`"“”]';
function highlight(text, quote) {
  if (!quote) return escapeHtml(text);
  // A quote joined from two pieces ("… ") highlights its longest piece.
  const piece = quote.split('…').map((p) => p.trim()).sort((a, b) => b.length - a.length)[0];
  if (!piece) return escapeHtml(text);
  const pattern = piece.split(/\s+/)
    .map((w) => {
      const chars = [...w.replace(/['‘’`"“”]/g, '')].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      return `${QUOTE_MARK}*${chars.join(`${QUOTE_MARK}?`)}${QUOTE_MARK}*`;
    })
    .join('\\s+');
  const m = new RegExp(pattern, 'i').exec(text);
  if (!m) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, m.index))}<mark>${escapeHtml(m[0])}</mark>${escapeHtml(text.slice(m.index + m[0].length))}`;
}

// "Your document" (mockup 3b): the whole contract, with one warning sign highlighted.
function renderDocument(c, indexParam) {
  if (c.risksError) return `${notice('error', c.risksError)}${retryButton('risks')}`;
  if (!c.risks) {
    loadAi(c, 'risks');
    return '<div class="card loading loading-tall"><span class="spinner" aria-hidden="true"></span><span>Checking your contract for warning signs…</span></div>';
  }
  // Stepped through in the same order as the Risks tab; the link holds the saved position.
  const items = riskList(c);
  if (!items.length) return emptyState({ icon: icons.shield, title: 'No warning signs to show', text: 'Go back to see the full risk check.' });

  if (c.language && c.language !== 'en' && !translated(c, 'risks')) loadTranslation(c, 'risks');
  const tr = tailoredTr(c);

  const n = items.length;
  const p = Math.max(items.findIndex((x) => x.index === (Number(indexParam) || 0)), 0);
  const r = items[p];
  const i = r.index;
  const prev = items[(p - 1 + n) % n].index;
  const next = items[(p + 1) % n].index;
  const target = r.clause_numbers[0];
  const tag = `${r.kind === 'scam_sign' ? 'Scam sign' : 'Worth asking'} · ${LEVEL_LABEL[r.level]}`;

  let lastSection = null;
  const doc = c.clauses.map((cl) => {
    const numbered = /^\d/.test(cl.number);
    const section = numbered ? cl.number.split('.')[0] : cl.number;
    let head = '';
    if (section !== lastSection) {
      lastSection = section;
      if (numbered) head = `<h3 class="doc-h">${escapeHtml(section)}. ${escapeHtml(cl.heading || '')}</h3>`;
      else if (cl.number !== 'Intro') {
        // "Schedule B · COURSE FEES"; sections like "Acceptance" are their own heading.
        const name = cl.heading && cl.heading !== cl.number && /^(schedule|annex|appendix|exhibit|attachment)/i.test(cl.number)
          ? `${cl.number} · ${cl.heading}` : cl.heading || cl.number;
        head = `<h3 class="doc-h">${escapeHtml(name)}</h3>`;
      }
    }
    const flagged = r.clause_numbers.includes(cl.number);
    const isTarget = cl.number === target;
    const num = numbered && cl.number.includes('.') ? `${escapeHtml(cl.number)} ` : '';
    return `${head}
      <div class="doc-clause${flagged ? ` flagged lvl-${r.level}` : ''}"${isTarget ? ' id="doc-target"' : ''}>
        ${isTarget ? `<span class="doc-tag lvl-${r.level}">${tag}</span>` : ''}
        <p>${num}${isTarget ? highlight(cl.text, r.quote) : escapeHtml(cl.text)}</p>
      </div>`;
  }).join('');

  return `
    <div class="doc-bar">
      <a class="round-btn" href="#/contract/${c.id}/risks" aria-label="Back to risks">${icons.back}</a>
      <div class="doc-bar-title">
        <strong>Your document</strong>
        <span>${escapeHtml(displayTitle(c.title))} · ${escapeHtml(clauseLabel(target))}</span>
      </div>
      <div class="doc-stepper" role="group" aria-label="Warning signs">
        <a class="step-btn" href="#/contract/${c.id}/doc/${prev}" aria-label="Previous warning sign">${icons.chevUp}</a>
        <span aria-live="polite">${p + 1}/${n}</span>
        <a class="step-btn" href="#/contract/${c.id}/doc/${next}" aria-label="Next warning sign">${icons.chevDown}</a>
      </div>
    </div>

    <article class="doc-paper" aria-label="Your contract">${doc}</article>

    <div class="doc-sheet" role="region" aria-label="About this warning sign">
      <div class="sheet-handle"></div>
      <span class="level-pill lvl-${r.level}">${LEVEL_LABEL[r.level]} · ${escapeHtml(clauseLabel(target))}</span>
      <h2>${escapeHtml(riskText(c, i, 'title'))}</h2>
      ${r.explanation ? `<p>${escapeHtml(riskText(c, i, 'explanation'))}</p>` : ''}
      ${r.why ? `<p class="sheet-why">${whyLine(c, r, tr)}</p>` : ''}
      <div class="help-row">
        <a class="btn btn-primary" href="#/contract/${c.id}/ask/${encodeURIComponent(target)}">${icons.chat} Ask the chatbot</a>
        <a class="btn btn-yellow" href="#/contract/${c.id}/comic/${encodeURIComponent(target)}">${icons.comicGrid} See as comic</a>
      </div>
      <p class="sheet-foot">Warning signs, not a final verdict. ClauseWise SG explains contracts. It is not legal advice.</p>
    </div>`;
}

// ---------- Comic explanation (mockup 4) ----------

// Short names for warning signs in the clause list (the mockup's "S$350 fee", "Non-compete").
const COMIC_RISK_TITLES = {
  pay_to_start: 'Paying to start',
  personal_account: 'Paying a person',
  pressure: 'Deadline to accept',
  credentials: 'Passwords or OTPs',
  non_compete: 'Non-compete',
  one_sided_change: 'Changing the terms',
  probation: 'Probation',
  fee: 'Fees',
  renewal: 'Auto-renewal',
  cancellation: 'Leaving early',
  other: 'Worth asking about',
};

// Clauses offered as comics: notice first (as in the mockup), then high warnings, then key terms.
function comicChoices(c, openNumber) {
  const seen = new Set();
  const list = [];
  const saved = (n) => c.comics?.find((m) => m.clause_number === n);
  const add = (number, title, risky) => {
    if (!number || number === 'Intro' || seen.has(number)) return;
    seen.add(number);
    list.push({ number, title: translateText(shellLang(), saved(number)?.title || title) || saved(number)?.title || title, risky });
  };
  const term = (key) => c.summary?.find((s) => s.key === key && s.found && s.clause_numbers.length);

  // A clause picked from the dropdown or "See as comic" goes first so it is easy to find.
  if (openNumber) {
    const cl = c.clauses?.find((x) => x.number === openNumber);
    const risk = c.risks?.items.find((r) => r.clause_numbers[0] === openNumber);
    add(openNumber, risk ? COMIC_RISK_TITLES[risk.category] : cl?.heading || clauseLabel(openNumber), !!risk);
  }
  if (term('notice')) add(term('notice').clause_numbers[0], 'Notice period', false);
  for (const r of c.risks?.items || []) {
    if (r.level === 'high') add(r.clause_numbers[0], COMIC_RISK_TITLES[r.category] || r.title, true);
  }
  // Then the summary's own rows, in order (they differ by contract type).
  for (const s of c.summary || []) {
    if (s.key !== 'key_date' && term(s.key)) add(s.clause_numbers[0], s.label, false);
  }
  return list.slice(0, 7);
}

// Mei's outfit comes from the contract type, not from the AI.
const MEI_OUTFIT = { job_offer: 'office', rental: 'casual', phone_subscription: 'hoodie', loan: 'smart' };

// Comics saved before Mei arrived name a whole scene; map those onto the new parts.
const OLD_SCENES = {
  sign: { background: 'office', expression: 'happy', holding: 'paper' },
  phone: { background: 'home_desk', expression: 'shocked', holding: 'phone' },
  talk: { background: 'office', expression: 'thinking', holding: 'none', character: 'boss' },
  letter: { background: 'home_desk', expression: 'thinking', holding: 'paper' },
  pay: { background: 'bank_counter', expression: 'worried', holding: 'phone' },
  calendar: { background: 'home_desk', expression: 'thinking', holding: 'none' },
  clock: { background: 'home_desk', expression: 'worried', holding: 'none' },
  worried: { background: 'home_desk', expression: 'worried', holding: 'none' },
  happy: { background: 'home_desk', expression: 'relieved', holding: 'none' },
  leave: { background: 'office', expression: 'relieved', holding: 'paper' },
  new_job: { background: 'office', expression: 'happy', holding: 'none' },
  blocked: { background: 'office', expression: 'shocked', holding: 'none' },
  bank: { background: 'bank_counter', expression: 'worried', holding: 'none' },
  work: { background: 'office', expression: 'happy', holding: 'none' },
};

// One panel's picture, built from its parts: background, Mei, any supporting character, speech bubble.
// Mei's face and the sign beside her follow each panel's risk. Panels saved before "risk" existed use the
// clause's risk on the key panel.
const PANEL_FACE = { high: 'worried', medium: 'confused', none: 'relieved', good: 'happy' };
function panelRisk(c, number, panel, index, panels) {
  if (panel.risk) return panel.risk;
  const warn = comicWarning(c, number);
  const hasKey = panels.some((x) => x.key);
  return warn && (!hasKey || panel.key) ? warn : 'none';
}

function panelArt(c, panel, translatedSpeech, risk = 'none') {
  const p = panel.scene ? { ...OLD_SCENES[panel.scene], speech: null } : panel;
  const said = translatedSpeech || p.speech?.text;
  return composePanel({
    background: p.background,
    mei: { expression: PANEL_FACE[risk] || p.expression, outfit: MEI_OUTFIT[c.contract_type] || 'casual', holding: p.holding },
    sign: risk === 'none' ? null : risk,
    dense: isDesktop(),
    other: p.character && p.character !== 'none' ? p.character : null,
    otherMood: p.character_mood || 'neutral',
    // Bubble text is drawn inside the picture, so apply "Hide these too" to it here.
    speech: said ? { who: p.speech?.who === 'character' ? 'other' : 'mei', text: redactor ? redactor(said) : said } : null,
  });
}

// Comics are made once per clause (about 5–10 seconds), then saved.
const comicRequests = new Map();

function loadComic(c, number) {
  const key = `${c.id}:${number}`;
  if (comicRequests.has(key)) return;
  c.comicErrors ||= {};
  delete c.comicErrors[number];
  const call = () => api(`comic?id=${encodeURIComponent(c.id)}&clause=${encodeURIComponent(number)}`, { method: 'POST', what: 'drawing the comic' });
  comicRequests.set(key, call()
    .catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)))
    .then(({ comic }) => {
      c.comics = [...(c.comics || []).filter((m) => m.clause_number !== comic.clause_number), comic];
    })
    .catch((err) => {
      c.comicErrors[number] = err.message;
    })
    .finally(() => {
      comicRequests.delete(key);
      const { name, params } = parseRoute();
      if (name === 'contract' && params[0] === c.id && params[1] === 'comic') render();
    }));
}

// Comic panel warnings (PRD FR5): a label, not colour alone. Shown on the key panel of a clause that
// has a possible scam sign or a high risk (red), or a medium risk (amber).
const COMIC_WARN = {
  en: { high: 'Possible scam sign', medium: 'Check this' },
  zh: { high: '可能的诈骗迹象', medium: '请检查' },
  ms: { high: 'Mungkin tanda penipuan', medium: 'Semak ini' },
  ta: { high: 'சாத்தியமான மோசடி அறிகுறி', medium: 'இதைச் சரிபார்க்கவும்' },
};
function comicWarning(c, number) {
  const items = (c.risks?.items || []).filter((r) => r.clause_numbers?.[0] === number);
  if (items.some((r) => r.kind === 'scam_sign' || r.level === 'high')) return 'high';
  if (items.some((r) => r.level === 'medium')) return 'medium';
  return null;
}
const warnBadge = (kind, label) => `<span class="panel-warn panel-warn-${kind}">${icons.alert}<span>${escapeHtml(label)}</span></span>`;

function comicBody(c, number) {
  const comic = c.comics?.find((m) => m.clause_number === number);
  if (c.comicErrors?.[number]) {
    return `${notice('error', c.comicErrors[number])}
      <button class="btn btn-primary btn-block" type="button" data-retry-comic="${escapeHtml(number)}">Try again</button>`;
  }
  if (!comic) {
    loadComic(c, number);
    return `
      <div class="loading loading-tall comic-loading">
        <span class="spinner" aria-hidden="true"></span>
        <span>Drawing your comic. This takes about 10 seconds…</span>
      </div>`;
  }

  const cl = c.clauses?.find((x) => x.number === number);
  const tr = translated(c, `comic:${number}`);
  const assumptions = tr?.assumptions || comic.assumptions;
  return `
    ${languageNote(c, `comic:${number}`)}
    <div class="panels">
      ${comic.panels.map((p, i) => {
        // Each panel's risk drives Mei's face, the sign beside her, and the caption badge (high / medium).
        const risk = panelRisk(c, number, p, i, comic.panels);
        const kind = risk === 'high' || risk === 'medium' ? risk : null;
        return `
        <figure class="panel${p.key ? ' key' : ''}${kind ? ` panel-${kind}` : ''}">
          <figcaption><span class="panel-num">${i + 1}</span><span class="panel-caption">${escapeHtml(tr?.captions?.[i] || p.caption)}</span>${kind ? warnBadge(kind, (COMIC_WARN[c.language] || COMIC_WARN.en)[kind]) : ''}</figcaption>
          ${panelArt(c, p, tr?.speeches?.[i], risk)}
        </figure>`;
      }).join('')}
    </div>
    <p class="ai-label">${icons.sparkle} AI-generated example scene</p>
    ${assumptions.length ? `
      <div class="assumptions">
        <p class="assume-head">What this scene assumes</p>
        <ul>${assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      </div>` : ''}
    ${cl ? `
      <div class="clause-original">
        <button class="btn btn-secondary btn-block" type="button" aria-expanded="false" aria-controls="orig-${escapeHtml(number)}" data-toggle-original>${escapeHtml(typeWords(c.language).readOriginal)}</button>
        <div class="clause-quote" id="orig-${escapeHtml(number)}" hidden>
          <p class="quote-head">${clauseHeading(cl)} &middot; the original words</p>
          <blockquote data-keep>${escapeHtml(cl.text)}</blockquote>
        </div>
      </div>` : ''}`;
}

function renderComic(c, openNumber) {
  // The list is built from the summary and risk check; start them if this is the first tab opened.
  if (!c.summary && !c.summaryError) loadAi(c, 'summary');

  const choices = comicChoices(c, openNumber);
  const cards = choices.map((ch) => {
    const open = ch.number === openNumber;
    return `
      <div class="comic-card${open ? ' open' : ''}${ch.risky ? ' risky' : ''}">
        <button class="comic-head" type="button" data-comic="${escapeHtml(ch.number)}" aria-expanded="${open}">
          <span class="comic-icon">${icons.comicGrid}</span>
          <span class="comic-head-text">
            <span class="comic-title">${escapeHtml(ch.title)}</span>
            <span class="comic-sub">${escapeHtml(clauseLabel(ch.number))} &middot; 4 panels</span>
          </span>
          ${open ? icons.chevUp : icons.chevDown}
        </button>
        ${open ? `<div class="comic-body">${comicBody(c, ch.number)}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <p class="tab-lead">Tap a clause to open its comic.</p>
    ${cards || (c.summary ? '' : '<div class="card loading"><span class="spinner" aria-hidden="true"></span> Finding the key clauses…</div>')}

    <label class="clause-picker">
      <span>Or pick any clause</span>
      <select id="comic-clause">
        <option value="">Choose a clause…</option>
        ${(c.clauses || []).filter((cl) => cl.number !== 'Intro').map((cl) => `
          <option value="${escapeHtml(cl.number)}" ${cl.number === openNumber ? 'selected' : ''}>${escapeHtml(clauseLabel(cl.number))}${cl.heading && cl.heading !== cl.number ? ` · ${escapeHtml(cl.heading)}` : ''}</option>`).join('')}
      </select>
    </label>

    <p class="tab-foot">AI-generated example scenes. They show what a clause could mean, not a legal conclusion.</p>

    <div class="action-bar">
      <a class="btn btn-primary btn-block" href="#/contract/${c.id}/ask${openNumber ? `/${encodeURIComponent(openNumber)}` : ''}">${icons.chat} Ask about this</a>
    </div>`;
}

// ---------- Ask: AI chatbot (mockup 5) ----------

// **bold** from the AI becomes <strong>, everything else is escaped.
const formatAnswer = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function askSuggestions(c) {
  const list = [];
  const high = c.risks?.items?.find((r) => r.level === 'high' && /^\d/.test(r.clause_numbers[0]));
  if (high) list.push(`Explain clause ${high.clause_numbers[0]}`);
  // One question that fits the contract type, if the contract covers it.
  const has = (key) => c.summary?.some((s) => s.key === key && s.found);
  if (has('notice')) list.push('How much notice do I give?');
  if (has('how_to_cancel')) list.push('How do I cancel?');
  if (has('early_termination_fee')) list.push('What if I leave early?');
  if (has('deposit')) list.push('When do I get my deposit back?');
  if (has('early_repayment')) list.push('Can I repay early?');
  if (has('fees')) list.push('Can I get the fee back?');
  list.push('Can I negotiate?');
  return list.slice(0, 4);
}

// Shown under "I'm not sure" answers: the PRD's human-review step.
const EXPERT_CARD = `
  <div class="expert-card">
    <div class="expert-head">
      <span class="expert-avatar">${'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'}</span>
      <span><strong>Want a real person to check?</strong><span>For big decisions, ask a qualified professional.</span></span>
    </div>
    <div class="expert-links">
      <a href="https://www.tal.sg/tadm" target="_blank" rel="noopener">TADM · work disputes</a>
      <a href="https://www.probono.sg/" target="_blank" rel="noopener">Pro Bono SG · free legal help</a>
    </div>
  </div>`;

// Answers saved before the server parsed replies strictly can end in raw fields
// (`clauses: ["2.6"] quote: "…"`): show only the answer.
const cleanAnswer = (text) => String(text || '').replace(/\s*\b(clauses|quotes?)\s*:\s*[[“"].*$/is, '');

function chatMessage(c, m) {
  if (m.role === 'user') return `<div class="msg msg-user"><div class="bubble">${escapeHtml(m.text)}</div></div>`;
  return `
    <div class="msg msg-bot">
      <div class="bubble">
        <p>${formatAnswer(cleanAnswer(m.text))}</p>
        ${m.quote ? `<blockquote class="msg-quote">“${escapeHtml(m.quote)}”</blockquote>` : ''}
        ${m.clause_numbers?.length ? `
          <div class="msg-chips">${m.clause_numbers.map((n) => `
            <button class="msg-chip" type="button" data-clause="${escapeHtml(n)}" aria-expanded="false">${icons.doc} ${escapeHtml(clauseLabel(n))}</button>`).join('')}
          </div>
          <div class="msg-clause" hidden></div>` : ''}
      </div>
      ${m.decide ? `<a class="btn btn-secondary chat-decide" href="#/contract/${c.id}/decide" lang="${langAttr(c)}">${icons.check} ${escapeHtml(decideWords(c).openDecide)}</a>` : ''}
      ${m.not_sure ? EXPERT_CARD : ''}
    </div>`;
}

function renderAsk(c, prefillClause) {
  const messages = c.chat || [];
  const busy = Boolean(c.asking);
  const prefill = prefillClause && !busy ? `Explain ${clauseLabel(prefillClause).replace(/^Clause/, 'clause')}` : '';

  const lang = labelOf(LANGUAGES, c.language || 'en');
  return `
    ${c.language && c.language !== 'en' ? `<p class="lang-note">${icons.globe} Answers in ${escapeHtml(lang)} · quotes stay in the contract's own words</p>` : ''}
    <div class="chat" aria-live="polite">
      <div class="msg msg-bot">
        <div class="bubble">
          <p>Hi! I'm reading <strong>${escapeHtml(displayTitle(c.title))}</strong>. Ask me anything about it. I answer only from your contract and show you the clause I used. If it isn't in there, I'll say so.</p>
        </div>
      </div>
      ${messages.map((m) => chatMessage(c, m)).join('')}
      ${busy ? `
        <div class="msg msg-user"><div class="bubble">${escapeHtml(c.asking)}</div></div>
        <div class="msg msg-bot"><div class="bubble typing" aria-label="ClauseWise SG is answering"><span></span><span></span><span></span></div></div>` : ''}
      ${c.askError ? `
        <div class="msg msg-user"><div class="bubble">${escapeHtml(c.askError.question)}</div></div>
        ${notice('error', `Couldn't get an answer: ${c.askError.message}`)}
        <button class="btn btn-secondary btn-block" type="button" data-ask-retry>Try again</button>` : ''}
    </div>

    <form class="composer" id="ask-form" autocomplete="off">
      <div class="ask-chips">
        ${askSuggestions(c).map((q) => `<button class="ask-chip" type="button" data-q="${escapeHtml(q)}" ${busy ? 'disabled' : ''}>${escapeHtml(q)}</button>`).join('')}
      </div>
      <div class="composer-box">
        <input id="ask-input" type="text" maxlength="500" placeholder="Ask anything about your contract" aria-label="Your question" value="${escapeHtml(prefill)}" ${busy ? 'disabled' : ''}>
        ${busy ? '' : micButton('ask-input', c.language || 'en')}
        <button class="send-btn" type="submit" aria-label="Send" ${busy ? 'disabled' : ''}>${icons.arrowUp}</button>
      </div>
      <p class="composer-foot">Answers come only from your contract. ClauseWise SG explains contracts. It is not legal advice.</p>
    </form>`;
}

async function sendQuestion(c, typed) {
  if (c.asking || !typed) return;
  // An NRIC or account number typed into a question is hidden before it is shown, saved or sent to the AI.
  const question = hidePersonalNumbers(typed).text;
  c.asking = question;
  c.askError = null;
  await render();
  scrollChatToEnd();

  const call = () => api(`ask?id=${encodeURIComponent(c.id)}`, { method: 'POST', json: { question }, what: 'answering your question' });
  try {
    // The free AI service is sometimes slow or busy: retry once before showing an error.
    const { user, reply } = await call().catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)));
    c.chat = [...(c.chat || []), user, reply];
  } catch (err) {
    c.askError = { question, message: err.message };
  } finally {
    c.asking = null;
    const { name, params } = parseRoute();
    if (name === 'contract' && params[0] === c.id && params[1] === 'ask') {
      await render();
      scrollChatToEnd();
      if (!c.askError) document.getElementById('ask-input')?.focus();
    }
  }
}

function scrollChatToEnd() {
  // Desktop: the chat is in the middle column, so bring its question box into view.
  if (isDesktop()) {
    document.getElementById('ask-form')?.scrollIntoView({ block: 'nearest' });
    return;
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
}

// Shows (or hides) the whole clause under a reply when its chip is tapped.
function toggleMsgClause(chip) {
  const c = contractCache.get(parseRoute().params[0]);
  const box = chip.closest('.bubble').querySelector('.msg-clause');
  const wasOpen = chip.getAttribute('aria-expanded') === 'true';
  chip.closest('.msg-chips').querySelectorAll('.msg-chip').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (wasOpen) {
    box.hidden = true;
    return;
  }
  const cl = c?.clauses?.find((x) => x.number === chip.dataset.clause);
  if (!cl) return;
  chip.setAttribute('aria-expanded', 'true');
  box.innerHTML = `<div class="clause-quote"><p class="quote-head">${clauseHeading(cl)}</p><blockquote>${escapeHtml(cl.text)}</blockquote></div>`;
  box.hidden = false;
}

// ---------- Personal details found ----------

const personalRequests = new Map();

function loadPersonal(c) {
  if (personalRequests.has(c.id)) return;
  delete c.personalError;
  const call = () => api(`personal?id=${encodeURIComponent(c.id)}`, { method: 'POST', what: 'checking for personal details' });
  personalRequests.set(c.id, call()
    .catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)))
    .then(({ personal }) => { c.personal = personal; })
    .catch((err) => { c.personalError = err.message; })
    .finally(() => {
      personalRequests.delete(c.id);
      const { name, params } = parseRoute();
      if (name === 'contract' && params[0] === c.id && params[1] === 'personal') render();
    }));
}

function renderPersonal(c, next) {
  const onward = `#/contract/${c.id}/${next === 'comic' ? 'comic' : 'summary'}`;
  const foot = `
    <p class="pd-foot">${icons.lock} Your original file was not saved. Only the hidden version is kept.</p>
    <a class="btn btn-primary btn-block" href="${onward}">Continue</a>`;

  // Start the summary now so the Overview is ready sooner after Continue.
  if (!c.summary && !c.summaryError) loadAi(c, 'summary');

  if (c.personalError) return `${notice('error', c.personalError)}<button class="btn btn-secondary btn-block" type="button" data-retry-personal>Try again</button>${foot}`;
  if (!c.personal) {
    loadPersonal(c);
    return `<div class="card loading loading-tall"><span class="spinner" aria-hidden="true"></span><span>Checking your contract for personal details…</span></div>`;
  }

  const { hidden, found, hide_extra: hideExtra } = c.personal;
  const chips = (list) => list.map((x) => `<span class="pd-chip">${escapeHtml(x.value ?? x)}${x.count > 1 ? `<small>×${x.count}</small>` : ''}</span>`).join('');
  const row = (label, list) => (list.length ? `<div class="pd-row"><span class="pd-label">${label}</span><span class="pd-values">${chips(list)}</span></div>` : '');

  const hiddenRows = row('NRIC / FIN', hidden.nric) + row('Bank or card account', hidden.accounts);
  const foundRows = row('Names', found.names) + row('Home address', found.addresses) + row('Phone number', found.phones) + row('Email', found.emails);
  const payee = c.risks?.company?.payee;
  const payeeListed = payee && found.names.some((n) => payee.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(payee.toLowerCase()));

  if (!hiddenRows && !foundRows) {
    return `<div class="card pd-card pd-empty">${icons.shield}<p>No personal details found.</p></div>${foot}`;
  }

  return `
    <p class="tab-lead">We checked your contract for personal details before it was saved.</p>

    <section class="card pd-card">
      <div class="pd-head">
        <span class="pd-icon pd-ok">${icons.lock}</span>
        <div><h2>Hidden automatically</h2><p>Hidden before your contract was saved or read by AI.</p></div>
      </div>
      ${hiddenRows || '<p class="pd-none">No NRIC, FIN or account numbers found.</p>'}
    </section>

    ${foundRows ? `
      <section class="card pd-card">
        <div class="pd-head">
          <span class="pd-icon pd-warn">${icons.person}</span>
          <div><h2>Also in your contract</h2><p>${hideExtra ? 'Hidden across the app. Switch off to show them again.' : 'Not hidden. They show in your summary, clauses and chat.'}</p></div>
        </div>
        ${foundRows}
        <button class="pd-switch" type="button" role="switch" aria-checked="${hideExtra}" data-hide-personal>
          <span>Hide these too</span>
          <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
        </button>
        ${payeeListed ? `<p class="pd-note">The person you're asked to pay stays visible in Risks, so the scam check can still point out payment to a personal name.</p>` : ''}
      </section>` : ''}

    ${foot}`;
}

async function toggleHidePersonal(c) {
  const on = !c.personal.hide_extra;
  c.personal.hide_extra = on;
  render();
  try {
    await api(`contracts?id=${encodeURIComponent(c.id)}`, { method: 'PATCH', json: { hide_personal: on } });
  } catch {
    toast('Could not save this setting. It will reset next time.');
  }
}

// Header title for each tab, as named in the mockups.
const TAB_TITLES = {
  summary: 'Overview',
  risks: 'Risks & scam check',
  comic: 'Comic explanation',
  ask: 'ClauseWise SG AI',
};

// Summary / Risks / Comic / Ask (both layouts).
function contractTabs(c, tab) {
  return CONTRACT_TABS.map((t) => `
    <button class="tab" role="tab" type="button" id="tab-${t.id}"
      aria-selected="${t.id === tab}" aria-controls="tab-panel"
      data-tab="${t.id}">${t.label}${t.id === 'risks' ? riskTabDot(c) : ''}</button>`).join('');
}

function renderContract(c, tab, openClause = null) {
  // The summary and the risk check are made at the same time (each is its own function call), so
  // the final answer is ready sooner.
  if (!c.summary && !c.summaryError) loadAi(c, 'summary');
  if (!c.risks && !c.risksError) loadAi(c, 'risks');
  // Then "Your situation": the plan and anything made for this person.
  if (c.summary && c.risks && !c.tailored && !c.tailoredError) loadAi(c, 'tailored');
  // Then the two AIs double-check it all (PRD FR10).
  if (c.summary && c.risks && (c.tailored || c.tailoredError) && !finalState(c)) loadCheck(c);

  const tabsHtml = contractTabs(c, tab);

  let body;
  if (tab === 'summary') {
    body = renderSummary(c);
  } else if (tab === 'risks') {
    body = renderRisks(c);
  } else if (tab === 'comic') {
    body = renderComic(c, openClause);
  } else {
    body = renderAsk(c, openClause);
  }

  const meta = [
    labelOf(CONTRACT_TYPES, c.contract_type),
    c.source_type === 'photo' ? 'Photo' : 'PDF',
    labelOf(LANGUAGES, c.language),
    formatDate(c.created_at),
  ].join(' · ');

  return `
    ${typeNoteHtml(c)}
    <div class="meta-row">
      <span class="meta-chip">${escapeHtml(meta)}</span>
      ${tab === 'summary' ? `
        <span class="meta-links">
          <a class="privacy-link" href="#/contract/${c.id}/situation">${icons.person} Your situation</a>
          <a class="privacy-link" href="#/contract/${c.id}/personal">${icons.lock} Personal details</a>
        </span>` : ''}
    </div>
    <h1 class="contract-title">${escapeHtml(displayTitle(c.title))}</h1>
    <div class="tabs" role="tablist" aria-label="Contract sections">${tabsHtml}</div>
    <section id="tab-panel" role="tabpanel" aria-labelledby="tab-${tab}">${body}</section>`;
}

// Opens or closes the original clauses under a tapped row.
function togglePoint(row) {
  const panel = document.getElementById(row.getAttribute('aria-controls'));
  const open = row.getAttribute('aria-expanded') !== 'true';
  row.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
}

// Delete is offered at the bottom of the Overview and on each card in Contracts.
async function deleteContract(id, button) {
  if (!confirm('Delete this contract? The file and everything ClauseWise SG made from it will be removed. This cannot be undone.')) return;
  button.disabled = true;
  try {
    await api(`contracts?id=${encodeURIComponent(id)}`, { method: 'DELETE', what: 'deleting the contract' });
    contractCache.delete(id);
    refreshContractsList();
    try {
      localStorage.removeItem(`clausewise-plan-done:${id}`);
    } catch { /* nothing kept */ }
    stopSpeaking();
    flash = 'Contract deleted.';
    if (location.hash === '#/contracts') render();
    else location.hash = '#/contracts';
  } catch (err) {
    alert(err.message);
    button.disabled = false;
  }
}

// ---------- Language and read-aloud (header buttons) ----------

function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}

const languageName = (id) => LANGUAGES.find((l) => l.id === id)?.name || 'English';

function openLanguageSheet() {
  const c = contractCache.get(parseRoute().params[0]);
  if (!c) return;
  const opener = document.activeElement; // the header's globe, or the desktop language button
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.id = 'lang-sheet';
  sheet.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="lang-title">
      <div class="sheet-handle"></div>
      <h2 id="lang-title">Explain it in…</h2>
      <p>The original clauses always stay in their own words, so you can check them.</p>
      <div class="lang-options">
        ${LANGUAGES.map((l) => `
          <button class="lang-option" type="button" data-lang="${l.id}" aria-pressed="${l.id === c.language}">
            <span>${l.label}</span><small>${l.name}</small>
          </button>`).join('')}
      </div>
      <button class="btn btn-ghost btn-block" type="button" data-close>Close</button>
    </div>`;
  const close = () => {
    sheet.remove();
    (opener?.isConnected ? opener : langBtn).focus();
  };
  sheet.addEventListener('click', (e) => {
    const option = e.target.closest('.lang-option');
    if (option) {
      close();
      setLanguage(c, option.dataset.lang);
    } else if (e.target === sheet || e.target.closest('[data-close]')) {
      close();
    }
  });
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.append(sheet);
  sheet.querySelector('[aria-pressed="true"]')?.focus();
}

function setLanguage(c, lang) {
  if (lang === c.language) return;
  stopSpeaking();
  c.language = lang;
  scan.language = lang; // the choice carries to Home and the other screens
  saveLanguage(lang);
  render();
  api(`contracts?id=${encodeURIComponent(c.id)}`, { method: 'PATCH', json: { language: lang } })
    .catch(() => toast('Could not save your language choice. It will reset next time.'));
}

// What the speaker button reads on each screen, in the language it is shown in.
function readAloudContent(c, tab, extra) {
  const lang = c.language || 'en';
  const clean = (s) => String(s || '').replace(/\*\*/g, '');
  if (tab === 'summary' && c.summary) {
    // Same order as the screen: terms, dates, then the plan.
    const tr = translated(c, 'summary');
    const t = (s, field) => tr?.[c.summary.indexOf(s)]?.[field] || s[field];
    const terms = orderedTerms(c, c.summary.filter((s) => s.key !== 'key_date' && s.found));
    const dates = c.summary.filter((s) => s.key === 'key_date' && s.found);
    const texts = [...terms.map((s) => `${t(s, 'label')}. ${t(s, 'plain_text')}`), ...dates.map((d) => t(d, 'plain_text'))];
    // The plan is read when it's in the same language as the rest.
    const ttr = tailoredTr(c);
    const plan = c.tailored?.plan || [];
    if (plan.length && (tr ? ttr : lang === 'en')) {
      if (!tr) texts.push('Your plan before you sign.');
      texts.push(...plan.map((s, i) => ttr?.plan?.[i] || s.text));
    }
    return { lang: tr ? lang : 'en', texts };
  }
  if ((tab === 'risks' || tab === 'doc') && c.risks) {
    const tr = translated(c, 'risks');
    const ttr = tailoredTr(c);
    const list = riskList(c);
    const items = list.map((r) => ({
      title: tr?.[r.index]?.title || r.title,
      explanation: tr?.[r.index]?.explanation || r.explanation,
      // Read with its label, in the same language as the rest.
      why: r.why && (tr
        ? translatedWhy(r, ttr) && `${forYouWords(c).why} ${translatedWhy(r, ttr)}`
        : `${FOR_YOU_WORDS.en.why} ${r.why}`),
    }));
    const at = Math.max(list.findIndex((r) => r.index === (Number(extra) || 0)), 0);
    const pick = tab === 'doc' ? [items[at]] : items;
    return { lang: tr ? lang : 'en', texts: pick.filter(Boolean).flatMap((r) => [`${r.title}.`, r.explanation, r.why]).filter(Boolean) };
  }
  if (tab === 'comic' && extra) {
    const comic = c.comics?.find((m) => m.clause_number === extra);
    if (!comic) return null;
    const tr = translated(c, `comic:${extra}`);
    const captions = tr?.captions || comic.panels.map((p) => p.caption);
    return { lang: tr ? lang : 'en', texts: [tr?.title || comic.title, ...captions, ...(tr?.assumptions || comic.assumptions)] };
  }
  if (tab === 'ask') {
    const last = [...(c.chat || [])].reverse().find((m) => m.role === 'assistant');
    if (last) return { lang: last.lang || 'en', texts: [clean(last.text)] };
  }
  return null;
}

async function toggleReadAloud() {
  // While reading, the speaker button pauses and resumes; "Stop reading" stops.
  if (isSpeaking()) {
    togglePause();
    return;
  }
  const { name, params } = parseRoute();
  const c = name === 'contract' ? contractCache.get(params[0]) : null;
  const tab = params[1] || 'summary';
  let texts = [];
  let lang = c?.language || scan.language || 'en';
  if (c) {
    const content = readAloudContent(c, tab, params[2] && decodeURIComponent(params[2]));
    if (content?.texts.length) {
      texts = content.texts;
      lang = content.lang;
    }
  }
  if (!texts.length) {
    // Nothing saved for this screen yet: read what is on it, in the language shown.
    const screenText = (document.querySelector('#tab-panel, .comic-body, .dt-page, .screen')?.innerText || '').replace(/\s+/g, ' ').trim();
    if (screenText) texts = [screenText];
  }
  if (!texts.length) {
    toast('There is nothing on this screen to read yet.');
    return;
  }
  if (c && lang !== (c.language || 'en')) toast('Still translating, so reading in English for now.');
  try {
    // Read out the same hidden versions the screen shows.
    await speak(texts.map((t) => (redactor ? redactor(t) : t)), lang);
  } catch (err) {
    // Only when Azure failed and this device has no voice for the language.
    toast(err.message === 'no-voice'
      ? `This device has no ${languageName(lang)} voice. You can add one in your phone's text-to-speech settings.`
      : 'Read-aloud is not available right now. Please try again.');
  }
}

// The speaker buttons show a loading state while the next audio part is being made.
onLoadingChange((on) => {
  document.querySelectorAll('#speak-btn, [data-dt-speak], [data-listen]').forEach((b) => {
    b.classList.toggle('is-loading', on);
    b.setAttribute('aria-busy', String(on));
  });
});

onSpeakingChange((on) => {
  speakBtn.setAttribute('aria-pressed', String(on));
  speakBtn.setAttribute('aria-label', on ? 'Stop reading' : 'Read aloud');
  document.querySelectorAll('[data-listen]').forEach((b) => {
    b.innerHTML = on ? `${icons.stopSquare} Stop reading` : `${icons.play} Listen to this summary`;
  });
  document.querySelectorAll('[data-dt-speak]').forEach((b) => {
    const w = dtWords(shellLang());
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? w.stopReading : w.readAloud);
  });
});

onSpeechError((code) => toast(`Read-aloud stopped (${code}). Check your volume and try again.`));

langBtn.addEventListener('click', openLanguageSheet);
speakBtn.addEventListener('click', toggleReadAloud);

// ---------- Translations ----------

// Translated explanations for one part ("summary", "risks", "comic:4.4"), or null.
function translated(c, part) {
  return c.language && c.language !== 'en' ? c.translations?.[c.language]?.[part] || null : null;
}

const translateRequests = new Map();

function loadTranslation(c, part) {
  const lang = c.language;
  const key = `${c.id}:${lang}:${part}`;
  c.translateErrors ||= {};
  if (translateRequests.has(key) || c.translateErrors[key]) return;
  const call = () => api(`translate?id=${encodeURIComponent(c.id)}&lang=${lang}&part=${encodeURIComponent(part)}`, { method: 'POST', what: 'translating' });
  translateRequests.set(key, call()
    .catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)))
    .then(({ result }) => {
      c.translations ||= {};
      c.translations[lang] = { ...(c.translations[lang] || {}), [part]: result };
    })
    .catch((err) => {
      c.translateErrors[key] = err.message;
    })
    .finally(() => {
      translateRequests.delete(key);
      const { name, params } = parseRoute();
      if (name === 'contract' && params[0] === c.id && c.language === lang) render();
    }));
}

// Line under the tabs: "Explanations in 中文" / "Translating…" / an error with a retry button.
function languageNote(c, part) {
  if (!c.language || c.language === 'en') return '';
  const label = labelOf(LANGUAGES, c.language);
  if (translated(c, part)) {
    return `<p class="lang-note">${icons.globe} Explanations in ${escapeHtml(label)} · original clauses stay in their own words</p>`;
  }
  const key = `${c.id}:${c.language}:${part}`;
  if (c.translateErrors?.[key]) {
    return `<div class="lang-note lang-note-error">${escapeHtml(c.translateErrors[key])}
      <button class="btn btn-secondary" type="button" data-retry-translate="${escapeHtml(part)}">Try again</button></div>`;
  }
  loadTranslation(c, part);
  return `<p class="lang-note"><span class="spinner" aria-hidden="true"></span> Translating into ${escapeHtml(label)}… showing English until it's ready</p>`;
}

// ---------- Desktop layout (screens 1024px and wider) ----------
// Follows mockup/desktop/desktop-home.html and desktop-contract.html, with the app's real data.
// On narrow screens none of this is used, so the phone layout is unchanged. On wide screens the
// "View: Auto · Phone · Desktop" switch picks the layout: Auto and Desktop show this one, Phone
// shows the phone layout in a phone-sized frame.

const VIEW_KEY = 'clausewise-view';
const VIEWS = ['auto', 'phone', 'desktop'];
let viewChoice = 'auto';
try {
  const saved = localStorage.getItem(VIEW_KEY);
  if (VIEWS.includes(saved)) viewChoice = saved;
} catch { /* storage blocked: Auto */ }

const wideScreen = window.matchMedia('(min-width: 1024px)');
// 'phone' (narrow screen), 'frame' (wide screen, Phone chosen) or 'desktop'.
let layout = 'phone';
function applyLayout() {
  layout = !wideScreen.matches ? 'phone' : viewChoice === 'phone' ? 'frame' : 'desktop';
  document.documentElement.dataset.layout = layout;
}
function isDesktop() {
  return layout === 'desktop';
}
applyLayout();
wideScreen.addEventListener('change', () => {
  const before = layout;
  applyLayout();
  if (layout !== before) render();
});

function setView(choice) {
  if (!VIEWS.includes(choice)) return;
  viewChoice = choice;
  try {
    localStorage.setItem(VIEW_KEY, choice);
  } catch { /* not remembered, but still used now */ }
  applyLayout();
  render().then(() => {
    // The switch moves between the desktop top bar and the bar above the phone frame: keep focus on it.
    [...document.querySelectorAll(`[data-view="${choice}"]`)].find((b) => b.offsetParent)?.focus();
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (btn) setView(btn.dataset.view);
  const ics = e.target.closest('[data-ics]');
  if (ics) downloadIcs(Number(ics.dataset.ics));
});

// Every new label in the desktop layout, in each language the app explains in. Fixed wording, not
// AI. (Tamil still needs a native speaker's check, like the other Tamil text.)
const DT_WORDS = {
  en: {
    nav: { home: 'Home', scan: 'Scan a contract', contracts: 'My contracts', deadlines: 'Deadlines', experts: 'Get expert help' },
    deadlines: {
      title: 'Dates to note', sub: 'Key dates from all your saved contracts, soonest first.', clause: 'Clause',
      kinds: { reply: 'Reply by', probation: 'Probation ends', start: 'Start date', notice: 'Notice deadline', pay: 'Payment due', end: 'Contract ends', other: 'Key date' },
      daysLeft: (n) => (n === 0 ? 'Today' : n === 1 ? '1 day left' : `${n} days left`),
      noDate: 'No date given', addCal: 'Add to calendar', loadFailed: 'We couldn\'t load your contracts just now.',
      empty: { title: 'No dates yet', text: 'Key dates from your contracts, like when to reply and your start date, will show here after you scan one.', scan: 'Scan a contract' },
    },
    mainNav: 'Main', homeLink: 'ClauseWise SG home',
    datesBadge: (n) => `${n} ${n === 1 ? 'date' : 'dates'} to note`,
    privateTitle: 'Private by design',
    privateItems: ['NRIC and bank numbers hidden', 'Photos deleted after reading', 'Delete your contract anytime'],
    scamTitle: 'Think it\'s a scam?', scamText: 'Call the ScamShield Helpline before you pay anything.', scamCall: 'Call ScamShield, 1799',
    view: 'View', views: { auto: 'Auto', phone: 'Phone', desktop: 'Desktop' },
    language: 'Language for explanations', back: 'Back',
    gotContract: 'Got a contract?', h1: ['Understand', 'before you ', 'sign.'],
    intro: 'Snap any contract. Get it in plain words, as a comic or read aloud in 4 languages, with scam signs flagged before you sign.',
    artHigh: 'High', artText: 'You must pay before you start.', artFoot: 'Checked twice',
    startTitle: 'Start with your contract', startTabs: 'How do you want to add your contract?',
    tabs: { pdf: 'Upload PDF', photos: 'Take photos', speak: 'Speak' },
    dropTitle: 'Drop your contract here', dropSub: 'or click to choose · PDF, JPG or PNG · many pages are fine',
    photoTitle: 'Add a photo of each page', photoSub: 'or drop them here · JPG or PNG · up to 20 pages',
    nricPill: 'Cover your NRIC before you scan',
    speakTitle: 'Tell us about you, out loud',
    speakSub: 'Tap the mic and speak in English, 中文, BM or தமிழ். We use your words to show what matters most for you.',
    speakNext: 'Then add your contract with Upload PDF or Take photos.',
    noVoice: 'Voice input doesn\'t work in this browser. Type here instead, or try Chrome or Edge.',
    wrongFile: 'Please choose a PDF or photos (JPG or PNG).',
    canDo: ['Before you sign, ', 'ClauseWise it.'],
    sdgs: [['SDG 8', 'Decent work'], ['SDG 10', 'Reduced inequalities'], ['SDG 16', 'Access to justice']],
    bento: [
      ['01 · Plain words', 'Legal terms, explained like a friend would.', 'Read it, see it as a comic, or listen in English, 中文, BM or தமிழ்.'],
      ['02', 'Checked twice', 'Scam signs flagged, then checked by a second AI.'],
      ['03', 'Tailored to you', 'Tell us your situation and get a plan that fits it.'],
      ['04', 'Approved by you', 'AI prepares your next steps and a draft message. You make the call.'],
      ['05', 'No typing', 'Snap your pages or speak. AI reads them for you.'],
    ],
    askTitle: 'Ask ClauseWise', askSub: 'Answers from your contract only',
    askHi: 'Hi! I explain contracts and point out what to check. What would you like to do?',
    askQs: ['Explain my contract', 'Is this a scam?', 'Find important dates', 'What if I leave early?'],
    askPlaceholder: 'Ask anything…', askLabel: 'Ask a question about your contract', send: 'Send', askAbout: 'About',
    askNone: 'Scan a contract first. Then ask anything about it here.',
    recent: 'Recent contracts', viewAll: 'View all',
    recentNone: 'No contracts yet. Contracts you scan will show here.', recentFailed: 'We couldn\'t load your contracts. Open My contracts to try again.',
    status: {
      scam: (n) => `${n} possible scam ${n === 1 ? 'sign' : 'signs'}`,
      check: (n) => `${n} ${n === 1 ? 'thing' : 'things'} to check`,
      clear: 'No warning signs found', notYet: 'Not checked yet',
    },
    scamFoot: 'Think it\'s a scam? Call ScamShield',
    crumb: 'Breadcrumb', situation: 'Your situation', personal: 'Personal details',
    readAloud: 'Read aloud', stopReading: 'Stop reading', changeLang: 'Change language', comic: 'See it as a comic',
    glance: 'At a glance', toReply: 'to reply', units: { h: 'h', d: 'd', w: 'w' },
    dontPay: 'Don\'t pay anything yet',
    scamHead: (n) => `${n} possible scam ${n === 1 ? 'sign' : 'signs'} in this contract`,
    checkHead: (n) => `${n} ${n === 1 ? 'thing' : 'things'} worth checking`,
    noneHead: 'We didn\'t find the warning signs we check for',
    riskFailed: 'The risk check didn\'t finish. Open Risks to try again.',
    bannerNote: 'Warning signs, not a final verdict. Check each one before you sign or send money.',
    noneNote: 'This isn\'t a final verdict. Read the contract, and ask an expert if anything is unclear.',
    stats: { clauses: 'clauses read', check: 'things to check', steps: 'steps in your plan' },
    original: 'Original contract', clauses: (n) => `${n} ${n === 1 ? 'clause' : 'clauses'}`,
    viewing: 'You\'re viewing this clause', showing: (l) => `Showing ${l} in the original contract`,
    clickHint: 'Click a point to see its clause in the original contract.', aiMade: 'Made by AI from your contract.',
    plainWords: 'Plain words',
    planTitle: 'Your plan before you sign', planOf: (d, n) => `${d} of ${n}`,
    markDone: (i) => `Step ${i}: mark as done`, planMaking: 'Making your plan…',
    planNone: 'We couldn\'t make steps we could check against your contract.',
    editAbout: 'Edit about you', onlyContract: ['Based on the contract only. ', 'Tell us about you', ' for a plan that fits you.'],
    sidePanel: 'Your plan and next steps',
    finalSay: 'The final say', call: ['You make ', 'the call.'], callText: 'ClauseWise SG points out what to check. The choice is yours.',
    notLegal: 'ClauseWise SG explains contracts. It is not legal advice.',
  },
  zh: {
    nav: { home: '首页', scan: '扫描合同', contracts: '我的合同', deadlines: '截止日期', experts: '找专家帮忙' },
    deadlines: {
      title: '需要留意的日期', sub: '所有已保存合同中的重要日期，最近的排在前面。', clause: '条款',
      kinds: { reply: '请在此前回复', probation: '试用期结束', start: '开始日期', notice: '通知截止', pay: '付款日期', end: '合同结束', other: '重要日期' },
      daysLeft: (n) => (n === 0 ? '今天' : n === 1 ? '还剩 1 天' : `还剩 ${n} 天`),
      noDate: '合同未写明日期', addCal: '添加到日历', loadFailed: '暂时无法读取你的合同。',
      empty: { title: '还没有日期', text: '扫描合同后，合同中的重要日期（例如回复期限和开始日期）会显示在这里。', scan: '扫描合同' },
    },
    mainNav: '主导航', homeLink: 'ClauseWise SG 首页',
    datesBadge: (n) => `${n} 个要注意的日期`,
    privateTitle: '隐私优先',
    privateItems: ['NRIC 和银行账号会被隐藏', '照片读取后即删除', '随时可以删除你的合同'],
    scamTitle: '怀疑是诈骗？', scamText: '付任何钱之前，先打 ScamShield 热线。', scamCall: '拨打 ScamShield 1799',
    view: '显示', views: { auto: '自动', phone: '手机', desktop: '电脑' },
    language: '解释所用的语言', back: '返回',
    gotContract: '有合同要签？', h1: ['签约之前，', '先', '看懂。'],
    intro: '拍下任何合同，就能看到白话解释、漫画或朗读，支持 4 种语言，签约前还会标出诈骗迹象。',
    artHigh: '高', artText: '要你先付钱才能开始。', artFoot: '已检查两次',
    startTitle: '从你的合同开始', startTabs: '你想怎样添加合同？',
    tabs: { pdf: '上传 PDF', photos: '拍照', speak: '说话' },
    dropTitle: '把合同拖到这里', dropSub: '或点击选择 · PDF、JPG 或 PNG · 多页也可以',
    photoTitle: '为每一页添加照片', photoSub: '或拖到这里 · JPG 或 PNG · 最多 20 页',
    nricPill: '扫描前请遮住你的 NRIC',
    speakTitle: '用说话告诉我们你的情况',
    speakSub: '点麦克风，用英文、中文、马来文或淡米尔文说话。我们会根据你的话，先显示对你最重要的内容。',
    speakNext: '然后用“上传 PDF”或“拍照”添加你的合同。',
    noVoice: '这个浏览器不支持语音输入。请在这里打字，或改用 Chrome 或 Edge。',
    wrongFile: '请选择 PDF 或照片（JPG 或 PNG）。',
    canDo: ['签约之前，', '先用 ClauseWise 看看。'],
    sdgs: [['SDG 8', '体面工作'], ['SDG 10', '减少不平等'], ['SDG 16', '公正司法']],
    bento: [
      ['01 · 白话解释', '法律条款，像朋友一样讲给你听。', '可以阅读、看漫画，或用英文、中文、马来文、淡米尔文收听。'],
      ['02', '已检查两次', '先标出诈骗迹象，再由第二个 AI 复查。'],
      ['03', '为你定制', '告诉我们你的情况，得到适合你的计划。'],
      ['04', '由你决定', 'AI 帮你准备下一步和草稿信息，由你做决定。'],
      ['05', '不用打字', '拍下页面或直接说话，AI 帮你读。'],
    ],
    askTitle: '问 ClauseWise', askSub: '只根据你的合同回答',
    askHi: '你好！我会解释合同，并指出需要检查的地方。你想做什么？',
    askQs: ['解释我的合同', '这是诈骗吗？', '找出重要日期', '如果我提前离开会怎样？'],
    askPlaceholder: '问任何问题…', askLabel: '问一个关于你合同的问题', send: '发送', askAbout: '关于',
    askNone: '请先扫描一份合同，然后就可以在这里提问。',
    recent: '最近的合同', viewAll: '查看全部',
    recentNone: '还没有合同。你扫描的合同会显示在这里。', recentFailed: '无法载入你的合同。请打开“我的合同”再试一次。',
    status: { scam: (n) => `${n} 个可能的诈骗迹象`, check: (n) => `${n} 项需要检查`, clear: '没有发现警告迹象', notYet: '还没检查' },
    scamFoot: '怀疑是诈骗？请打 ScamShield',
    crumb: '路径', situation: '你的情况', personal: '个人资料',
    readAloud: '朗读', stopReading: '停止朗读', changeLang: '更改语言', comic: '用漫画看',
    glance: '一览', toReply: '内回复', units: { h: '小时', d: '天', w: '周' },
    dontPay: '先不要付任何钱',
    scamHead: (n) => `这份合同有 ${n} 个可能的诈骗迹象`,
    checkHead: (n) => `${n} 项值得检查`,
    noneHead: '没有发现我们检查的警告迹象',
    riskFailed: '风险检查没有完成。请打开“风险”再试一次。',
    bannerNote: '这些是警告迹象，不是最终结论。签约或付钱之前，请逐一核实。',
    noneNote: '这不是最终结论。请阅读合同，有不清楚的地方请咨询专家。',
    stats: { clauses: '条条款已读', check: '项需要检查', steps: '个计划步骤' },
    original: '合同原文', clauses: (n) => `${n} 条条款`,
    viewing: '你正在看这一条', showing: (l) => `已在合同原文中显示 ${l}`,
    clickHint: '点击任何一点，就能在合同原文中看到它的条款。', aiMade: '由 AI 根据你的合同生成。',
    plainWords: '白话解释',
    planTitle: '签约前的计划', planOf: (d, n) => `${d} / ${n}`,
    markDone: (i) => `第 ${i} 步：标记为完成`, planMaking: '正在制定你的计划…',
    planNone: '我们无法制定能根据你的合同核实的步骤。',
    editAbout: '修改你的情况', onlyContract: ['只根据合同制定。', '告诉我们你的情况', '，就能得到适合你的计划。'],
    sidePanel: '你的计划和下一步',
    finalSay: '最终决定', call: ['由你', '做决定。'], callText: 'ClauseWise SG 指出需要检查的地方，决定权在你。',
    notLegal: 'ClauseWise SG 解释合同，这不是法律意见。',
  },
  ms: {
    nav: { home: 'Laman utama', scan: 'Imbas kontrak', contracts: 'Kontrak saya', deadlines: 'Tarikh akhir', experts: 'Dapatkan bantuan pakar' },
    deadlines: {
      title: 'Tarikh untuk diberi perhatian', sub: 'Tarikh penting daripada semua kontrak yang disimpan, yang paling dekat dahulu.', clause: 'Klausa',
      kinds: { reply: 'Balas sebelum', probation: 'Tamat tempoh percubaan', start: 'Tarikh mula', notice: 'Tarikh akhir notis', pay: 'Tarikh bayaran', end: 'Kontrak tamat', other: 'Tarikh penting' },
      daysLeft: (n) => (n === 0 ? 'Hari ini' : n === 1 ? '1 hari lagi' : `${n} hari lagi`),
      noDate: 'Tiada tarikh diberi', addCal: 'Tambah ke kalendar', loadFailed: 'Kontrak anda tidak dapat dimuatkan buat masa ini.',
      empty: { title: 'Tiada tarikh lagi', text: 'Tarikh penting daripada kontrak anda, seperti bila perlu membalas dan tarikh mula, akan dipaparkan di sini selepas anda imbas satu kontrak.', scan: 'Imbas kontrak' },
    },
    mainNav: 'Utama', homeLink: 'Laman utama ClauseWise SG',
    datesBadge: (n) => `${n} tarikh untuk diingat`,
    privateTitle: 'Privasi diutamakan',
    privateItems: ['NRIC dan nombor bank disembunyikan', 'Gambar dipadam selepas dibaca', 'Padam kontrak anda bila-bila masa'],
    scamTitle: 'Rasa ini penipuan?', scamText: 'Hubungi Talian ScamShield sebelum anda membayar apa-apa.', scamCall: 'Hubungi ScamShield, 1799',
    view: 'Paparan', views: { auto: 'Auto', phone: 'Telefon', desktop: 'Desktop' },
    language: 'Bahasa untuk penerangan', back: 'Kembali',
    gotContract: 'Ada kontrak?', h1: ['Fahami', 'sebelum anda ', 'tandatangan.'],
    intro: 'Ambil gambar mana-mana kontrak. Dapatkan penerangan dalam bahasa mudah, sebagai komik atau dibacakan dalam 4 bahasa, dengan tanda penipuan ditunjukkan sebelum anda menandatangani.',
    artHigh: 'Tinggi', artText: 'Anda perlu membayar sebelum mula.', artFoot: 'Disemak dua kali',
    startTitle: 'Mulakan dengan kontrak anda', startTabs: 'Bagaimana anda mahu menambah kontrak anda?',
    tabs: { pdf: 'Muat naik PDF', photos: 'Ambil gambar', speak: 'Bercakap' },
    dropTitle: 'Letakkan kontrak anda di sini', dropSub: 'atau klik untuk memilih · PDF, JPG atau PNG · banyak halaman pun boleh',
    photoTitle: 'Tambah gambar setiap halaman', photoSub: 'atau letakkan di sini · JPG atau PNG · sehingga 20 halaman',
    nricPill: 'Tutup NRIC anda sebelum mengimbas',
    speakTitle: 'Ceritakan tentang diri anda dengan suara',
    speakSub: 'Tekan mikrofon dan bercakap dalam English, 中文, BM atau தமிழ். Kami guna kata-kata anda untuk menunjukkan perkara yang paling penting bagi anda.',
    speakNext: 'Kemudian tambah kontrak anda dengan Muat naik PDF atau Ambil gambar.',
    noVoice: 'Input suara tidak berfungsi dalam pelayar ini. Taip di sini, atau cuba Chrome atau Edge.',
    wrongFile: 'Sila pilih PDF atau gambar (JPG atau PNG).',
    canDo: ['Sebelum tandatangan, ', 'ClauseWise dahulu.'],
    sdgs: [['SDG 8', 'Pekerjaan yang wajar'], ['SDG 10', 'Kurangkan ketidaksamaan'], ['SDG 16', 'Akses kepada keadilan']],
    bento: [
      ['01 · Bahasa mudah', 'Istilah undang-undang, diterangkan seperti seorang kawan.', 'Baca, lihat sebagai komik, atau dengar dalam English, 中文, BM atau தமிழ்.'],
      ['02', 'Disemak dua kali', 'Tanda penipuan ditunjukkan, kemudian disemak oleh AI kedua.'],
      ['03', 'Disesuaikan untuk anda', 'Ceritakan keadaan anda dan dapatkan pelan yang sesuai.'],
      ['04', 'Diluluskan oleh anda', 'AI menyediakan langkah seterusnya dan draf mesej. Anda yang buat keputusan.'],
      ['05', 'Tanpa menaip', 'Ambil gambar halaman atau bercakap. AI membacanya untuk anda.'],
    ],
    askTitle: 'Tanya ClauseWise', askSub: 'Jawapan daripada kontrak anda sahaja',
    askHi: 'Hai! Saya menerangkan kontrak dan menunjukkan perkara yang perlu disemak. Apa yang anda mahu lakukan?',
    askQs: ['Terangkan kontrak saya', 'Adakah ini penipuan?', 'Cari tarikh penting', 'Bagaimana jika saya berhenti awal?'],
    askPlaceholder: 'Tanya apa sahaja…', askLabel: 'Tanya soalan tentang kontrak anda', send: 'Hantar', askAbout: 'Tentang',
    askNone: 'Imbas kontrak dahulu. Kemudian tanya apa sahaja tentangnya di sini.',
    recent: 'Kontrak terkini', viewAll: 'Lihat semua',
    recentNone: 'Belum ada kontrak. Kontrak yang anda imbas akan dipaparkan di sini.', recentFailed: 'Kami tidak dapat memuatkan kontrak anda. Buka Kontrak saya untuk cuba lagi.',
    status: { scam: (n) => `${n} kemungkinan tanda penipuan`, check: (n) => `${n} perkara untuk disemak`, clear: 'Tiada tanda amaran ditemui', notYet: 'Belum disemak' },
    scamFoot: 'Rasa ini penipuan? Hubungi ScamShield',
    crumb: 'Laluan', situation: 'Keadaan anda', personal: 'Butiran peribadi',
    readAloud: 'Bacakan', stopReading: 'Berhenti membaca', changeLang: 'Tukar bahasa', comic: 'Lihat sebagai komik',
    glance: 'Ringkasan', toReply: 'untuk membalas', units: { h: 'j', d: 'h', w: 'mg' },
    dontPay: 'Jangan bayar apa-apa dahulu',
    scamHead: (n) => `${n} kemungkinan tanda penipuan dalam kontrak ini`,
    checkHead: (n) => `${n} perkara yang patut disemak`,
    noneHead: 'Kami tidak menemui tanda amaran yang kami semak',
    riskFailed: 'Semakan risiko tidak selesai. Buka Risiko untuk cuba lagi.',
    bannerNote: 'Ini tanda amaran, bukan keputusan muktamad. Semak setiap satu sebelum anda menandatangani atau menghantar wang.',
    noneNote: 'Ini bukan keputusan muktamad. Baca kontrak, dan tanya pakar jika ada yang tidak jelas.',
    stats: { clauses: 'fasal dibaca', check: 'perkara untuk disemak', steps: 'langkah dalam pelan anda' },
    original: 'Kontrak asal', clauses: (n) => `${n} fasal`,
    viewing: 'Anda sedang melihat fasal ini', showing: (l) => `Menunjukkan ${l} dalam kontrak asal`,
    clickHint: 'Klik mana-mana perkara untuk melihat fasalnya dalam kontrak asal.', aiMade: 'Dibuat oleh AI daripada kontrak anda.',
    plainWords: 'Bahasa mudah',
    planTitle: 'Pelan anda sebelum menandatangani', planOf: (d, n) => `${d} daripada ${n}`,
    markDone: (i) => `Langkah ${i}: tandakan selesai`, planMaking: 'Sedang menyediakan pelan anda…',
    planNone: 'Kami tidak dapat membuat langkah yang boleh disemak dengan kontrak anda.',
    editAbout: 'Ubah tentang anda', onlyContract: ['Berdasarkan kontrak sahaja. ', 'Ceritakan tentang diri anda', ' untuk pelan yang sesuai dengan anda.'],
    sidePanel: 'Pelan dan langkah seterusnya',
    finalSay: 'Keputusan akhir', call: ['Anda yang ', 'buat keputusan.'], callText: 'ClauseWise SG menunjukkan perkara yang perlu disemak. Pilihan di tangan anda.',
    notLegal: 'ClauseWise SG menerangkan kontrak. Ia bukan nasihat undang-undang.',
  },
  ta: {
    nav: { home: 'முகப்பு', scan: 'ஒப்பந்தத்தை ஸ்கேன் செய்', contracts: 'என் ஒப்பந்தங்கள்', deadlines: 'காலக்கெடுகள்', experts: 'நிபுணர் உதவி பெறு' },
    deadlines: {
      title: 'கவனிக்க வேண்டிய தேதிகள்', sub: 'சேமித்த எல்லா ஒப்பந்தங்களின் முக்கிய தேதிகள், விரைவில் வருபவை முதலில்.', clause: 'பிரிவு',
      kinds: { reply: 'பதில் அளிக்க வேண்டிய தேதி', probation: 'சோதனைக் காலம் முடிகிறது', start: 'தொடக்க தேதி', notice: 'அறிவிப்பு இறுதி நாள்', pay: 'பணம் செலுத்த வேண்டிய தேதி', end: 'ஒப்பந்தம் முடிகிறது', other: 'முக்கிய தேதி' },
      daysLeft: (n) => (n === 0 ? 'இன்று' : n === 1 ? 'இன்னும் 1 நாள்' : `இன்னும் ${n} நாட்கள்`),
      noDate: 'தேதி குறிப்பிடப்படவில்லை', addCal: 'நாட்காட்டியில் சேர்', loadFailed: 'உங்கள் ஒப்பந்தங்களை இப்போது ஏற்ற முடியவில்லை.',
      empty: { title: 'இன்னும் தேதிகள் இல்லை', text: 'ஒப்பந்தத்தை ஸ்கேன் செய்த பிறகு, பதில் அளிக்க வேண்டிய நாள் மற்றும் தொடக்க தேதி போன்ற முக்கிய தேதிகள் இங்கே தோன்றும்.', scan: 'ஒப்பந்தத்தை ஸ்கேன் செய்' },
    },
    mainNav: 'முதன்மை', homeLink: 'ClauseWise SG முகப்பு',
    datesBadge: (n) => `கவனிக்க ${n} தேதிகள்`,
    privateTitle: 'தனியுரிமை முதன்மை',
    privateItems: ['NRIC மற்றும் வங்கி எண்கள் மறைக்கப்படும்', 'படித்த பின் படங்கள் நீக்கப்படும்', 'எப்போது வேண்டுமானாலும் உங்கள் ஒப்பந்தத்தை நீக்கலாம்'],
    scamTitle: 'மோசடி என்று சந்தேகமா?', scamText: 'எதையும் செலுத்தும் முன் ScamShield உதவி எண்ணை அழைக்கவும்.', scamCall: 'ScamShield 1799 ஐ அழை',
    view: 'காட்சி', views: { auto: 'தானியங்கி', phone: 'கைபேசி', desktop: 'கணினி' },
    language: 'விளக்கத்தின் மொழி', back: 'பின்செல்',
    gotContract: 'ஒப்பந்தம் வந்ததா?', h1: ['கையெழுத்திடும் முன்', '', 'புரிந்துகொள்ளுங்கள்.'],
    intro: 'எந்த ஒப்பந்தத்தையும் படம் எடுங்கள். எளிய வார்த்தைகளில், காமிக்காக அல்லது 4 மொழிகளில் சத்தமாகக் கேட்கலாம்; கையெழுத்திடும் முன் மோசடி அறிகுறிகள் சுட்டிக்காட்டப்படும்.',
    artHigh: 'அதிகம்', artText: 'தொடங்கும் முன் பணம் செலுத்த வேண்டும்.', artFoot: 'இருமுறை சரிபார்க்கப்பட்டது',
    startTitle: 'உங்கள் ஒப்பந்தத்துடன் தொடங்குங்கள்', startTabs: 'உங்கள் ஒப்பந்தத்தை எப்படிச் சேர்க்க விரும்புகிறீர்கள்?',
    tabs: { pdf: 'PDF பதிவேற்று', photos: 'படம் எடு', speak: 'பேசு' },
    dropTitle: 'உங்கள் ஒப்பந்தத்தை இங்கே விடுங்கள்', dropSub: 'அல்லது தேர்ந்தெடுக்கக் கிளிக் செய்யுங்கள் · PDF, JPG அல்லது PNG · பல பக்கங்களும் சரி',
    photoTitle: 'ஒவ்வொரு பக்கத்தின் படத்தையும் சேர்க்கவும்', photoSub: 'அல்லது இங்கே விடுங்கள் · JPG அல்லது PNG · 20 பக்கங்கள் வரை',
    nricPill: 'ஸ்கேன் செய்யும் முன் உங்கள் NRIC ஐ மறைக்கவும்',
    speakTitle: 'உங்களைப் பற்றி, குரலில் சொல்லுங்கள்',
    speakSub: 'மைக்கைத் தட்டி English, 中文, BM அல்லது தமிழில் பேசுங்கள். உங்களுக்கு மிக முக்கியமானதைக் காட்ட உங்கள் வார்த்தைகளைப் பயன்படுத்துகிறோம்.',
    speakNext: 'பிறகு "PDF பதிவேற்று" அல்லது "படம் எடு" மூலம் உங்கள் ஒப்பந்தத்தைச் சேர்க்கவும்.',
    noVoice: 'இந்த உலாவியில் குரல் உள்ளீடு வேலை செய்யாது. இங்கே தட்டச்சு செய்யுங்கள், அல்லது Chrome அல்லது Edge ஐ முயற்சிக்கவும்.',
    wrongFile: 'PDF அல்லது படங்களைத் (JPG அல்லது PNG) தேர்ந்தெடுக்கவும்.',
    canDo: ['கையெழுத்திடும் முன், ', 'ClauseWise செய்யுங்கள்.'],
    sdgs: [['SDG 8', 'கண்ணியமான வேலை'], ['SDG 10', 'குறைந்த சமத்துவமின்மை'], ['SDG 16', 'நீதிக்கான அணுகல்']],
    bento: [
      ['01 · எளிய வார்த்தைகள்', 'சட்டச் சொற்கள், ஒரு நண்பர் விளக்குவது போல.', 'படியுங்கள், காமிக்காகப் பாருங்கள், அல்லது English, 中文, BM அல்லது தமிழில் கேளுங்கள்.'],
      ['02', 'இருமுறை சரிபார்க்கப்பட்டது', 'மோசடி அறிகுறிகள் சுட்டிக்காட்டப்பட்டு, இரண்டாவது AI ஆல் சரிபார்க்கப்படும்.'],
      ['03', 'உங்களுக்கு ஏற்றது', 'உங்கள் நிலைமையைச் சொல்லுங்கள், அதற்கு ஏற்ற திட்டத்தைப் பெறுங்கள்.'],
      ['04', 'நீங்கள் ஒப்புதல் தருவது', 'AI அடுத்த படிகளையும் வரைவுச் செய்தியையும் தயாரிக்கும். முடிவு உங்களுடையது.'],
      ['05', 'தட்டச்சு வேண்டாம்', 'பக்கங்களைப் படம் எடுங்கள் அல்லது பேசுங்கள். AI உங்களுக்காகப் படிக்கும்.'],
    ],
    askTitle: 'ClauseWise இடம் கேளுங்கள்', askSub: 'உங்கள் ஒப்பந்தத்திலிருந்து மட்டுமே பதில்கள்',
    askHi: 'வணக்கம்! நான் ஒப்பந்தங்களை விளக்கி, சரிபார்க்க வேண்டியவற்றைக் காட்டுகிறேன். நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?',
    askQs: ['என் ஒப்பந்தத்தை விளக்கு', 'இது மோசடியா?', 'முக்கியமான தேதிகளைக் கண்டுபிடி', 'நான் முன்கூட்டியே விலகினால் என்ன?'],
    askPlaceholder: 'எதையும் கேளுங்கள்…', askLabel: 'உங்கள் ஒப்பந்தத்தைப் பற்றி ஒரு கேள்வி கேளுங்கள்', send: 'அனுப்பு', askAbout: 'எதைப் பற்றி',
    askNone: 'முதலில் ஒரு ஒப்பந்தத்தை ஸ்கேன் செய்யுங்கள். பிறகு அதைப் பற்றி இங்கே எதையும் கேளுங்கள்.',
    recent: 'சமீபத்திய ஒப்பந்தங்கள்', viewAll: 'அனைத்தையும் பார்',
    recentNone: 'இன்னும் ஒப்பந்தங்கள் இல்லை. நீங்கள் ஸ்கேன் செய்யும் ஒப்பந்தங்கள் இங்கே காட்டப்படும்.', recentFailed: 'உங்கள் ஒப்பந்தங்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்க "என் ஒப்பந்தங்கள்" திறக்கவும்.',
    status: { scam: (n) => `${n} சாத்தியமான மோசடி அறிகுறிகள்`, check: (n) => `சரிபார்க்க ${n} விஷயங்கள்`, clear: 'எச்சரிக்கை அறிகுறிகள் இல்லை', notYet: 'இன்னும் சரிபார்க்கவில்லை' },
    scamFoot: 'மோசடி என்று சந்தேகமா? ScamShield ஐ அழைக்கவும்',
    crumb: 'வழி', situation: 'உங்கள் நிலைமை', personal: 'தனிப்பட்ட விவரங்கள்',
    readAloud: 'சத்தமாகப் படி', stopReading: 'படிப்பதை நிறுத்து', changeLang: 'மொழியை மாற்று', comic: 'காமிக்காகப் பார்',
    glance: 'ஒரு பார்வையில்', toReply: 'பதிலளிக்க', units: { h: 'மணி', d: 'நாள்', w: 'வாரம்' },
    dontPay: 'இப்போது எதையும் செலுத்த வேண்டாம்',
    scamHead: (n) => `இந்த ஒப்பந்தத்தில் ${n} சாத்தியமான மோசடி அறிகுறிகள்`,
    checkHead: (n) => `சரிபார்க்க வேண்டிய ${n} விஷயங்கள்`,
    noneHead: 'நாங்கள் சரிபார்க்கும் எச்சரிக்கை அறிகுறிகள் எதுவும் இல்லை',
    riskFailed: 'அபாயச் சரிபார்ப்பு முடியவில்லை. மீண்டும் முயற்சிக்க "அபாயங்கள்" திறக்கவும்.',
    bannerNote: 'இவை எச்சரிக்கை அறிகுறிகள், இறுதித் தீர்ப்பு அல்ல. கையெழுத்திடும் முன் அல்லது பணம் அனுப்பும் முன் ஒவ்வொன்றையும் சரிபார்க்கவும்.',
    noneNote: 'இது இறுதித் தீர்ப்பு அல்ல. ஒப்பந்தத்தைப் படியுங்கள், தெளிவில்லாதவற்றை நிபுணரிடம் கேளுங்கள்.',
    stats: { clauses: 'பிரிவுகள் படிக்கப்பட்டன', check: 'சரிபார்க்க வேண்டியவை', steps: 'திட்டப் படிகள்' },
    original: 'மூல ஒப்பந்தம்', clauses: (n) => `${n} பிரிவுகள்`,
    viewing: 'நீங்கள் இந்தப் பிரிவைப் பார்க்கிறீர்கள்', showing: (l) => `மூல ஒப்பந்தத்தில் ${l} காட்டப்படுகிறது`,
    clickHint: 'ஒரு குறிப்பைக் கிளிக் செய்தால், மூல ஒப்பந்தத்தில் அதன் பிரிவு தெரியும்.', aiMade: 'உங்கள் ஒப்பந்தத்திலிருந்து AI உருவாக்கியது.',
    plainWords: 'எளிய வார்த்தைகள்',
    planTitle: 'கையெழுத்திடும் முன் உங்கள் திட்டம்', planOf: (d, n) => `${n} இல் ${d}`,
    markDone: (i) => `படி ${i}: முடிந்ததாகக் குறி`, planMaking: 'உங்கள் திட்டம் தயாராகிறது…',
    planNone: 'உங்கள் ஒப்பந்தத்துடன் சரிபார்க்கக்கூடிய படிகளை உருவாக்க முடியவில்லை.',
    editAbout: 'உங்களைப் பற்றியதைத் திருத்து', onlyContract: ['ஒப்பந்தத்தை மட்டும் வைத்து. ', 'உங்களைப் பற்றிச் சொல்லுங்கள்', ', உங்களுக்கு ஏற்ற திட்டம் கிடைக்கும்.'],
    sidePanel: 'உங்கள் திட்டமும் அடுத்த படிகளும்',
    finalSay: 'இறுதி முடிவு', call: ['முடிவு ', 'உங்களுடையது.'], callText: 'ClauseWise SG சரிபார்க்க வேண்டியவற்றைக் காட்டுகிறது. தேர்வு உங்களுடையது.',
    notLegal: 'ClauseWise SG ஒப்பந்தங்களை விளக்குகிறது. இது சட்ட ஆலோசனை அல்ல.',
  },
};
const dtLang = (lang) => (DT_WORDS[lang] ? lang : 'en');
const dtWords = (lang) => DT_WORDS[dtLang(lang)];

// Fixed labels (no contract text in them): escaped without hiding any names.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// "5.3" -> "§ 5.3"; named sections like "Acceptance" stay as they are.
function dtRef(n) {
  return /^\d/.test(n) ? `§ ${n}` : n;
}

// The language the desktop chrome is in: the open contract's, otherwise the one picked on Home.
function shellLang() {
  const { name, params } = parseRoute();
  return (name === 'contract' && contractCache.get(params[0])?.language) || scan.language;
}

const SPARK_PATH = 'M24 15.5c.9 4.8 3.7 7.6 8.5 8.5-4.8.9-7.6 3.7-8.5 8.5-.9-4.8-3.7-7.6-8.5-8.5 4.8-.9 7.6-3.7 8.5-8.5z';
const RING_PATH = 'M38 12.5A17 17 0 1 0 38 35.5';
// The C-ring logo with the yellow sparkle (mockup).
const ringMark = (cls, ring, spark, width = 7) => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><path d="${RING_PATH}" fill="none" stroke="${ring}" stroke-width="${width}" stroke-linecap="round"/>${spark ? `<path d="${SPARK_PATH}" fill="${spark}" stroke="none"/>` : ''}</svg>`;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 5.3 4.7 9 10 10-5.3 1-9 4.7-10 10-1-5.3-4.7-9-10-10 5.3-1 9-4.7 10-10z" fill="currentColor" stroke="none"/></svg>';

const DT_ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/></svg>',
  contracts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  deadlines: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  experts: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6 6 0 0 0-3-5.2"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4 4 0 0 1-1 9"/><path d="M12 12v8M9 15l3-3 3 3"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
};

// ----- Saved contracts with their counts (Recent contracts, the Deadlines badge) -----

let contractsList = null;
let contractsListAt = 0;
let contractsListError = false;
let contractsListLoading = null;

function loadContractsList() {
  if (contractsListLoading || (contractsList && Date.now() - contractsListAt < 15000)) return;
  contractsListLoading = api('contracts', { what: 'loading your contracts' })
    .then((rows) => {
      contractsList = rows;
      contractsListError = false;
    })
    .catch(() => { contractsListError = true; })
    .finally(() => {
      contractsListAt = Date.now();
      contractsListLoading = null;
      // The Deadlines page waits for this list. Only redraw on success, so a failed load can't loop.
      if (!contractsListError && parseRoute().name === 'deadlines') {
        render();
        return;
      }
      if (!isDesktop()) return;
      renderSide();
      const recent = document.getElementById('dt-recent');
      if (recent) recent.outerHTML = dtRecent();
      const ask = document.getElementById('dt-ask');
      if (ask && !ask.contains(document.activeElement)) ask.outerHTML = dtAskPanel();
    });
}
// Counts change after a scan, a delete or a finished check: fetch them again next time.
const refreshContractsList = () => { contractsListAt = 0; };

// ----- Sidebar, top bar, the View switch -----

const sideEl = document.getElementById('dt-side');
const frameBar = document.getElementById('frame-bar');

function renderSide() {
  if (!isDesktop()) return;
  const lang = shellLang();
  const w = dtWords(lang);
  const onContract = parseRoute().name === 'contract';
  const dates = deadlineRows().length; // the same list the Deadlines page shows
  const link = (id, href, extra = '') => `
    <a href="${href}"${chrome.nav === id ? ' aria-current="page"' : ''}>${DT_ICONS[id]}<span>${esc(w.nav[id])}</span>${extra}</a>`;
  const badge = dates ? `<span class="dt-badge" aria-hidden="true">${dates}</span><span class="visually-hidden">, ${esc(w.datesBadge(dates))}</span>` : '';
  sideEl.lang = dtLang(lang);
  sideEl.innerHTML = `
    <a class="dt-logo" href="#/home" aria-label="${esc(w.homeLink)}">
      ${ringMark('dt-logo-mark', '#8B6CF0', '#F5B800')}
      <span class="dt-logo-text" aria-hidden="true">Clause<span>Wise</span> <span class="dt-sg">SG</span></span>
    </a>
    <nav class="dt-nav" aria-label="${esc(w.mainNav)}">
      ${link('home', '#/home')}
      ${link('scan', '#/scan')}
      ${link('contracts', '#/contracts')}
      ${link('deadlines', '#/deadlines', badge)}
      ${link('experts', '#/experts')}
    </nav>
    ${onContract ? `
      <div class="dt-side-box dt-side-scam">
        <span class="dt-eyebrow">${esc(w.scamTitle)}</span>
        <p>${esc(w.scamText)}</p>
        <a href="tel:1799" aria-label="${esc(w.scamCall)}">1799</a>
      </div>` : `
      <div class="dt-side-box dt-side-private">
        <span class="dt-eyebrow">${esc(w.privateTitle)}</span>
        <ul>${w.privateItems.map((t) => `<li>${DT_ICONS.tick}<span>${esc(t)}</span></li>`).join('')}</ul>
      </div>`}`;
}

function viewSwitch(lang) {
  const w = dtWords(lang);
  return `
    <div class="view-switch" role="group" aria-label="${esc(w.view)}" lang="${dtLang(lang)}">
      <span class="view-switch-label" aria-hidden="true">${esc(w.view)}:</span>
      ${VIEWS.map((v) => `<button type="button" data-view="${v}" aria-pressed="${viewChoice === v}">${esc(w.views[v])}</button>`).join('')}
    </div>`;
}

// Phone view on a wide screen: the switch sits above the phone frame, outside the phone layout.
function renderFrameBar() {
  frameBar.innerHTML = layout === 'frame' ? viewSwitch(shellLang()) : '';
}

// Home's language for explanations: the same control as on the phone (#lang-select).
function dtLangPicker() {
  return `
    <label class="dt-lang">
      ${icons.globe}
      <span aria-hidden="true">${LANGUAGES.map((l) => (l.id === scan.language ? `<b>${l.short}</b>` : l.short)).join(' · ')}</span>
      <select id="lang-select" aria-label="${esc(dtWords(scan.language).language)}" ${scan.busy ? 'disabled' : ''}>
        ${LANGUAGES.map((l) => `<option value="${l.id}" ${l.id === scan.language ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
    </label>`;
}

function dtTopbar(lang, withLang = false) {
  return `<div class="dt-top">${withLang ? dtLangPicker() : ''}${viewSwitch(lang)}</div>`;
}

// Screens the desktop layout doesn't redraw (Contracts, Deadlines, You decide…): the phone
// screen in a readable column, with the top bar, and a Back link where the phone has a back button.
function dtPage(html) {
  const { name, params } = parseRoute();
  const lang = shellLang();
  const w = dtWords(lang);
  const inner = chrome.inner && !chrome.bare;
  const titled = name === 'contract' && (params[1] === 'personal' || params[1] === 'situation');
  return `
    <div class="dt-page">
      ${dtTopbar(lang)}
      <div class="dt-narrow">
        ${inner ? `<a class="dt-back" href="${backTarget()}" lang="${dtLang(lang)}">${icons.back} ${esc(w.back)}</a>` : ''}
        ${titled ? `<h1 class="dt-inner-h1" lang="${dtLang(lang)}">${esc(params[1] === 'personal' ? w.personal : w.situation)}</h1>` : ''}
        ${html}
      </div>
    </div>`;
}

// ----- Home -----

let dtScanTab = 'pdf'; // 'pdf' | 'photos'
let dtFocusStart = false; // "Scan a contract" in the sidebar: go to the start card

function dtDrop(w, tab, off) {
  const pdf = tab === 'pdf';
  return `
    <label class="dt-drop">
      <input type="file" id="${pdf ? 'dt-file-input' : 'photo-input'}" accept="${pdf ? 'application/pdf,image/*' : 'image/*'}" multiple ${off}>
      <span class="dt-drop-icon">${pdf ? DT_ICONS.cloud : icons.camera}</span>
      <span class="dt-drop-text">
        <span class="dt-drop-title">${esc(pdf ? w.dropTitle : w.photoTitle)}</span>
        <span class="dt-drop-sub">${esc(pdf ? w.dropSub : w.photoSub)}</span>
        <span class="dt-nric">${esc(w.nricPill)}</span>
      </span>
    </label>
    ${pdf ? '' : `<p class="dt-photo-note">${icons.camera} <span>${escapeHtml(scanWords().nric)}</span> <span>Photos are read by AI before we can hide anything.</span></p>`}`;
}

// Files picked or dropped on the desktop drop zone: a PDF, or photos of the pages.
function dtFiles(files) {
  const pdf = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  if (pdf) {
    dtScanTab = 'pdf';
    choosePdf(pdf);
    return;
  }
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (images.length) {
    dtScanTab = 'photos';
    addPhotos(images);
    return;
  }
  if (files.length) setScanStatus(notice('error', dtWords(scan.language).wrongFile));
}

function renderDesktopHome() {
  const w = dtWords(scan.language);
  const L = dtLang(scan.language);
  const off = scan.busy ? 'disabled' : '';
  // A chosen PDF or photos show on their own tab.
  // The Speak tab is gone: the mic lives in the "Tell us about you" box, under either upload tab.
  dtScanTab = scan.file ? 'pdf' : scan.pages.length ? 'photos' : (dtScanTab === 'photos' ? 'photos' : 'pdf');
  const tab = dtScanTab;
  const tabBtn = (id, icon) => `
    <button class="dt-seg-btn" type="button" role="tab" id="dt-tab-${id}" aria-selected="${tab === id}" aria-controls="dt-scan-panel"
      tabindex="${tab === id ? 0 : -1}" data-dt-tab="${id}" ${off}>${icon}<span>${esc(w.tabs[id])}</span></button>`;
  const showing = (tab === 'pdf' && scan.file) || (tab === 'photos' && scan.pages.length);
  const panel = showing ? `
      <div class="scan-card dt-scan-card">
        ${scan.file ? chosenPdfHtml() : pagesHtml()}
        ${readStatusHtml()}
        <p class="scan-note">${icons.lock} Your original file is never saved · delete anytime</p>
      </div>`
      : dtDrop(w, tab, off);
  const [b1, ...tiles] = w.bento;
  const tileIcons = [DT_ICONS.shieldCheck, icons.person, DT_ICONS.bolt, icons.camera];

  return `
    <div class="dt-page">
      ${dtTopbar(scan.language, true)}
      ${DEMO_FAIL ? `<div class="demo-label" role="note"><strong>${escapeHtml(checkWords({ language: scan.language }).demo)}</strong> ${escapeHtml(checkWords({ language: scan.language }).demoNote)}</div>` : ''}
      <div class="dt-home">
        <div class="dt-home-main">
          <div class="dt-hero">
            <section class="dt-welcome" aria-labelledby="dt-welcome-h" lang="${L}">
              ${ringMark('dt-welcome-ring', '#DCD0FF', '', 5)}
              <span class="dt-welcome-spark">${STAR}</span>
              <div class="dt-welcome-text">
                <span class="dt-pill">${esc(w.gotContract)}</span>
                <h1 class="dt-home-h1" id="dt-welcome-h">${esc(w.h1[0])}<br><span class="dt-accent">${esc(w.h1[1])}<span class="dt-mark">${esc(w.h1[2])}</span></span></h1>
                <p class="dt-intro">${esc(w.intro)}</p>
              </div>
              <div class="dt-art" aria-hidden="true">
                <div class="dt-art-letter">
                  <span class="dt-art-head">LETTER OF OFFER</span>
                  <span class="dt-art-ref">§ 5.3</span>
                  <span class="dt-art-line" style="width:90%"></span>
                  <span class="dt-art-line dt-art-hl"></span>
                  <span class="dt-art-line" style="width:80%"></span>
                  <span class="dt-art-ref dt-art-ref2">§ 13.1</span>
                  <span class="dt-art-line" style="width:92%"></span>
                  <span class="dt-art-line" style="width:70%"></span>
                </div>
                <div class="dt-art-card">
                  <span class="dt-art-pill">${esc(w.artHigh)}</span>
                  <span class="dt-art-text">${esc(w.artText)}</span>
                  <span class="dt-art-foot">§ 5.3 · ${esc(w.artFoot)}</span>
                </div>
              </div>
            </section>

            <section class="dt-start" aria-labelledby="dt-start-h">
              <div class="dt-start-head" lang="${L}">
                <h2 id="dt-start-h">${esc(w.startTitle)}</h2>
                <div class="dt-seg" role="tablist" aria-label="${esc(w.startTabs)}">
                  ${tabBtn('pdf', DT_ICONS.upload)}${tabBtn('photos', icons.camera)}
                </div>
              </div>
              <div class="dt-scan-panel" id="dt-scan-panel" role="tabpanel" aria-labelledby="dt-tab-${tab}">
                ${panel}
              </div>
              ${situationFields(off, 'h3')}
              <div id="scan-status" aria-live="polite"></div>
              ${scan.stage !== 'pick' ? `
                ${detectedHtml()}
                <div class="dt-options">
                  <div>
                    <h3 class="h2">Explain it as</h3>
                    ${tileGroup('explain_mode', EXPLAIN_MODES, scan.explainMode, 'tiles-mode', 'Explain it as')}
                  </div>
                  ${typeChoicesShown() ? `<div>${typeChoiceHtml('h3')}</div>` : ''}
                </div>
                ${scan.stage === 'ready' ? `
                  <button class="btn btn-primary btn-block submit" type="button" id="scan-submit" ${off || (scan.detecting ? 'disabled' : '')}>
                    ${scan.busy ? '<span class="spinner" aria-hidden="true"></span> Working…' : 'Explain my contract'}
                  </button>` : ''}` : ''}
            </section>
          </div>

          <section class="dt-cando" aria-labelledby="dt-cando-h" lang="${L}">
            <div class="dt-cando-head">
              <h2 id="dt-cando-h">${esc(w.canDo[0])}<span class="dt-accent">${esc(w.canDo[1])}</span></h2>
              <div class="dt-sdgs">${w.sdgs.map(([sdg, name]) => `<span class="dt-sdg"><b>${esc(sdg)}</b> ${esc(name)}</span>`).join('')}</div>
            </div>
            <div class="dt-bento">
              <div class="dt-tile dt-tile-big">
                ${ringMark('dt-tile-deco', '#8761E6', '#FFD54A', 6)}
                <span class="dt-tile-eyebrow">${esc(b1[0])}</span>
                <h3 class="dt-tile-big-title">${esc(b1[1])}</h3>
                <p class="dt-tile-big-text">${esc(b1[2])}</p>
              </div>
              ${tiles.map(([num, title, text], i) => `
                <div class="dt-tile${i === 2 ? ' dt-tile-yellow' : ''}">
                  <span class="dt-tile-top"><span class="dt-tile-icon">${tileIcons[i]}</span><span class="dt-tile-num">${esc(num)}</span></span>
                  <h3 class="dt-tile-title">${esc(title)}</h3>
                  <p class="dt-tile-text">${esc(text)}</p>
                </div>`).join('')}
            </div>
          </section>
        </div>

        <aside class="dt-home-side" aria-label="${esc(w.askTitle)} · ${esc(w.recent)}">
          ${dtAskPanel()}
          ${dtRecent()}
          <p class="dt-side-note" lang="${L}">${esc(w.scamFoot)} <a href="tel:1799">1799</a></p>
        </aside>
      </div>
    </div>`;
}

// "Ask ClauseWise": the existing chatbot, about one of the saved contracts.
function dtAskPanel() {
  const w = dtWords(scan.language);
  const rows = contractsList || [];
  const off = rows.length ? '' : 'disabled';
  const about = rows.length > 1 ? `
    <label class="dt-ask-about"><span>${esc(w.askAbout)}</span>
      <select id="dt-ask-about">${rows.map((r) => `<option value="${r.id}">${escapeHtml(displayTitle(r.title))}</option>`).join('')}</select>
    </label>`
    : rows.length ? `<p class="dt-ask-about">${esc(w.askAbout)}: <strong>${escapeHtml(displayTitle(rows[0].title))}</strong></p>` : '';
  return `
    <section class="dt-ask" id="dt-ask" aria-labelledby="dt-ask-h" lang="${dtLang(scan.language)}">
      <div class="dt-ask-head">
        ${ringMark('dt-ask-mark', '#B9A2FF', '#FFD54A')}
        <div><h2 id="dt-ask-h">${esc(w.askTitle)}</h2><span class="dt-ask-sub">${esc(w.askSub)}</span></div>
      </div>
      <div class="dt-ask-body">
        <p class="dt-ask-hi">${esc(contractsList && !rows.length ? w.askNone : w.askHi)}</p>
        ${about}
        <div class="dt-ask-qs">${w.askQs.map((q) => `<button type="button" data-dt-q="${esc(q)}" ${off}>${esc(q)}</button>`).join('')}</div>
        <form class="dt-ask-box" id="dt-ask-form" autocomplete="off">
          <input id="dt-ask-input" type="text" maxlength="500" placeholder="${esc(w.askPlaceholder)}" aria-label="${esc(w.askLabel)}" ${off}>
          ${rows.length ? micButton('dt-ask-input', scan.language) : ''}
          <button class="dt-send" type="submit" aria-label="${esc(w.send)}" ${off}>${DT_ICONS.send}</button>
        </form>
      </div>
    </section>`;
}

// Opens the chosen contract's Ask tab and sends the question there.
async function dtAsk(question) {
  const q = String(question || '').trim();
  const id = document.getElementById('dt-ask-about')?.value || contractsList?.[0]?.id;
  if (!q || !id) return;
  location.hash = `#/contract/${id}/ask`;
  try {
    sendQuestion(await loadContract(id), q);
  } catch (err) {
    toast(err.message);
  }
}

function dtStatus(r, w) {
  if (r.to_check === null || r.to_check === undefined) return ['wait', w.status.notYet];
  if (r.scam_signs) return ['red', w.status.scam(r.scam_signs)];
  if (r.to_check) return ['yellow', w.status.check(r.to_check)];
  return ['calm', w.status.clear];
}

function dtRecent() {
  const w = dtWords(scan.language);
  let body;
  if (!contractsList) {
    body = contractsListError ? `<p class="dt-recent-none">${esc(w.recentFailed)}</p>`
      : '<p class="dt-recent-none"><span class="spinner" aria-hidden="true"></span></p>';
  } else if (!contractsList.length) {
    body = `<p class="dt-recent-none">${esc(w.recentNone)}</p>`;
  } else {
    body = `<ul class="dt-recent-list">${contractsList.slice(0, 4).map((r) => {
      const [tone, text] = dtStatus(r, w);
      const type = CONTRACT_TYPES.find((t) => t.id === r.contract_type);
      return `
        <li><a class="dt-recent-item" href="#/contract/${r.id}/summary">
          <span class="dt-recent-icon">${icons[type?.icon] || icons.doc}</span>
          <span class="dt-recent-body">
            <span class="dt-recent-title">${escapeHtml(displayTitle(r.title))}</span>
            <span class="dt-status dt-status-${tone}">${esc(text)}</span>
          </span>
          ${icons.chevSmall}
        </a></li>`;
    }).join('')}</ul>`;
  }
  return `
    <section class="dt-recent" id="dt-recent" aria-labelledby="dt-recent-h" lang="${dtLang(scan.language)}">
      <div class="dt-recent-head"><h2 id="dt-recent-h">${esc(w.recent)}</h2><a href="#/contracts">${esc(w.viewAll)}</a></div>
      ${body}
    </section>`;
}

// ----- Contract screen -----

// "Brightpath offer" -> "Brightpath <offer>", "Job offer – BrightPath" -> "Job offer – <BrightPath>"
function dtTitle(title) {
  const raw = displayTitle(title);
  const dash = raw.match(/^(.*\S\s+[–-]\s+)(\S.*)$/);
  const space = raw.lastIndexOf(' ');
  const [lead, last] = dash ? [dash[1], dash[2]] : space > 0 ? [raw.slice(0, space + 1), raw.slice(space + 1)] : ['', raw];
  return `${escapeHtml(lead)}<span class="dt-mark">${escapeHtml(last)}</span>`;
}

function dtContractHead(c, w, L) {
  const meta = [
    labelOf(CONTRACT_TYPES, c.contract_type),
    c.source_type === 'photo' ? 'Photo' : 'PDF',
    labelOf(LANGUAGES, c.language),
    formatDate(c.created_at),
  ].join(' · ');
  const langLabel = labelOf(LANGUAGES, c.language || 'en');
  return `
    <div class="dt-head">
      <div class="dt-head-main">
        <nav class="dt-crumb" aria-label="${esc(w.crumb)}" lang="${L}">
          <a href="#/contracts">${esc(w.nav.contracts)}</a> <span aria-hidden="true">/</span>
          <span aria-current="page">${escapeHtml(displayTitle(c.title))}</span>
        </nav>
        <h1 class="dt-h1">${dtTitle(c.title)}</h1>
        <div class="dt-meta" lang="${L}">
          <span class="dt-meta-chip" lang="en">${escapeHtml(meta)}</span>
          <a href="#/contract/${c.id}/situation">${esc(w.situation)}</a>
          <a href="#/contract/${c.id}/personal">${esc(w.personal)}</a>
        </div>
      </div>
      <div class="dt-actions" lang="${L}">
        ${speechSupported ? `<button class="dt-icon-btn" type="button" data-dt-speak aria-pressed="${isSpeaking()}" aria-label="${esc(isSpeaking() ? w.stopReading : w.readAloud)}" title="${esc(w.readAloud)}">${icons.speaker}</button>` : ''}
        <button class="dt-btn" type="button" data-dt-lang-btn aria-label="${esc(`${w.changeLang}: ${langLabel}`)}">${icons.globe}<span>${esc(langLabel)}</span></button>
        <a class="dt-btn" href="#/contract/${c.id}/comic">${icons.comicGrid}<span>${esc(w.comic)}</span></a>
        <a class="dt-btn dt-btn-primary" href="#/contract/${c.id}/decide" lang="${langAttr(c)}"><span>${esc(decideWords(c).title)}</span>${DT_ICONS.arrow}</a>
      </div>
    </div>`;
}

// A day and month in the English wording ("by 5 Nov 2026"), as a date.
function parseDayMonth(text) {
  const m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?/i)
    || text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
  if (!m) return null;
  const [day, mon] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
  const month = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const now = new Date();
  const date = new Date(m[3] ? Number(m[3]) : now.getFullYear(), month, Number(day), 23, 59);
  // No year given and long gone: it's next year's date.
  if (!m[3] && now - date > 180 * 86400000) date.setFullYear(date.getFullYear() + 1);
  return date;
}

// The reply-by date among the contract's key dates, if it has one: "within 24 hours" -> 24h,
// "by 5 Nov" -> the days left.
function replyWindow(c) {
  const d = (c.summary || []).find((s) => s.key === 'key_date' && s.found !== false
    && (/\b(reply|respond|accept|acceptance|sign and return|return the signed|lapse|expire)/i.test(s.plain_text || '')
      || (s.clause_numbers || []).some((n) => /accept/i.test(n))));
  if (!d) return null;
  const text = d.plain_text || '';
  const m = text.match(/\b(\d+)\s*(hours?|hrs?|days?|calendar days?|working days?|business days?|weeks?)\b/i);
  if (m) return { n: Number(m[1]), unit: /^h/i.test(m[2]) ? 'h' : /^w/i.test(m[2]) ? 'w' : 'd', fill: 1 };
  const date = parseDayMonth(text);
  if (!date) return null;
  const days = Math.max(Math.ceil((date - Date.now()) / 86400000), 0);
  return { n: days, unit: 'd', fill: Math.min(days / 14, 1) };
}

function dtReplyRing(c, w) {
  const r = replyWindow(c);
  if (!r) return '';
  const value = `${r.n}${w.units[r.unit]}`;
  const size = value.length <= 3 ? 23 : value.length <= 5 ? 18 : 14;
  return `
    <svg class="dt-ring" viewBox="0 0 100 100" role="img" aria-label="${esc(`${value} ${w.toReply}`)}">
      <circle cx="50" cy="50" r="42" fill="#5A31C4" stroke="#8761E6" stroke-width="10"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="#FFD54A" stroke-width="10" stroke-linecap="round" stroke-dasharray="${Math.round(264 * r.fill)} 264" transform="rotate(-90 50 50)"/>
      <text x="50" y="${size > 18 ? 48 : 47}" text-anchor="middle" font-size="${size}" font-weight="800" fill="#FFFFFF" stroke="none">${esc(value)}</text>
      <text x="50" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#FFFFFF" stroke="none">${esc(w.toReply)}</text>
    </svg>`;
}

// Violet "At a glance" banner: the real counts, once the final (double-checked) answer is ready.
function dtBanner(c, w, L) {
  const ready = Boolean(finalState(c));
  const items = c.risks ? riskList(c) : [];
  const scam = items.filter((i) => i.kind === 'scam_sign').length;
  let pill = '';
  let title;
  let note = '';
  if (!ready) {
    const cw = checkWords(c);
    title = !c.summary ? cw.reading : !c.risks || (!c.tailored && !c.tailoredError) ? cw.finding : cw.checking;
  } else if (!c.risks) {
    title = w.riskFailed;
  } else if (scam) {
    title = w.scamHead(scam);
    note = w.bannerNote;
    if (asksToPay(items)) pill = w.dontPay;
  } else if (items.length) {
    title = w.checkHead(items.length);
    note = w.bannerNote;
  } else {
    title = w.noneHead;
    note = w.noneNote;
  }
  const stat = (n, label, yellow = false) => `
    <div class="dt-stat${yellow ? ' dt-stat-yellow' : ''}"><b>${n ?? '–'}</b><span>${esc(label)}</span></div>`;
  return `
    <section class="dt-banner" aria-label="${esc(w.glance)}" lang="${L}">
      ${ringMark('dt-banner-deco', '#7D55E0', '', 5)}
      <div class="dt-banner-main">
        ${ready ? dtReplyRing(c, w) : ''}
        <div class="dt-banner-text">
          ${pill ? `<span class="dt-pill">${esc(pill)}</span>` : ''}
          <h2>${ready ? '' : '<span class="spinner" aria-hidden="true"></span>'}${esc(title)}</h2>
          ${note ? `<p>${esc(note)}</p>` : ''}
        </div>
      </div>
      <div class="dt-stats">
        ${stat(c.clauses?.length || null, w.stats.clauses)}
        ${stat(ready && c.risks ? items.length : null, w.stats.check, true)}
        ${stat(ready && c.tailored ? c.tailored.plan.length : null, w.stats.steps)}
      </div>
    </section>`;
}

// The clause on show in the "Original contract" panel: { id, numbers, quote }.
let dtViewing = null;

function dtClauseList(c) {
  const v = dtViewing?.id === c.id ? dtViewing : null;
  const w = dtWords(c.language);
  return (c.clauses || []).map((cl) => {
    const target = v && cl.number === v.numbers[0];
    const flagged = v && v.numbers.includes(cl.number);
    const num = cl.number === 'Intro' ? '' : `<strong class="dt-cl-num">${escapeHtml(dtRef(cl.number))}</strong> `;
    return `
      <p class="dt-cl${flagged ? ' dt-cl-flagged' : ''}${target ? ' dt-cl-target' : ''}">${num}${target && v.quote ? highlight(cl.text, v.quote) : escapeHtml(cl.text)}${target ? `<span class="dt-cl-viewing" lang="${dtLang(c.language)}">${esc(w.viewing)}</span>` : ''}</p>`;
  }).join('');
}

function dtOriginal(c, w, L) {
  const n = c.clauses?.length || 0;
  return `
    <section class="dt-orig" aria-labelledby="dt-orig-h">
      <div class="dt-orig-head" lang="${L}">
        <h2 id="dt-orig-h">${esc(w.original)}</h2>
        <span class="dt-orig-count">${n ? esc(w.clauses(n)) : ''}</span>
      </div>
      <div class="dt-orig-title">${escapeHtml(displayTitle(c.title))}</div>
      <div class="dt-clauses" id="dt-clauses" tabindex="0" role="region" aria-label="${esc(w.original)}">
        ${n ? dtClauseList(c) : '<p class="dt-cl"><span class="spinner" aria-hidden="true"></span></p>'}
      </div>
      <p class="visually-hidden" id="dt-live" aria-live="polite"></p>
    </section>`;
}

// Highlights a point's clause in the "Original contract" panel and scrolls it into view there.
function dtShowClause(c, numbers, quote = '', from = null) {
  if (!c || !numbers?.length) return;
  dtViewing = { id: c.id, numbers, quote };
  const list = document.getElementById('dt-clauses');
  if (!list) return;
  list.innerHTML = dtClauseList(c);
  document.querySelectorAll('.dt-selected').forEach((el) => el.classList.remove('dt-selected'));
  from?.classList.add('dt-selected');
  const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const target = list.querySelector('.dt-cl-target');
  if (target) list.scrollTo({ top: Math.max(target.offsetTop - 12, 0), behavior: smooth });
  // The panel itself may be off screen (narrower desktops put it above the rest).
  const box = list.closest('.dt-orig').getBoundingClientRect();
  if (box.bottom < 140 || box.top > window.innerHeight - 140) list.closest('.dt-orig').scrollIntoView({ behavior: smooth, block: 'start' });
  const live = document.getElementById('dt-live');
  if (live) live.textContent = dtWords(c.language).showing(numbers.map(dtRef).join(', '));
}

// Steps of the plan ticked off on this device (kept in the browser only).
const planDoneCache = new Map();
const planKey = (c) => `clausewise-plan-done:${c.id}`;
function planDone(c) {
  if (!planDoneCache.has(c.id)) {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(planKey(c)) || '[]');
    } catch { /* storage blocked or bad value */ }
    planDoneCache.set(c.id, Array.isArray(list) ? list : []);
  }
  return planDoneCache.get(c.id);
}
function togglePlanStep(c, i) {
  const step = c.tailored?.plan?.[i];
  if (!step) return;
  const done = planDone(c);
  const next = done.includes(step.text) ? done.filter((t) => t !== step.text) : [...done, step.text];
  planDoneCache.set(c.id, next);
  try {
    localStorage.setItem(planKey(c), JSON.stringify(next));
  } catch { /* kept until the page closes */ }
  const card = document.getElementById('dt-plan');
  if (card) card.outerHTML = dtPlan(c, dtWords(c.language));
  document.querySelector(`[data-dt-step="${i}"]`)?.focus();
}

function dtHelpLink(key) {
  const h = HELP_LINKS[key] || HELP_LINKS.probono;
  const outside = h.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  return `<a class="dt-help" href="${h.href}"${outside}><span>${h.href.startsWith('tel:') ? icons.phone : icons.building} ${esc(h.label)}</span></a>`;
}

// "Your plan before you sign" (PRD FR7) in the right column.
function dtPlan(c, w) {
  const card = (badge, inner) => `
    <section class="dt-card dt-plan" id="dt-plan" aria-labelledby="plan">
      <div class="dt-card-head"><h2 id="plan">${esc(w.planTitle)}</h2>${badge}</div>
      ${inner}
    </section>`;
  if (c.tailoredError) return card('', `${notice('error', c.tailoredError)}${retryButton('tailored')}`);
  if (!c.tailored || !finalState(c)) return card('', `<p class="dt-plan-wait"><span class="spinner" aria-hidden="true"></span> ${esc(w.planMaking)}</p>`);
  const plan = c.tailored.plan || [];
  const about = c.situation
    ? `<a class="dt-plan-link" href="#/contract/${c.id}/situation">${esc(w.editAbout)}</a>`
    : `<p class="dt-plan-note">${esc(w.onlyContract[0])}<a href="#/contract/${c.id}/situation">${esc(w.onlyContract[1])}</a>${esc(w.onlyContract[2])}</p>`;
  if (!plan.length) return card('', `<p class="dt-plan-note">${esc(w.planNone)}</p>${about}`);
  const tr = tailoredTr(c);
  const done = planDone(c);
  const isDone = (s) => done.includes(s.text);
  const count = plan.filter(isDone).length;
  const next = plan.findIndex((s) => !isDone(s));
  const steps = plan.map((s, i) => `
    <li class="dt-step${isDone(s) ? ' done' : ''}${i === next ? ' next' : ''}">
      <button class="dt-step-check" type="button" data-dt-step="${i}" aria-pressed="${isDone(s)}" aria-label="${esc(w.markDone(i + 1))}"><span>${isDone(s) ? DT_ICONS.tick : i + 1}</span></button>
      <span class="dt-step-body">
        <span class="dt-step-text">${s.checked === 'unclear' ? unclearHtml(c, s.clause_numbers) : escapeHtml(tr?.plan?.[i] || s.text)}</span>
        <span class="dt-step-links">
          ${(s.clause_numbers || []).map((n) => `<button class="dt-ref" type="button" data-dt-clause="${escapeHtml(n)}" aria-controls="dt-clauses"><span>${escapeHtml(dtRef(n))}</span></button>`).join('')}
          ${dtHelpLink(s.help)}
        </span>
      </span>
    </li>`).join('');
  return card(`<span class="dt-count">${esc(w.planOf(count, plan.length))}</span>`, `
    <div class="dt-progress" aria-hidden="true"><span style="width:${Math.round((count / plan.length) * 100)}%"></span></div>
    <ol class="dt-steps">${steps}</ol>
    ${about}`);
}

// "You make the call": the four options from "You decide" (PRD FR8), saved the same way.
function dtCall(c, w) {
  const dw = decideWords(c);
  const choice = c.decisions?.choice || null;
  return `
    <section class="dt-call" id="dt-call" aria-labelledby="dt-call-h">
      ${ringMark('dt-call-deco', '#2E2363', '#FFD54A', 6)}
      <span class="dt-call-eyebrow">${esc(w.finalSay)}</span>
      <h2 id="dt-call-h">${esc(w.call[0])}<span>${esc(w.call[1])}</span></h2>
      <p>${esc(w.callText)}</p>
      <div class="dt-call-grid" role="group" aria-label="${esc(dw.optionsHeading)}" lang="${langAttr(c)}">
        ${CHOICE_ORDER.map((k) => `<button class="dt-call-btn" type="button" data-choice="${k}" aria-pressed="${choice === k}">${choice === k ? DT_ICONS.tick : ''}${esc(dw.options[k])}</button>`).join('')}
      </div>
      ${choice ? `
        <div class="dt-call-next" role="status" lang="${langAttr(c)}">
          <p><strong>${esc(dw.options[choice])}:</strong> ${esc(dw.next[choice])}</p>
          ${CHOICE_HELP[choice].length ? `<div class="dt-call-help">${CHOICE_HELP[choice].map(dtHelpLink).join('')}</div>` : ''}
        </div>` : ''}
    </section>`;
}

function renderDesktopContract(c, tab, openClause) {
  // The same work, in the same order, as the phone layout (renderContract).
  if (!c.summary && !c.summaryError) loadAi(c, 'summary');
  if (!c.risks && !c.risksError) loadAi(c, 'risks');
  if (c.summary && c.risks && !c.tailored && !c.tailoredError) loadAi(c, 'tailored');
  if (c.summary && c.risks && (c.tailored || c.tailoredError) && !finalState(c)) loadCheck(c);

  const w = dtWords(c.language);
  const L = dtLang(c.language);
  const body = tab === 'summary' ? renderSummary(c)
    : tab === 'risks' ? renderRisks(c)
      : tab === 'comic' ? renderComic(c, openClause)
        : renderAsk(c, openClause);
  return `
    <div class="dt-page">
      ${dtTopbar(c.language)}
      ${dtContractHead(c, w, L)}
      ${typeNoteHtml(c)}
      ${dtBanner(c, w, L)}
      <div class="dt-cols">
        ${dtOriginal(c, w, L)}
        <section class="dt-mid" aria-label="${esc(w.plainWords)}" lang="${L}">
          <div class="tabs" role="tablist" aria-label="Contract sections" lang="en">${contractTabs(c, tab)}</div>
          <section id="tab-panel" role="tabpanel" aria-labelledby="tab-${tab}" lang="en">${body}</section>
          <p class="dt-mid-foot">${esc(w.notLegal)}</p>
        </section>
        <aside class="dt-right" aria-label="${esc(w.sidePanel)}" lang="${L}">
          ${dtPlan(c, w)}
          ${/* The mockup's "Agents at work" card goes here once FR11 (agents) exists. */ ''}
          ${dtCall(c, w)}
        </aside>
      </div>
    </div>`;
}

// Clicks that only exist in the desktop layout. Returns true when handled.
function dtClick(e) {
  if (!isDesktop()) return false;
  const { name, params } = parseRoute();
  const c = name === 'contract' ? contractCache.get(params[0]) : null;
  const clauseBtn = e.target.closest('[data-dt-clause]');
  if (clauseBtn) {
    dtShowClause(c, clauseBtn.dataset.dtClause.split('|'), '', clauseBtn.closest('.point-row, .dt-ref'));
    return true;
  }
  // A warning on the Risks tab: its clause, with the quoted words marked, instead of a new screen.
  const riskLink = e.target.closest('a.risk-item');
  if (riskLink && c?.risks && document.getElementById('dt-clauses')) {
    const r = c.risks.items[Number(riskLink.getAttribute('href').split('/').pop())];
    if (r) {
      e.preventDefault();
      dtShowClause(c, r.clause_numbers, r.quote, riskLink.closest('.risk-card'));
      return true;
    }
  }
  const step = e.target.closest('[data-dt-step]');
  if (step && c) {
    togglePlanStep(c, Number(step.dataset.dtStep));
    return true;
  }
  if (e.target.closest('[data-dt-speak]')) {
    toggleReadAloud();
    return true;
  }
  if (e.target.closest('[data-dt-lang-btn]')) {
    openLanguageSheet();
    return true;
  }
  const scanTab = e.target.closest('[data-dt-tab]');
  if (scanTab) {
    dtScanTab = scanTab.dataset.dtTab;
    render().then(() => document.getElementById(`dt-tab-${dtScanTab}`)?.focus());
    return true;
  }
  const q = e.target.closest('[data-dt-q]');
  if (q) {
    dtAsk(q.dataset.dtQ);
    return true;
  }
  return false;
}

// Dropping a PDF or photos on the drop zone.
screen.addEventListener('dragover', (e) => {
  const zone = e.target.closest?.('.dt-drop');
  if (!zone || scan.busy) return;
  e.preventDefault();
  zone.classList.add('dt-drop-over');
});
screen.addEventListener('dragleave', (e) => {
  e.target.closest?.('.dt-drop')?.classList.remove('dt-drop-over');
});
screen.addEventListener('drop', (e) => {
  const zone = e.target.closest?.('.dt-drop');
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove('dt-drop-over');
  if (!scan.busy) dtFiles([...(e.dataTransfer?.files || [])]);
});

// ---------- Router ----------

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}

// Top-level screens show the bottom nav; inner screens (a contract) show the header
// with a back button instead, as in the mockups.
// `bare` hides the header too, for screens that draw their own top bar ("Your document").
// What the current screen's chrome is, for the desktop sidebar and Back link.
let chrome = { title: '', nav: 'home', inner: false, bare: false };

function setChrome({ title = '', nav, inner = false, bare = false, tools = false, comicHref = null }) {
  chrome = { title, nav, inner, bare };
  pageTitle.textContent = title;
  header.hidden = !inner || bare;
  bottomNav.hidden = inner;
  document.body.classList.toggle('no-nav', inner);
  langBtn.hidden = !tools;
  speakBtn.hidden = !tools || !speechSupported;
  comicBtn.hidden = !comicHref;
  if (comicHref) comicBtn.href = comicHref;

  document.querySelectorAll('.bottom-nav a').forEach((a) => {
    const active = a.dataset.nav === nav;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// Each render gets a number so a slow network reply can't overwrite a newer screen.
let renderSeq = 0;
let lastRouteKey = '';

async function render() {
  const seq = ++renderSeq;
  applyLayout();
  const desk = isDesktop();
  const { name, params } = parseRoute();
  redactor = null; // set again below for a contract with "Hide these too" switched on
  const routeKey = `${name}/${params[0] || ''}`;
  const isNewScreen = routeKey !== lastRouteKey;
  lastRouteKey = routeKey;
  loadContractsList(); // Recent contracts (desktop) and the Deadlines page both need the saved list

  // `full`: a desktop page drawn by the desktop layout itself; other screens are wrapped in it.
  const show = (html, full = false) => {
    if (seq !== renderSeq) return;
    // Keep the "Original contract" panel where it was when the same contract is drawn again.
    const clauses = document.getElementById('dt-clauses');
    const keep = !isNewScreen && clauses ? clauses.scrollTop : null;
    screen.innerHTML = desk && !full ? dtPage(html) : html;
    if (keep !== null) {
      const again = document.getElementById('dt-clauses');
      if (again) again.scrollTop = keep;
    }
    if (isNewScreen) window.scrollTo(0, 0);
    renderSide();
    renderFrameBar();
  };
  const showAsync = async (promise, full = false) => {
    if (!screen.innerHTML.includes('class="tabs"') || isNewScreen) show('<div class="loading"><span class="spinner"></span> Loading…</div>');
    try {
      show(await promise, full);
    } catch (err) {
      show(notice('error', err.message));
    }
  };

  switch (name) {
    case 'home':
      setChrome({ nav: 'home' });
      show(desk ? renderDesktopHome() : renderHome(), desk);
      if (desk && dtFocusStart) {
        // "Scan a contract" in the sidebar: straight to the start card.
        dtFocusStart = false;
        document.querySelector('.dt-start')?.scrollIntoView({ block: 'center' });
        document.querySelector('.dt-seg-btn[aria-selected="true"]')?.focus({ preventScroll: true });
      }
      return;
    case 'scan':
      // Scanning now lives on Home (as in the mockup); keep old links working.
      if (desk) dtFocusStart = true;
      location.replace('#/home');
      return;
    case 'contracts':
      setChrome({ nav: 'contracts' });
      return showAsync(renderContracts());
    case 'deadlines':
      setChrome({ nav: 'deadlines' });
      return show(renderDeadlines());
    case 'experts':
      setChrome({ nav: 'experts' });
      return show(renderExperts());
    case 'contract': {
      const [id, tabParam, extra] = params;
      if (tabParam === 'personal') {
        // This screen lists the details themselves, so nothing is hidden here.
        setChrome({ title: 'Personal details', nav: 'contracts', inner: true });
        await showAsync(loadContract(id).then((c) => renderPersonal(c, extra)));
        return;
      }
      if (tabParam === 'decide') {
        await showAsync(loadContract(id).then((c) => {
          setChrome({ title: decideWords(c).title, nav: 'contracts', inner: true });
          redactor = makeRedactor(c, [c.risks?.company?.payee]); // like Risks: the payee stays visible
          return renderDecide(c);
        }));
        return;
      }
      if (tabParam === 'situation') {
        setChrome({ title: 'Your situation', nav: 'contracts', inner: true });
        await showAsync(loadContract(id).then(renderSituation));
        return;
      }
      if (tabParam === 'doc') {
        setChrome({ nav: 'contracts', inner: true, bare: true });
        await showAsync(loadContract(id).then((c) => {
          redactor = makeRedactor(c, [c.risks?.company?.payee]); // part of Risks: payee stays visible
          return renderDocument(c, extra);
        }));
        // Bring the highlighted clause into the middle of the screen, above the bottom sheet.
        document.getElementById('doc-target')?.scrollIntoView({ block: 'center' });
        return;
      }
      const tab = CONTRACT_TABS.some((t) => t.id === tabParam) ? tabParam : 'summary';
      setChrome({
        title: TAB_TITLES[tab],
        nav: 'contracts',
        inner: true,
        tools: true,
        // Only the Overview has the Comic shortcut (mockup 2); other tabs need the room for their title.
        comicHref: tab === 'summary' ? `#/contract/${id}/comic` : null,
      });
      // comic/<clause> opens that clause's comic; ask/<clause> starts a question about it.
      const openClause = (tab === 'comic' || tab === 'ask') && extra ? decodeURIComponent(extra) : null;
      await showAsync(loadContract(id).then((c) => {
        // "Hide these too": names etc. are hidden everywhere, except the payee in Risks.
        redactor = makeRedactor(c, tab === 'risks' ? [c.risks?.company?.payee] : []);
        return desk ? renderDesktopContract(c, tab, openClause) : renderContract(c, tab, openClause);
      }), desk);
      if (tab === 'comic' && openClause) document.querySelector('.comic-card.open')?.scrollIntoView({ block: 'start' });
      if (tab === 'ask') {
        scrollChatToEnd();
        if (openClause) document.getElementById('ask-input')?.focus();
      }
      return;
    }
    default:
      location.replace('#/home');
  }
}

screen.addEventListener('click', (e) => {
  // "No more typing" (PRD FR9): mic buttons, photo pages, problems and detection.
  if (micClick(e) || scanClick(e)) return;
  // Desktop layout: clause panel, plan steps, header buttons, the start card's tabs, Ask ClauseWise.
  if (dtClick(e)) return;


  // "You decide" (PRD FR8)
  const markBtn = e.target.closest('[data-mark]');
  if (markBtn) {
    const c = contractCache.get(parseRoute().params[0]);
    if (!c) return;
    const index = Number(markBtn.dataset.index);
    setMark(c, index, markBtn.dataset.mark);
    // Update just this card (and the count on the "You decide" card), keeping the scroll position.
    const card = markBtn.closest('.risk-card');
    const mark = markOf(c, index);
    card.querySelectorAll('[data-mark]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mark === mark)));
    card.classList.toggle('risk-disagreed', mark === 'wrong');
    card.querySelector('.disagreed-pill')?.remove();
    if (mark === 'wrong') {
      card.querySelector('.level-pill')?.insertAdjacentHTML('afterend', `<span class="disagreed-pill" lang="${langAttr(c)}">${escapeHtml(decideWords(c).disagreed)}</span>`);
    }
    const decide = document.querySelector('.decide-card');
    if (decide) decide.outerHTML = decideCard(c);
    return;
  }
  const choiceBtn = e.target.closest('[data-choice]');
  if (choiceBtn) {
    const c = contractCache.get(parseRoute().params[0]);
    if (!c) return;
    const choice = c.decisions?.choice === choiceBtn.dataset.choice ? null : choiceBtn.dataset.choice;
    c.decisions = { ...c.decisions, choice };
    saveDecision(c, { choice });
    const slot = document.getElementById('options-slot');
    if (slot) slot.innerHTML = optionsSection(c);
    // Desktop "You make the call" card.
    const call = document.getElementById('dt-call');
    if (call) {
      call.outerHTML = dtCall(c, dtWords(c.language));
      document.querySelector(`#dt-call [data-choice="${choiceBtn.dataset.choice}"]`)?.focus();
    }
    return;
  }
  if (e.target.closest('[data-make-draft], [data-new-draft], [data-copy-draft], [data-update-plain]')) {
    const c = contractCache.get(parseRoute().params[0]);
    if (!c) return;
    const btn = e.target.closest('button');
    if (btn.matches('[data-copy-draft]')) copyDraft(c, btn);
    else if (btn.matches('[data-update-plain]')) updatePlain(c);
    else if (btn.matches('[data-make-draft]') || confirm(decideWords(c).replaceDraft)) makeDraft(c);
    return;
  }

  const tabBtn = e.target.closest('.tab');
  if (tabBtn) {
    const { params } = parseRoute();
    location.hash = `#/contract/${params[0]}/${tabBtn.dataset.tab}`;
    return;
  }
  const pointBtn = e.target.closest('button.point-row');
  if (pointBtn) {
    togglePoint(pointBtn);
    return;
  }
  const del = e.target.closest('[data-delete]');
  if (del) {
    deleteContract(del.dataset.delete, del);
    return;
  }
  if (e.target.closest('[data-listen]')) {
    if (isSpeaking()) stopSpeaking();
    else toggleReadAloud();
    return;
  }
  const retryTranslate = e.target.closest('[data-retry-translate]');
  if (retryTranslate) {
    const c = contractCache.get(parseRoute().params[0]);
    if (c) {
      delete c.translateErrors[`${c.id}:${c.language}:${retryTranslate.dataset.retryTranslate}`];
      render();
    }
    return;
  }
  const msgChip = e.target.closest('.msg-chip');
  if (msgChip) {
    toggleMsgClause(msgChip);
    return;
  }
  const askChip = e.target.closest('.ask-chip');
  if (askChip) {
    sendQuestion(contractCache.get(parseRoute().params[0]), askChip.dataset.q);
    return;
  }
  if (e.target.closest('[data-ask-retry]')) {
    const c = contractCache.get(parseRoute().params[0]);
    if (c?.askError) sendQuestion(c, c.askError.question);
    return;
  }
  const comicHead = e.target.closest('.comic-head');
  if (comicHead) {
    const { params } = parseRoute();
    const open = comicHead.getAttribute('aria-expanded') === 'true';
    location.hash = `#/contract/${params[0]}/comic${open ? '' : `/${encodeURIComponent(comicHead.dataset.comic)}`}`;
    return;
  }
  if (e.target.closest('[data-jump-plan]')) {
    document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const saveBtn = e.target.closest('[data-save-situation], [data-clear-situation]');
  if (saveBtn) {
    const c = contractCache.get(parseRoute().params[0]);
    const text = saveBtn.matches('[data-clear-situation]') ? '' : document.getElementById('situation-edit')?.value || '';
    if (c) saveSituation(c, text, saveBtn);
    return;
  }
  if (e.target.closest('[data-hide-personal]')) {
    const c = contractCache.get(parseRoute().params[0]);
    if (c?.personal) toggleHidePersonal(c);
    return;
  }
  if (e.target.closest('[data-retry-personal]')) {
    const c = contractCache.get(parseRoute().params[0]);
    if (c) {
      loadPersonal(c);
      render();
    }
    return;
  }
  const retryComic = e.target.closest('[data-retry-comic]');
  if (retryComic) {
    const { params } = parseRoute();
    const c = contractCache.get(params[0]);
    if (c) {
      loadComic(c, retryComic.dataset.retryComic);
      render();
    }
    return;
  }
  const retry = e.target.closest('[data-retry]');
  if (retry) {
    const { params } = parseRoute();
    const c = contractCache.get(params[0]);
    if (c) {
      delete c[`${retry.dataset.retry}Error`];
      loadAi(c, retry.dataset.retry);
      render();
    }
    return;
  }
  if (e.target.closest('#remove-file')) {
    resetUpload();
    render();
    return;
  }
  if (e.target.closest('#scan-submit')) submitScan();
});

screen.addEventListener('submit', (e) => {
  if (e.target.id === 'dt-ask-form') {
    e.preventDefault();
    dtAsk(document.getElementById('dt-ask-input')?.value);
    return;
  }
  if (e.target.id !== 'ask-form') return;
  e.preventDefault();
  const question = document.getElementById('ask-input').value.trim();
  if (question) sendQuestion(contractCache.get(parseRoute().params[0]), question);
});

// Arrow keys move between tabs (standard tablist keyboard pattern): the contract tabs, and the
// desktop start card's Upload PDF / Take photos / Speak.
screen.addEventListener('keydown', (e) => {
  const kind = ['tab', 'dt-seg-btn'].find((k) => e.target.classList.contains(k));
  if (!kind) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...screen.querySelectorAll(`.${kind}`)];
  const i = tabs.indexOf(e.target);
  tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].click();
});

// Where Back goes (the phone header's back button, the desktop Back link).
function backTarget() {
  const { name, params } = parseRoute();
  if (name === 'contract' && (params[1] === 'personal' || params[1] === 'situation')) return `#/contract/${params[0]}/summary`;
  if (name === 'contract' && params[1] === 'decide') return `#/contract/${params[0]}/risks`;
  return name === 'contract' ? '#/contracts' : '#/home';
}

backBtn.addEventListener('click', () => {
  location.hash = backTarget();
});

window.addEventListener('hashchange', async () => {
  stopSpeaking(); // reading belongs to the screen it was started on
  await render();
  // Keep keyboard focus on the selected tab after a tab switch re-renders the screen.
  const selected = screen.querySelector('.tab[aria-selected="true"]');
  if (selected && document.activeElement === document.body) selected.focus();
});
render();

// ---------- PWA ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// ---------- Whole-screen translation ----------
// Every English label on the screen is looked up in ui-text.js (exact matches, then a few patterns for
// text with numbers in it) and replaced in place. The contract's own wording is never in that table, so
// it stays as it was written. AI summaries, warnings and comics already come in the chosen language.

const LANG_HTML = { en: 'en', zh: 'zh-Hans', ms: 'ms', ta: 'ta' };
let localizing = false;

function translateText(lang, t) {
  const table = UI_TEXT[lang];
  if (!table) return null;
  if (Object.hasOwn(table, t)) return table[t];
  for (const [re, fn] of UI_PATTERNS[lang] || []) {
    const m = re.exec(t);
    if (m) return fn(m, (s) => translateText(lang, s) ?? s);
  }
  return null;
}

function localizeDom() {
  if (localizing) return;
  const lang = shellLang() || 'en';
  document.documentElement.lang = LANG_HTML[lang] || 'en';
  if (!UI_TEXT[lang]) return;
  localizing = true;
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    for (const node of nodes) {
      const el = node.parentElement;
      if (!el || el.closest('script, style, svg, [data-keep]')) continue;
      const raw = node.nodeValue;
      const t = raw.trim().replace(/\s+/g, ' ');
      if (!t) continue;
      const tr = translateText(lang, t);
      if (tr && tr !== t) node.nodeValue = raw.replace(raw.trim(), tr);
    }
    for (const el of document.body.querySelectorAll('[aria-label], [title], [placeholder], [alt]')) {
      if (el.closest('svg, script, style, [data-keep]')) continue;
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const tr = translateText(lang, v.trim().replace(/\s+/g, ' '));
        if (tr && tr !== v) el.setAttribute(a, tr);
      }
    }
  } finally {
    localizing = false;
  }
}

// Re-translates whenever a screen is drawn or a label changes.
let localizeTimer = 0;
const queueLocalize = () => {
  if (localizing || localizeTimer) return;
  localizeTimer = setTimeout(() => {
    localizeTimer = 0;
    localizeDom();
  }, 16);
};
new MutationObserver(queueLocalize).observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'],
});
// The first screen was drawn before this was set up, so translate it now too.
queueLocalize();
