// Read-aloud. The audio is made by Azure AI Speech on the server (/.netlify/functions/speech), in short
// parts that play in order, with play/pause and a cache so a repeated part isn't made twice. The
// phone's or computer's own voice is used only if Azure fails.

const VOICE_LANGS = {
  en: ['en-SG', 'en-GB', 'en-US', 'en'],
  zh: ['zh-CN', 'zh-SG', 'zh-TW', 'zh-HK', 'zh', 'cmn'],
  ms: ['ms-MY', 'ms'],
  ta: ['ta-IN', 'ta-SG', 'ta-LK', 'ta'],
};
const AZURE_PART_CHARS = 180; // about 12 to 15 seconds of speech per part
const DEVICE_PART_CHARS = 220;

export const speechSupported = typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window);

let speaking = false;
let paused = false;
let listener = () => {};
let errorListener = () => {};
let loadingListener = () => {};
let session = 0; // a new read-aloud (or a stop) ends the old one
let audio = null;
const clipCache = new Map(); // "lang|text" -> object URL

export const isSpeaking = () => speaking;
export const isPaused = () => paused;
export function onSpeakingChange(fn) {
  listener = fn;
}
export function onSpeechError(fn) {
  errorListener = fn;
}
// True while the next audio part is being made (the speaker button shows a loading state).
export function onLoadingChange(fn) {
  loadingListener = fn;
}

function setSpeaking(value) {
  speaking = value;
  if (!value) paused = false;
  listener(value);
}

// Short pieces, split at sentence ends so each one can be read on its own.
function pieces(text, max) {
  return text
    .replace(/\*\*/g, '')
    .split(/(?<=[.!?。！？])\s*/)
    .flatMap((s) => (s.length > max ? s.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')) || [s] : [s]))
    .map((s) => s.trim())
    .filter(Boolean);
}

// The phone's or computer's voice, used only when Azure fails.
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

// One part as an audio URL, from the cache or from Azure (through our function). One retry if it fails.
async function clipFor(text, lang) {
  const key = `${lang}|${text}`;
  if (clipCache.has(key)) return clipCache.get(key);
  let response = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch('/.netlify/functions/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    }).catch(() => null);
    if (response?.ok) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 700));
  }
  if (!response?.ok) throw new Error('azure');
  const { audio: base64 } = await response.json();
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  clipCache.set(key, url);
  return url;
}

export function stop() {
  session += 1;
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio = null;
  }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  setSpeaking(false);
}

// Pauses or resumes the audio that is playing now.
export function togglePause() {
  if (!speaking) return;
  if (audio) {
    if (paused) audio.play().catch(() => {});
    else audio.pause();
    paused = !paused;
    listener(true);
  }
}

// Device voice for the parts still to read (only after Azure failed).
async function speakOnDevice(texts, lang, mine) {
  const voice = await findVoice(lang);
  if (!voice && lang !== 'en') throw new Error('no-voice');
  const all = texts.flatMap((t) => pieces(t, DEVICE_PART_CHARS));
  all.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB';
    u.rate = 0.95; // a little slower, for people reading in a second language
    if (i === all.length - 1) u.onend = () => { if (mine === session) setSpeaking(false); };
    u.onerror = (e) => {
      if (mine !== session) return;
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

// Reads the texts aloud in `lang`: Azure parts in order, then the device voice if Azure fails.
// Throws "no-voice" only if the device voice is needed and this device has none for the language.
export async function speak(texts, lang) {
  if (!speechSupported) throw new Error('unsupported');
  stop();
  const mine = session;
  const parts = texts.flatMap((t) => pieces(t, AZURE_PART_CHARS));
  if (!parts.length) return;
  setSpeaking(true);

  let i = 0;
  const playFrom = async (index) => {
    if (mine !== session) return;
    if (index >= parts.length) {
      setSpeaking(false);
      return;
    }
    let url;
    loadingListener(true);
    try {
      url = await clipFor(parts[index], lang);
    } catch {
      loadingListener(false);
      // Azure failed: the device voice reads the rest.
      if (mine !== session) return;
      audio = null;
      try {
        await speakOnDevice(parts.slice(index), lang, mine);
      } catch (err) {
        if (mine === session) {
          setSpeaking(false);
          errorListener(err.message);
        }
      }
      return;
    }
    if (mine !== session) return;
    loadingListener(false);
    audio = new Audio(url);
    audio.onended = () => playFrom(index + 1);
    audio.onerror = () => { if (mine === session) { setSpeaking(false); errorListener('audio'); } };
    // Make the next part while this one plays, so there is no gap.
    if (index + 1 < parts.length) clipFor(parts[index + 1], lang).catch(() => {});
    try {
      await audio.play();
    } catch {
      if (mine === session) { setSpeaking(false); errorListener('blocked'); }
    }
  };
  i = 0;
  await playFrom(i);
}
