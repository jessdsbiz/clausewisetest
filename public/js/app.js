// ClauseWise app shell: hash router, bottom nav, scan screen and contract tabs.

import { api } from './api.js';
import { pdfToText, preparePhoto, readPage } from './extract.js';
import { composePanel } from './comic-kit.js';
import { hidePersonalNumbers } from './privacy.js';
import { speak, stop as stopSpeaking, speechSupported, isSpeaking, onSpeakingChange, onSpeechError } from './speech.js';
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
  language: 'en',
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
    types: { job_offer: 'Job offer', rental: 'Rental', phone_subscription: 'Phone / Subscription', loan: 'Loan', business: 'Business', other: 'Other' },
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
    types: { job_offer: '工作录用', rental: '租房', phone_subscription: '电话 / 订阅', loan: '贷款', business: '商业', other: '其他' },
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
    types: { job_offer: 'Tawaran kerja', rental: 'Sewa', phone_subscription: 'Telefon / Langganan', loan: 'Pinjaman', business: 'Perniagaan', other: 'Lain-lain' },
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
    types: { job_offer: 'வேலை வாய்ப்பு', rental: 'வாடகை', phone_subscription: 'தொலைபேசி / சந்தா', loan: 'கடன்', business: 'வணிகம்', other: 'மற்றவை' },
    mic: 'தட்டச்சுக்குப் பதிலாகப் பேசுங்கள்', listening: 'கேட்கிறது… நிறுத்த தட்டவும்',
    micBlocked: 'குரல் உள்ளீட்டைப் பயன்படுத்த மைக்ரோஃபோனை அனுமதிக்கவும்.', noSpeech: 'எதுவும் கேட்கவில்லை. மைக்கைத் தட்டி மீண்டும் முயற்சிக்கவும்.',
  },
};
const scanWords = (lang = scan.language) => SCAN_WORDS[lang] || SCAN_WORDS.en;

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
  return `
    <div class="detected" lang="${scan.language}">
      <span class="detected-icon">${icons.sparkle}</span>
      <span class="detected-body">
        <span class="detected-main">${escapeHtml(w.detected(w.types[scan.contractType] || w.types.other, d.other_party))} ·
          <button class="link-btn" type="button" data-change-type>${escapeHtml(w.change)}</button></span>
        ${extra.length ? `<span class="detected-extra">${escapeHtml(extra.join(' · '))}</span>` : ''}
      </span>
    </div>`;
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
        <p class="photo-note">${icons.camera} ${escapeHtml(scanWords().nric)} Photos are read by AI before we can hide anything.</p>`}
      ${readStatusHtml()}
      <p class="scan-note">${icons.lock} Your original file is never saved · delete anytime</p>
    </section>

    ${detectedHtml()}

    <h2 class="h2">Explain it as</h2>
    ${tileGroup('explain_mode', EXPLAIN_MODES, scan.explainMode, 'tiles-mode', 'Explain it as')}

    <h2 class="h2" id="type-heading">What kind of contract?</h2>
    ${tileGroup('contract_type', CONTRACT_TYPES, scan.contractType, 'tiles-type', 'What kind of contract?')}

    <h2 class="h2"><label for="situation-input">Tell us about you</label> <span class="h2-tag">Optional</span></h2>
    <div class="voice-box">
      <textarea class="situation-input" id="situation-input" maxlength="${SITUATION_MAX}" rows="3"
        placeholder="${escapeHtml(SITUATION_HINT)}" aria-describedby="situation-note" ${off}>${escapeHtml(scan.situation)}</textarea>
      ${micButton('situation-input', scan.language)}
    </div>
    <p class="situation-note" id="situation-note">${icons.lock} ${escapeHtml(SITUATION_NOTE)} We use your words to show what matters most for you.</p>

    <div id="scan-status" aria-live="polite"></div>
    ${scan.stage === 'ready' ? `
      <button class="btn btn-primary btn-block submit" type="button" id="scan-submit" ${off}>
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
    if (!scan.typeTouched) scan.contractType = d.contract_type;
  } catch (err) {
    scan.detectError = err.message;
  } finally {
    scan.detecting = false;
    render();
  }
}

