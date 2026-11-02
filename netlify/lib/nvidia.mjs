// NVIDIA Build (OpenAI-compatible) chat helper, kept as the fallback to Claude: set AI_PROVIDER=nvidia
// in .env to use it again (see ai.mjs). Server-side only: reads NVIDIA_API_KEY from .env.

import { HttpError } from './http.mjs';

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// The strongest text model that answers on our NVIDIA Build account (Oct 2026: Kimi K2.6 and
// Nemotron Super 404, GLM 5.3 and DeepSeek V4.1 took over 60s). Used for everything the user
// relies on: summary, warning signs and chat answers.
const STRONG_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';

export const NVIDIA_MODELS = {
  // Reads photos. Llama 3.2 11B/90B Vision stopped answering on NVIDIA's free service (no reply in
  // 90s, Oct 2026); Nemotron Super VL read a whole BrightPath page correctly in ~10s.
  vision: process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  // Fast model, kept for simple jobs only (finding personal details, a quick second opinion).
  // Lightning invented and mis-ranked warning signs on real contracts, so it no longer writes them.
  text: process.env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b',
  risks: process.env.NVIDIA_RISKS_MODEL || STRONG_MODEL,
  ask: process.env.NVIDIA_ASK_MODEL || STRONG_MODEL,
  // Comics need a model that keeps a story straight (who pays whom, what happens when);
  // Lightning muddled them, Ultra got them right in ~4-12s since a storyboard is short.
  comic: process.env.NVIDIA_COMIC_MODEL || STRONG_MODEL,
  // The type-specific summary needs a model that keeps rows short, on-topic and free of legal words;
  // Lightning wrote 40-90 word rows with fees under Pay on the job offer.
  summary: process.env.NVIDIA_SUMMARY_MODEL || STRONG_MODEL,
  // Checks that a chat answer is really stated in the clause it cites (6/6 on our test answers).
  verify: process.env.NVIDIA_VERIFY_MODEL || STRONG_MODEL,
  // "Your situation" reads the user's own words and weighs them against the contract.
  tailor: process.env.NVIDIA_TAILOR_MODEL || STRONG_MODEL,
  // "You decide": the draft message to the other party and its plain-words version.
  decide: process.env.NVIDIA_DECIDE_MODEL || STRONG_MODEL,
  // Lightning left Chinese untranslated and wrote Malay when asked for Tamil; Ultra translates properly.
  translate: process.env.NVIDIA_TRANSLATE_MODEL || STRONG_MODEL,
};

export async function nvidiaChat({ model, messages, maxTokens = 2048, temperature = 0, thinking, signal }) {
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
