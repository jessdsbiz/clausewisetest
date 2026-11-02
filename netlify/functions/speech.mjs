// /.netlify/functions/speech   (read-aloud, PRD: audio in all four languages)
//   POST { text, lang }  -> { audio: "<base64 MP3>" }
// Azure AI Speech turns one short piece of text (under 20 seconds) into speech in the chosen language.
// The key lives only on the server (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION) and is never sent to the
// browser or written to a log.

import { HttpError, errorResponse } from '../lib/http.mjs';

const VOICES = {
  en: { locale: 'en-SG', voice: 'en-SG-LunaNeural' },
  zh: { locale: 'zh-CN', voice: 'zh-CN-XiaoxiaoNeural' },
  ms: { locale: 'ms-MY', voice: 'ms-MY-YasminNeural' },
  ta: { locale: 'ta-SG', voice: 'ta-SG-VenbaNeural' },
};
const MAX_CHARS = 300; // about 20 seconds of speech
const TIMEOUT_MS = 15000;

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { text, lang } = await req.json().catch(() => ({}));
    const voice = VOICES[lang];
    if (!voice) throw new HttpError(400, 'Please choose a valid language.');
    const clean = String(text ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    if (!clean) throw new HttpError(422, 'Nothing to read.');

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) throw new HttpError(503, 'Read-aloud is not set up yet.');

    const ssml = `<speak version="1.0" xml:lang="${voice.locale}"><voice name="${voice.voice}">${escapeXml(clean)}</voice></speak>`;
    // One retry on a busy or failed call. Only the status code is reported, never the key.
    let response = null;
    let status = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        response = await fetch(`https://${encodeURIComponent(region)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
            'User-Agent': 'clausewise-sg',
          },
          body: ssml,
          signal: controller.signal,
        });
        status = response.status;
      } catch {
        response = null;
        status = 0;
      } finally {
        clearTimeout(timer);
      }
      if (response?.ok) break;
      if (attempt === 0 && (status === 0 || status === 429 || status >= 500)) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      break;
    }
    if (!response?.ok) {
      console.log(`Azure speech failed with status ${status} for ${voice.voice}`);
      return Response.json({ error: 'azure', status }, { status: 502 });
    }
    const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
    return Response.json({ audio });
  } catch (err) {
    return errorResponse(err);
  }
};