async function submitScan() {
  if (scan.stage !== 'ready' || !scan.text || scan.busy) return;
  scan.busy = true;
  render();
  try {
    setScanStatus(notice('info', 'Saving…'));
    const isPdf = Boolean(scan.file);
    const d = scan.detected;
    const typeName = CONTRACT_TYPES.find((t) => t.id === scan.contractType)?.label || 'Contract';
    // Only the masked text is sent. The original PDF or photos are not uploaded or kept.
    const { id } = await api('contracts', {
      method: 'POST',
      what: 'saving your contract',
      json: {
        raw_text: scan.text,
        file_name: isPdf ? scan.file.name || 'contract.pdf' : `photos-${scan.pages.length}-pages.jpg`,
        title: d?.other_party ? `${typeName} – ${d.other_party}` : isPdf ? '' : `${typeName} (${scan.pages.length} photo${scan.pages.length > 1 ? 's' : ''})`,
        source_type: isPdf ? 'pdf' : 'photo',
        contract_type: scan.contractType,
        explain_mode: scan.explainMode,
        language: scan.language,
        // Masked like the contract before it leaves the device.
        situation: hidePersonalNumbers(scan.situation.slice(0, SITUATION_MAX)).text.trim(),
      },
    });

    resetUpload(); // the photos are dropped here
    scan.situation = '';
    scan.busy = false;
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
  } else if (t.id === 'photo-input' || t.id === 'camera-input') {
    addPhotos(t.files);
  } else if (t.id === 'comic-clause' && t.value) {
    location.hash = `#/contract/${parseRoute().params[0]}/comic/${encodeURIComponent(t.value)}`;
  } else if (t.id === 'lang-select') {
    scan.language = t.value;
    render();
  } else if (t.name === 'contract_type') {
    scan.contractType = t.value;
    scan.typeTouched = true;
    // The detected line names the type the user picked.
    const detected = document.querySelector('.detected');
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
  } else if (btn.matches('[data-change-type]')) {
    const tiles = document.querySelector('.tiles-type');
    tiles?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tiles?.querySelector('input:checked')?.focus({ preventScroll: true });
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
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? w.listening : w.mic;
      btn.setAttribute('aria-label', on ? w.listening : w.mic);
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

function renderDeadlines() {
  return `
    <h1 class="page-h1">Deadlines</h1>
    <p class="page-sub">Never get locked in or charged by surprise.</p>
    ${darkBanner({ icon: icons.bell, eyebrow: 'Coming later', text: 'Deadline reminders aren\'t part of this version yet.' })}
    ${emptyState({
    icon: icons.calendar,
    title: 'Find your dates in Overview',
    text: 'Each contract\'s key dates, like when to reply and your start date, are under "Dates to note".',
    action: '<a class="btn btn-secondary" href="#/contracts">Open my contracts</a>',
  })}`;
}

function renderExperts() {
  return `
    <h1 class="page-h1">Experts</h1>
    <p class="page-sub">Talk to a real person about your contract.</p>
    ${darkBanner({ icon: icons.person, eyebrow: 'Coming later', text: 'Chatting with a real expert isn\'t part of this version yet.' })}
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
  if (!contractCache.has(id)) contractCache.set(id, await api(`contracts?id=${encodeURIComponent(id)}`, { what: 'opening this contract' }));
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
  const ref = tappable ? `${shortRef(numbers[0])}${numbers.length > 1 ? ` +${numbers.length - 1}` : ''}` : '';
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
  const call = () => api(`${AI_ENDPOINTS[field]}?id=${encodeURIComponent(c.id)}`, { method: 'POST', what });
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
      if (field === 'summary' && !c.risks && !c.risksError) loadAi(c, 'risks'); // risk check goes next
      if ((field === 'risks' || stale) && c.risks && !c.tailored && !c.tailoredError) loadAi(c, 'tailored'); // then the plan
      const { name, params } = parseRoute();
      if (name !== 'contract' || params[0] !== c.id) return;
      const tab = params[1] || 'summary';
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
  const banner = `<div id="risk-banner">${riskBanner(c)}</div>`;
  if (c.summaryError) {
    return `
      ${banner}
      ${notice('error', c.summaryError)}
      ${retryButton('summary')}
      ${fullText(c)}`;
  }
  if (!c.summary) {
    loadAi(c, 'summary');
    return `
      ${banner}
      <div class="card loading loading-tall">
        <span class="spinner" aria-hidden="true"></span>
        <span>Reading your contract and checking each key term against it. This takes 15 to 40 seconds…</span>
      </div>`;
  }

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
    sub: escapeHtml(t(s, 'plain_text')),
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

    <div id="plan-slot">${planSection(c)}</div>

    ${c.risks ? decideCard(c) : ''}

    ${fullText(c)}

    <p class="tab-foot">Tap any point to see the original clause. Made by AI from your contract.</p>

    <button class="btn btn-danger-ghost btn-block" type="button" data-delete="${c.id}">${icons.trash} Delete this contract</button>

    <a class="fab" href="#/contract/${c.id}/ask">${icons.sparkle} Ask AI</a>`;
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
    title: escapeHtml(tr?.plan?.[i] || s.text),
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
  if (!c.risks) {
    loadAi(c, 'risks');
    return `
      <div class="card loading loading-tall">
        <span class="spinner" aria-hidden="true"></span>
        <span>Checking your contract for warning signs. This takes about 20 seconds…</span>
      </div>`;
  }

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
            ${r.explanation ? `<span class="risk-item-text">${escapeHtml(riskText(c, r.index, 'explanation'))}</span>` : ''}
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

    <p class="tab-foot">These are warning signs, not a final verdict. ClauseWise SG can never confirm whether a contract is genuine.</p>`;
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
    list.push({ number, title: saved(number)?.title || title, risky });
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
function panelArt(c, panel, translatedSpeech) {
  const p = panel.scene ? { ...OLD_SCENES[panel.scene], speech: null } : panel;
  const said = translatedSpeech || p.speech?.text;
  return composePanel({
    background: p.background,
    mei: { expression: p.expression, outfit: MEI_OUTFIT[c.contract_type] || 'casual', holding: p.holding },
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
      ${comic.panels.map((p, i) => `
        <figure class="panel${p.key ? ' key' : ''}">
          <figcaption><span class="panel-num">${i + 1}</span>${escapeHtml(tr?.captions?.[i] || p.caption)}</figcaption>
          ${panelArt(c, p, tr?.speeches?.[i])}
        </figure>`).join('')}
    </div>
    <p class="ai-label">${icons.sparkle} AI-generated example scene</p>
    ${assumptions.length ? `
      <div class="assumptions">
        <p class="assume-head">What this scene assumes</p>
        <ul>${assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      </div>` : ''}
    ${cl ? `
      <div class="clause-quote">
        <p class="quote-head">${clauseHeading(cl)} &middot; the original words</p>
        <blockquote>${escapeHtml(cl.text)}</blockquote>
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

function renderContract(c, tab, openClause = null) {
  // Start the risk check in the background so the Overview banner and Risks tab are ready sooner,
  // but only once the summary is done: two AI calls at once can push one past the time limit.
  if (!c.risks && !c.risksError && (c.summary || c.summaryError)) loadAi(c, 'risks');
  // Then "Your situation": the plan and anything made for this person.
  if (c.summary && c.risks && !c.tailored && !c.tailoredError) loadAi(c, 'tailored');

  const tabsHtml = CONTRACT_TABS.map((t) => `
    <button class="tab" role="tab" type="button" id="tab-${t.id}"
      aria-selected="${t.id === tab}" aria-controls="tab-panel"
      data-tab="${t.id}">${t.label}${t.id === 'risks' ? riskTabDot(c) : ''}</button>`).join('');

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
    langBtn.focus();
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
  if (isSpeaking()) {
    stopSpeaking();
    return;
  }
  const { name, params } = parseRoute();
  const c = name === 'contract' && contractCache.get(params[0]);
  if (!c) return;
  const tab = params[1] || 'summary';
  const content = readAloudContent(c, tab, params[2] && decodeURIComponent(params[2]));
  if (!content?.texts.length) {
    toast(tab === 'comic' ? 'Open a comic first, then tap the speaker.' : 'Nothing to read yet. Try again in a moment.');
    return;
  }
  if (content.lang !== (c.language || 'en')) toast(`Still translating, so reading in English for now.`);
  try {
    // Read out the same hidden versions the screen shows.
    await speak(content.texts.map((t) => (redactor ? redactor(t) : t)), content.lang);
  } catch (err) {
    toast(err.message === 'no-voice'
      ? `This device has no ${languageName(content.lang)} voice. You can add one in your phone's text-to-speech settings.`
      : 'Read-aloud is not available in this browser.');
  }
}

onSpeakingChange((on) => {
  speakBtn.setAttribute('aria-pressed', String(on));
  speakBtn.setAttribute('aria-label', on ? 'Stop reading' : 'Read aloud');
  document.querySelectorAll('[data-listen]').forEach((b) => {
    b.innerHTML = on ? `${icons.stopSquare} Stop reading` : `${icons.play} Listen to this summary`;
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

// ---------- Router ----------

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}

// Top-level screens show the bottom nav; inner screens (a contract) show the header
// with a back button instead, as in the mockups.
// `bare` hides the header too, for screens that draw their own top bar ("Your document").
function setChrome({ title = '', nav, inner = false, bare = false, tools = false, comicHref = null }) {
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
  const { name, params } = parseRoute();
  redactor = null; // set again below for a contract with "Hide these too" switched on
  const routeKey = `${name}/${params[0] || ''}`;
  const isNewScreen = routeKey !== lastRouteKey;
  lastRouteKey = routeKey;

  const show = (html) => {
    if (seq !== renderSeq) return;
    screen.innerHTML = html;
    if (isNewScreen) window.scrollTo(0, 0);
  };
  const showAsync = async (promise) => {
    if (!screen.innerHTML.includes('class="tabs"') || isNewScreen) show('<div class="loading"><span class="spinner"></span> Loading…</div>');
    try {
      show(await promise);
    } catch (err) {
      show(notice('error', err.message));
    }
  };

  switch (name) {
    case 'home':
      setChrome({ nav: 'home' });
      return show(renderHome());
    case 'scan':
      // Scanning now lives on Home (as in the mockup); keep old links working.
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
        return renderContract(c, tab, openClause);
      }));
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
    document.getElementById('options-slot').innerHTML = optionsSection(c);
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
    toggleReadAloud();
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
  if (e.target.id !== 'ask-form') return;
  e.preventDefault();
  const question = document.getElementById('ask-input').value.trim();
  if (question) sendQuestion(contractCache.get(parseRoute().params[0]), question);
});

// Arrow keys move between tabs (standard tablist keyboard pattern).
screen.addEventListener('keydown', (e) => {
  if (!e.target.classList.contains('tab')) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...screen.querySelectorAll('.tab')];
  const i = tabs.indexOf(e.target);
  tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].click();
});

backBtn.addEventListener('click', () => {
  const { name, params } = parseRoute();
  if (name === 'contract' && (params[1] === 'personal' || params[1] === 'situation')) location.hash = `#/contract/${params[0]}/summary`;
  else if (name === 'contract' && params[1] === 'decide') location.hash = `#/contract/${params[0]}/risks`;
  else location.hash = name === 'contract' ? '#/contracts' : '#/home';
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
