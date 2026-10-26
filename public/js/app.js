// ClauseWise app shell: hash router, bottom nav, scan screen and contract tabs.

import { api } from './api.js';
import { pdfToText, photoToText } from './extract.js';
import { composePanel } from './comic-kit.js';
import { hidePersonalNumbers } from './privacy.js';
import { speak, stop as stopSpeaking, speechSupported, isSpeaking, onSpeakingChange, onSpeechError } from './speech.js';

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
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M12 8v4M12 15.5h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  building: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M4 10h16M12 3l8 4H4zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  chevSmall: '<svg class="chev-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
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
  file: null,
  previewUrl: null,
  contractType: 'job_offer',
  explainMode: 'plain',
  language: 'en',
  busy: false,
};

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

function chosenFileHtml() {
  const f = scan.file;
  if (!f) return '';
  const isPdf = f.type === 'application/pdf';
  const thumb = isPdf
    ? `<span class="doc-icon">${icons.doc}</span>`
    : `<img class="thumb" src="${scan.previewUrl}" alt="Preview of your photo">`;
  return `
    <div class="scan-file">
      ${thumb}
      <span class="file-info">
        <p class="card-title">${escapeHtml(f.name || 'Photo')}</p>
        <p class="card-meta">${isPdf ? 'PDF' : 'Photo'} &middot; ${formatSize(f.size)}</p>
      </span>
      <button class="icon-btn" type="button" id="remove-file" aria-label="Remove this file" ${scan.busy ? 'disabled' : ''}>${icons.x}</button>
    </div>`;
}

