// Read-aloud with the browser's built-in voices (Web Speech API). Nothing is sent anywhere:
// the phone or computer speaks the text itself.

const VOICE_LANGS = {
  en: ['en-SG', 'en-GB', 'en-US', 'en'],
  zh: ['zh-CN', 'zh-SG', 'zh-TW', 'zh-HK', 'zh', 'cmn'],
  ms: ['ms-MY', 'ms'],
  ta: ['ta-IN', 'ta-SG', 'ta-LK', 'ta'],
};

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let speaking = false;
let listener = () => {};
let errorListener = () => {};

export const isSpeaking = () => speaking;
export function onSpeakingChange(fn) {
  listener = fn;
}
export function onSpeechError(fn) {
  errorListener = fn;
}

function setSpeaking(value) {
  speaking = value;
  listener(value);
}

// Voices load late in some browsers; wait for them briefly.
function voices() {
  const list = speechSynthesis.getVoices();
  if (list.length) return Promise.resolve(list);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

export async function findVoice(lang) {
  const list = await voices();
  for (const code of VOICE_LANGS[lang] || []) {
    const v = list.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(code.toLowerCase()));
    if (v) return v;
  }
  return null;
}

// Short sentence-sized pieces: Chrome stops reading a single long utterance after ~15 seconds.
function pieces(text) {
  return text
    .replace(/\*\*/g, '')
    .split(/(?<=[.!?。！？])\s*/)
    .flatMap((s) => (s.length > 220 ? s.match(/.{1,200}(\s|$)/g) || [s] : [s]))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stop() {
  if (!speechSupported) return;
  speechSynthesis.cancel();
  setSpeaking(false);
}

// Reads the texts aloud in `lang`. Throws "no-voice" if the device has no voice for that language.
export async function speak(texts, lang) {
  if (!speechSupported) throw new Error('unsupported');
  stop();
  const voice = await findVoice(lang);
  if (!voice && lang !== 'en') throw new Error('no-voice');

  const all = texts.flatMap(pieces);
  if (!all.length) return;
  setSpeaking(true);
  all.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB';
    u.rate = 0.95; // a little slower, for people reading in a second language
    if (i === all.length - 1) u.onend = () => setSpeaking(false);
    u.onerror = (e) => {
      // "interrupted"/"canceled" just mean we stopped it ourselves.
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        speechSynthesis.cancel();
        errorListener(e.error);
      }
      setSpeaking(false);
    };
    speechSynthesis.speak(u);
  });
}
