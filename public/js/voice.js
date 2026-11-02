// Voice input ("No more typing", PRD FR9) with the browser's own speech recognition (Web Speech
// API). The words appear in the box as they are heard, so the user can check and edit them before
// sending. Hidden where the browser can't do it (e.g. Firefox).

import { hidePersonalNumbers } from './privacy.js';

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const voiceSupported = Boolean(Recognition);

// The user's chosen language. Tamil as spoken in Singapore is recognised as ta-IN by most browsers.
const RECOGNITION_LANG = { en: 'en-SG', zh: 'zh-CN', ms: 'ms-MY', ta: 'ta-IN' };

let active = null;

export const isListening = () => Boolean(active);

export function stopListening() {
  active?.stop();
}

// Listens and writes into the box with id `boxId` (an <input> or <textarea>), after whatever is
// already there. The box is looked up each time, since the screen may be redrawn while listening.
// Spoken NRIC/FIN or account numbers are masked like typed ones. `onState(listening)` lets the
// caller update the mic button; `onError(code)` gets "not-allowed", "no-speech", etc.
export function listenInto(boxId, lang, { onState = () => {}, onError = () => {} } = {}) {
  const box = () => document.getElementById(boxId);
  if (!Recognition || !box()) return;
  if (active) {
    stopListening();
    return;
  }
  const rec = new Recognition();
  rec.lang = RECOGNITION_LANG[lang] || RECOGNITION_LANG.en;
  rec.interimResults = true;
  rec.continuous = true;
  const before = box().value.trim();
  const max = Number(box().maxLength) > 0 ? Number(box().maxLength) : Infinity;
  const write = (spoken) => {
    // Chinese has no spaces between words.
    const joined = [before, spoken.trim()].filter(Boolean).join(lang === 'zh' ? '' : ' ');
    const el = box();
    if (!el) return;
    el.value = hidePersonalNumbers(joined).text.slice(0, max);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  rec.onresult = (e) => {
    let heard = '';
    for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
    write(heard);
  };
  rec.onerror = (e) => onError(e.error);
  rec.onend = () => {
    active = null;
    onState(false);
    box()?.focus();
  };
  active = rec;
  onState(true);
  try {
    rec.start();
  } catch {
    active = null;
    onState(false);
    onError('start-failed');
  }
}