function renderHome() {
  const off = scan.busy ? 'disabled' : '';
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
      ${chosenFileHtml()}
      <label class="pick scan-main">
        <input type="file" id="camera-input" accept="image/*" capture="environment" ${off}>
        <span>${icons.camera} ${scan.file ? 'Scan again' : 'Scan a contract'}</span>
      </label>
      <div class="scan-row">
        <label class="pick scan-sub">
          <input type="file" id="pdf-input" accept="application/pdf" ${off}>
          <span>${icons.doc} Upload PDF</span>
        </label>
        <label class="pick scan-sub">
          <input type="file" id="photo-input" accept="image/*" ${off}>
          <span>${icons.image} Photo</span>
        </label>
      </div>
      <p class="photo-note">${icons.camera} Cover your NRIC and bank numbers before you snap. Photos are read by AI before we can hide anything.</p>
      <p class="scan-note">${icons.lock} Your original file is never saved · delete anytime</p>
    </section>

    <h2 class="h2">Explain it as</h2>
    ${tileGroup('explain_mode', EXPLAIN_MODES, scan.explainMode, 'tiles-mode', 'Explain it as')}

    <h2 class="h2">What kind of contract?</h2>
    ${tileGroup('contract_type', CONTRACT_TYPES, scan.contractType, 'tiles-type', 'What kind of contract?')}

    <div id="scan-status" aria-live="polite"></div>
    ${scan.file ? `
      <button class="btn btn-primary btn-block submit" type="button" id="scan-submit" ${off}>
        ${scan.busy ? '<span class="spinner" aria-hidden="true"></span> Working…' : 'Explain my contract'}
      </button>` : ''}`;
}

function setScanStatus(html) {
  const el = document.getElementById('scan-status');
  if (el) el.innerHTML = html;
}

function setFile(file) {
  if (scan.previewUrl) URL.revokeObjectURL(scan.previewUrl);
  scan.file = file;
  scan.previewUrl = file && file.type !== 'application/pdf' ? URL.createObjectURL(file) : null;
}

function chooseFile(file, kind) {
  if (!file) return;
  if (kind === 'pdf' && file.type !== 'application/pdf') {
    setScanStatus(notice('error', 'Please choose a PDF file.'));
    return;
  }
  if (kind === 'photo' && !file.type.startsWith('image/')) {
    setScanStatus(notice('error', 'Please choose a photo.'));
    return;
  }
  if (kind === 'pdf' && file.size > MAX_FILE_BYTES) {
    setScanStatus(notice('error', 'This PDF is bigger than 5 MB. Try a smaller file.'));
    return;
  }
  setFile(file);
  render();
  // The button appears below the choices, so bring it into view.
  document.getElementById('scan-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function submitScan() {
  if (!scan.file || scan.busy) return;
  scan.busy = true;
  render();

  try {
    const file = scan.file;
    const isPdf = file.type === 'application/pdf';
    let text;

    if (isPdf) {
      setScanStatus(notice('info', 'Reading your PDF…'));
      ({ text } = await pdfToText(file));
    } else {
      setScanStatus(notice('info', 'Reading your photo. This can take up to a minute…'));
      ({ text } = await photoToText(file, api));
    }

    // Hide NRIC/FIN and bank/card numbers here on the device, before the text is saved or
    // sent to any AI. (Photos had to be read by AI first; PDFs never leave unmasked.)
    ({ text } = hidePersonalNumbers(text));

    setScanStatus(notice('info', 'Saving…'));
    // Only the masked text is sent. The original PDF or photo is not uploaded or kept.
    const { id } = await api('contracts', {
      method: 'POST',
      what: 'saving your contract',
      json: {
        raw_text: text,
        file_name: file.name || (isPdf ? 'contract.pdf' : 'photo.jpg'),
        source_type: isPdf ? 'pdf' : 'photo',
        contract_type: scan.contractType,
        explain_mode: scan.explainMode,
        language: scan.language,
      },
    });

    setFile(null);
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
    chooseFile(t.files[0], 'pdf');
  } else if (t.id === 'photo-input' || t.id === 'camera-input') {
    chooseFile(t.files[0], 'photo');
  } else if (t.id === 'comic-clause' && t.value) {
    location.hash = `#/contract/${parseRoute().params[0]}/comic/${encodeURIComponent(t.value)}`;
  } else if (t.id === 'lang-select') {
    scan.language = t.value;
    render();
  } else if (t.name === 'contract_type') {
    scan.contractType = t.value;
  } else if (t.name === 'explain_mode') {
    scan.explainMode = t.value;
  }
});

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
let pointSeq = 0;
function pointRow(c, { lead, title, sub, numbers, muted = false }) {
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
const aiRequests = new Map();

function loadAi(c, field) {
  const key = `${field}:${c.id}`;
  if (aiRequests.has(key)) return;
  delete c[`${field}Error`];
  const what = { summary: 'making the summary', risks: 'checking for warning signs' }[field];
  const call = () => api(`${field}?id=${encodeURIComponent(c.id)}`, { method: 'POST', what });
  aiRequests.set(key, call()
    // The free AI service is sometimes slow or busy: retry once before showing an error.
    .catch((err) => (!err.status || err.status >= 500 ? call() : Promise.reject(err)))
    .then((data) => {
      c.clauses = data.clauses;
      c[field] = data[field];
    })
    .catch((err) => {
      c[`${field}Error`] = err.message;
    })
    .finally(() => {
      aiRequests.delete(key);
      if (field === 'summary' && !c.risks && !c.risksError) loadAi(c, 'risks'); // risk check goes next
      const { name, params } = parseRoute();
      if (name !== 'contract' || params[0] !== c.id) return;
      const tab = params[1] || 'summary';
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
        <span>Reading your contract and pulling out the key terms. This takes about 10 seconds…</span>
      </div>`;
  }

  // Rows the contract doesn't mention are hidden and listed in one grey line instead.
  const terms = c.summary.filter((s) => s.key !== 'key_date' && s.found);
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
    ${languageNote(c, 'summary')}
    ${listen}
    <h2 class="h2">In plain words</h2>
    ${terms.length ? `<ul class="list-card">${terms.map(termRow).join('')}</ul>` : ''}
    ${missing.length ? `<p class="not-in-contract">Not in this contract: ${escapeHtml(missingLabels)}</p>` : ''}

    ${dates.length ? `
      <h2 class="h2">Dates to note</h2>
      <ul class="list-card">${dates.map(dateRow).join('')}</ul>` : ''}

    ${fullText(c)}

    <p class="tab-foot">Tap any point to see the original clause. Made by AI from your contract.</p>

    <button class="btn btn-danger-ghost btn-block" type="button" data-delete="${c.id}">${icons.trash} Delete this contract</button>

    <a class="fab" href="#/contract/${c.id}/ask">${icons.sparkle} Ask AI</a>`;
}

// ---------- Risks & scam check (mockups 3 and 3b) ----------

const LEVEL_LABEL = { high: 'High', medium: 'Medium', info: 'Info' };

const RISK_ICONS = {
  pay_to_start: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  personal_account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  pressure: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  company_details: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M4 10h16M12 3l8 4H4zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>',
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
  const items = c.risks?.items;
  if (!items?.length) return '';
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
  return c.risks?.items?.some((i) => i.level === 'high')
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
        <span>Checking your contract for warning signs. This takes about 15 seconds…</span>
      </div>`;
  }

  const { company, items } = c.risks;
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
      ${items.map((r, i) => `
        <a class="card risk-item" href="#/contract/${c.id}/doc/${i}">
          <span class="risk-icon lvl-${r.level}">${RISK_ICONS[r.category] || RISK_ICONS.other}</span>
          <span class="risk-body">
            <span class="risk-item-title">${escapeHtml(riskText(c, i, 'title'))}</span>
            ${r.explanation ? `<span class="risk-item-text">${escapeHtml(riskText(c, i, 'explanation'))}</span>` : ''}
            <span class="risk-item-foot">
              <span class="level-pill lvl-${r.level}">${LEVEL_LABEL[r.level]}</span>
              <span class="risk-link">${escapeHtml(clauseLabel(r.clause_numbers[0]))}${r.clause_numbers.length > 1 ? ` +${r.clause_numbers.length - 1}` : ''} ${icons.chevSmall}</span>
            </span>
          </span>
        </a>`).join('')}` : ''}

    <div class="help-row">
      <a class="btn btn-primary" href="#/contract/${c.id}/ask">${icons.chat} Ask the chatbot</a>
      <a class="btn btn-outline-red" href="tel:1799">${icons.phone} ScamShield 1799</a>
    </div>
    <a class="btn btn-secondary btn-block help-case" href="https://www.case.org.sg/" target="_blank" rel="noopener">${icons.building} Consumer issue? Contact CASE</a>

    <p class="tab-foot">These are warning signs, not a final verdict. ClauseWise SG can never confirm whether a contract is genuine.</p>`;
}

// Wraps the AI's quote inside the clause in <mark>, matching loosely on spaces and quote marks.
function highlight(text, quote) {
  if (!quote) return escapeHtml(text);
  const pattern = quote.trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['‘’`]/g, "['‘’`]").replace(/["“”]/g, '["“”]'))
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
  const items = c.risks.items;
  if (!items.length) return emptyState({ icon: icons.shield, title: 'No warning signs to show', text: 'Go back to see the full risk check.' });

  if (c.language && c.language !== 'en' && !translated(c, 'risks')) loadTranslation(c, 'risks');

  const n = items.length;
  const i = Math.min(Math.max(Number(indexParam) || 0, 0), n - 1);
  const r = items[i];
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
      else if (cl.number !== 'Intro') head = `<h3 class="doc-h">${escapeHtml(cl.heading || cl.number)}</h3>`;
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
        <a class="step-btn" href="#/contract/${c.id}/doc/${(i - 1 + n) % n}" aria-label="Previous warning sign">${icons.chevUp}</a>
        <span aria-live="polite">${i + 1}/${n}</span>
        <a class="step-btn" href="#/contract/${c.id}/doc/${(i + 1) % n}" aria-label="Next warning sign">${icons.chevDown}</a>
      </div>
    </div>

    <article class="doc-paper" aria-label="Your contract">${doc}</article>

    <div class="doc-sheet" role="region" aria-label="About this warning sign">
      <div class="sheet-handle"></div>
      <span class="level-pill lvl-${r.level}">${LEVEL_LABEL[r.level]} · ${escapeHtml(clauseLabel(target))}</span>
      <h2>${escapeHtml(riskText(c, i, 'title'))}</h2>
      ${r.explanation ? `<p>${escapeHtml(riskText(c, i, 'explanation'))}</p>` : ''}
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

function chatMessage(c, m) {
  if (m.role === 'user') return `<div class="msg msg-user"><div class="bubble">${escapeHtml(m.text)}</div></div>`;
  return `
    <div class="msg msg-bot">
      <div class="bubble">
        <p>${formatAnswer(m.text)}</p>
        ${m.quote ? `<blockquote class="msg-quote">“${escapeHtml(m.quote)}”</blockquote>` : ''}
        ${m.clause_numbers?.length ? `
          <div class="msg-chips">${m.clause_numbers.map((n) => `
            <button class="msg-chip" type="button" data-clause="${escapeHtml(n)}" aria-expanded="false">${icons.doc} ${escapeHtml(clauseLabel(n))}</button>`).join('')}
          </div>
          <div class="msg-clause" hidden></div>` : ''}
      </div>
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
      ${tab === 'summary' ? `<a class="privacy-link" href="#/contract/${c.id}/personal">${icons.lock} Personal details</a>` : ''}
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
    const tr = translated(c, 'summary');
    const texts = c.summary.map((s, i) => {
      const label = tr?.[i]?.label || s.label;
      const text = s.found ? (tr?.[i]?.plain_text || s.plain_text) : '';
      return s.key === 'key_date' ? text : text && `${label}. ${text}`;
    }).filter(Boolean);
    return { lang: tr ? lang : 'en', texts };
  }
  if ((tab === 'risks' || tab === 'doc') && c.risks) {
    const tr = translated(c, 'risks');
    const items = c.risks.items.map((r, i) => ({ title: tr?.[i]?.title || r.title, explanation: tr?.[i]?.explanation || r.explanation }));
    const pick = tab === 'doc' ? [items[Math.min(Number(extra) || 0, items.length - 1)]] : items;
    return { lang: tr ? lang : 'en', texts: pick.filter(Boolean).flatMap((r) => [`${r.title}.`, r.explanation]) };
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
    setFile(null);
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
  if (name === 'contract' && params[1] === 'personal') location.hash = `#/contract/${params[0]}/summary`;
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
