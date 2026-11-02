// Voice input ("No more typing", PRD FR9, and the "Tell us about you" and chatbot boxes) with the
// browser's own speech recognition (Web Speech API). Only final results go into the box; what is being
// heard right now appears in grey under it and is replaced at each update. The text stays editable.
// Hidden where the browser can't do it (e.g. Firefox).

import { hidePersonalNumbers } from './privacy.js';

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const voiceSupported = Boolean(Recognition);

// The user's chosen language. Tamil as spoken in Singapore is recognised as ta-IN by most browsers.
const RECOGNITION_LANG = { en: 'en-SG', zh: 'zh-CN', ms: 'ms-MY', ta: 'ta-IN' };
// Android Chrome repeats words when one long session keeps every result, so it listens one phrase at a time.
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

let active = null;

export const isListening = () => Boolean(active);

export function stopListening() {
  if (active) active.stopped = true;
  active?.rec.stop();
}

// Removes a sentence or a word repeated straight after itself ("I will go. I will go." -> "I will go.").
export function dedupe(text) {
  const sentences = String(text).split(/(?<=[.!?。？！])\s*/).map((s) => s.trim()).filter(Boolean);
  const kept = [];
  for (const s of sentences) {
    if (!kept.length || kept[kept.length - 1].toLowerCase() !== s.toLowerCase()) kept.push(s);
  }
  return kept.join(' ').replace(/\b(\w+)(\s+\1\b)+/gi, '$1').replace(/\s+/g, ' ').trim();
}

// Listens and writes into the box with id `boxId` (an <input> or <textarea>), after whatever is already
// there. The box is looked up each time, since the screen may be redrawn while listening. Spoken NRIC/FIN
// or account numbers are masked like typed ones. `onState(listening)` lets the caller show the Stop
// button; `onError(code)` gets "not-allowed", "no-speech", etc.
export function listenInto(boxId, lang, { onState = () => {}, onError = () => {} } = {}) {
  const box = () => document.getElementById(boxId);
  if (!Recognition || !box()) return;
  if (active) {
    stopListening();
    return;
  }
  const sep = lang === 'zh' ? '' : ' ';
  const join = (...parts) => parts.filter(Boolean).join(sep);
  const max = Number(box().maxLength) > 0 ? Number(box().maxLength) : Infinity;
  let base = box().value.trim(); // what was in the box before, and anything the user types meanwhile
  let finals = ''; // final phrases heard so far, each added once
  let lastWritten = null;
  const session = { rec: null, stopped: false };
  active = session;

  // The grey line under the box: what is being heard right now.
  const interimEl = () => {
    const el = box();
    const holder = el?.closest('.voice-box') || el;
    let p = document.getElementById(`${boxId}-interim`);
    if (!p && holder) {
      p = document.createElement('p');
      p.id = `${boxId}-interim`;
      p.className = 'voice-interim';
      p.setAttribute('aria-hidden', 'true');
      holder.insertAdjacentElement('afterend', p);
    }
    return p;
  };
  const showInterim = (text) => {
    const p = interimEl();
    if (p) p.textContent = text;
  };
  // The user edited the box while listening: keep their edit and carry on from it.
  const takeEdits = () => {
    const el = box();
    if (el && lastWritten !== null && el.value !== lastWritten) {
      base = el.value.trim();
      finals = '';
    }
  };
  const write = (interim) => {
    const el = box();
    if (!el) return;
    const text = dedupe(join(base, finals));
    el.value = hidePersonalNumbers(text).text.slice(0, max);
    lastWritten = el.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    showInterim(interim);
  };

  const start = () => {
    const rec = new Recognition();
    rec.lang = RECOGNITION_LANG[lang] || RECOGNITION_LANG.en;
    rec.interimResults = true;
    rec.continuous = !IS_ANDROID;
    session.rec = rec;
    rec.onresult = (e) => {
      takeEdits();
      let interim = '';
      // Only the results from resultIndex on are new; each final one is added once.
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const said = result[0].transcript.trim();
        if (result.isFinal) finals = join(finals, said);
        else interim = join(interim, said);
      }
      write(interim);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' && IS_ANDROID && !session.stopped) return; // silence: onend restarts it
      onError(e.error);
    };
    rec.onend = () => {
      // Android: one phrase per session; start the next one until the user stops.
      if (IS_ANDROID && !session.stopped && active === session) {
        setTimeout(() => {
          if (active === session && !session.stopped) start();
        }, 150);
        return;
      }
      if (active === session) {
        active = null;
        showInterim('');
        onState(false);
        box()?.focus();
      }
    };
    try {
      rec.start();
    } catch {
      active = null;
      onState(false);
      onError('start-failed');
    }
  };

  onState(true);
  start();
}
