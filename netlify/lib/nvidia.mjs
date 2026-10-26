// NVIDIA Build (OpenAI-compatible) chat helper. Server-side only: reads NVIDIA_API_KEY from .env.

import { HttpError } from './http.mjs';

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// How long a function may run: 60s on the live site (Netlify's synchronous execution limit),
// but netlify dev stops functions after 30s. Long contracts on Ultra need the extra time live.
export const FUNCTION_LIMIT_MS = process.env.NETLIFY_DEV === 'true' ? 30000 : 60000;

// Reads photos. Llama 3.2 11B/90B Vision stopped answering on NVIDIA's free service (no reply in
// 90s, Oct 2026); Nemotron Super VL read a whole BrightPath page correctly in ~10s.
export const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
// Fast model, kept for simple jobs only (finding personal details, a quick second opinion).
// Lightning invented and mis-ranked warning signs on real contracts, so it no longer writes them.
export const TEXT_MODEL = process.env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';
// The strongest text model that answers on our NVIDIA Build account (Oct 2026: Kimi K2.6 and
// Nemotron Super 404, GLM 5.3 and DeepSeek V4.1 took over 60s). Used for everything the user
// relies on: summary, warning signs and chat answers.
const STRONG_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
export const RISKS_MODEL = process.env.NVIDIA_RISKS_MODEL || STRONG_MODEL;
export const ASK_MODEL = process.env.NVIDIA_ASK_MODEL || STRONG_MODEL;
// Comics need a model that keeps a story straight (who pays whom, what happens when);
// Lightning muddled them, Ultra got them right in ~4-12s since a storyboard is short.
export const COMIC_MODEL = process.env.NVIDIA_COMIC_MODEL || STRONG_MODEL;
// The type-specific summary needs a model that keeps rows short, on-topic and free of legal words;
// Lightning wrote 40-90 word rows with fees under Pay on the job offer.
export const SUMMARY_MODEL = process.env.NVIDIA_SUMMARY_MODEL || STRONG_MODEL;
// Checks that a chat answer is really stated in the clause it cites (6/6 on our test answers).
export const VERIFY_MODEL = process.env.NVIDIA_VERIFY_MODEL || STRONG_MODEL;
// Lightning left Chinese untranslated and wrote Malay when asked for Tamil; Ultra translates properly.
export const TRANSLATE_MODEL = process.env.NVIDIA_TRANSLATE_MODEL || STRONG_MODEL;

export async function chat({ model, messages, maxTokens = 2048, temperature = 0, thinking, signal }) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key || key === 'nvapi-your-key-here') {
    throw new HttpError(500, 'The NVIDIA API key is not set up. Add NVIDIA_API_KEY to .env and restart netlify dev.');
  }

  const body = { model, messages, max_tokens: maxTokens, temperature, stream: false };
  // Reasoning models think before answering, which is too slow for our time limit.
  if (thinking === false) body.chat_template_kwargs = { enable_thinking: false };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    console.error(`NVIDIA ${model} failed (${res.status}):`, await res.text());
    throw new HttpError(502, 'The AI service did not respond properly. Please try again.');
  }

  const data = await res.json();
  if (data.choices?.[0]?.finish_reason === 'length') console.warn(`NVIDIA ${model} reply was cut off at ${maxTokens} tokens`);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// A "hedged" chatJson: NVIDIA's free endpoint usually answers in ~10s but now and then a request
// sits in its queue for 30s+. If no answer has come after `hedgeAfterMs`, an identical second
// request is sent and whichever finishes first wins (the other is cancelled). Gives up after
// `timeoutMs`, so the function can still reply before its own time limit.
export function chatJsonHedged(options, timing = {}) {
  return hedged((signal) => chatJson({ ...options, signal }), timing);
}

// The same for a plain-text reply (used for reading photos).
export function chatHedged(options, timing = {}) {
  return hedged((signal) => chat({ ...options, signal }), timing);
}

// Runs `attempt(signal)`, starts one identical second attempt if the first is slow or fails,
// and settles with whichever succeeds first. `busyMessage` is the error shown if both are too slow.
function hedged(attempt, { hedgeAfterMs = 9000, timeoutMs = 25000, busyMessage = 'The AI service is busy right now. Please try again.' } = {}) {
  return new Promise((resolve, reject) => {
    const controllers = [];
    let settled = false;
    let started = 0;
    let failed = 0;
    let hedgeTimer;
    let giveUpTimer;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(giveUpTimer);
      controllers.forEach((c) => c.abort());
      fn(value);
    };
    const launch = () => {
      const controller = new AbortController();
      controllers.push(controller);
      started++;
      attempt(controller.signal).then(
        (value) => finish(resolve, value),
        (err) => {
          failed++;
          if (started < 2) launch(); // the first failed outright: try again now
          else if (failed >= started) finish(reject, err);
        },
      );
    };

    launch();
    hedgeTimer = setTimeout(() => { if (!settled && started < 2) launch(); }, hedgeAfterMs);
    giveUpTimer = setTimeout(() => finish(reject, new HttpError(504, busyMessage)), timeoutMs);
  });
}

// Asks for JSON and parses it, retrying once if the model's reply isn't valid JSON.
export async function chatJson(options) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await chat(options);
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    try {
      return JSON.parse(json);
    } catch (err) {
      try {
        return JSON.parse(escapeInnerQuotes(json));
      } catch {
        console.error(`Invalid JSON from ${options.model} (attempt ${attempt + 1}, ${err.message}):`, text.slice(0, 300));
        const pos = Number((err.message.match(/position (\d+)/) || [])[1]);
        if (process.env.CLAUSEWISE_DEBUG && pos) console.error('  around the error:', JSON.stringify(json.slice(pos - 250, pos + 80)));
      }
    }
  }
  throw new HttpError(502, 'The AI gave an answer we could not read. Please try again.');
}

// Quotes copied from a contract can contain straight double quotes ("Course Fee") that the model
// forgets to escape. Inside a string, a " that isn't followed by , : } or ] is taken as part of the text.
function escapeInnerQuotes(json) {
  let out = '';
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (ch === '\\' && inString) {
      out += ch + json[++i];
      continue;
    }
    if (ch === '"') {
      if (!inString) inString = true;
      else if (/^\s*[,:}\]]/.test(json.slice(i + 1))) inString = false;
      else {
        out += '\\"';
        continue;
      }
    } else if (inString && ch === '\n') {
      out += '\\n';
      continue;
    }
    out += ch;
  }
  return out;
}
