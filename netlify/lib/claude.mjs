// Claude (Anthropic Messages API) chat helper, the default AI provider (see ai.mjs).
// Server-side only: reads ANTHROPIC_API_KEY from .env. Takes the same OpenAI-style messages the
// NVIDIA helper does, so the prompts and the JSON they ask for stay the same for both.

import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './http.mjs';

let client;

// Our own hedging in ai.mjs already sends a second request when one fails or is slow,
// so the SDK retries only once (for rate limits and short outages).
const getClient = () => (client ??= new Anthropic({ maxRetries: 1 }));

// OpenAI-style content (text or a list with image_url parts) to Claude content blocks.
function toClaudeContent(content) {
  if (!Array.isArray(content)) return String(content ?? '');
  return content.map((part) => {
    if (part.type !== 'image_url') return { type: 'text', text: part.text ?? '' };
    const [, mediaType, data] = String(part.image_url?.url).match(/^data:(image\/[a-z]+);base64,(.*)$/s) || [];
    if (!data) throw new HttpError(400, 'Please send a JPG, PNG or WebP photo.');
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  });
}

// No thinking: every call has to answer well inside the function's time limit. Each model turns
// it off differently (Sonnet 5.5 refuses "disabled"; Opus 5.5 and Fable can only think less).
function noThinking(model) {
  if (/^claude-sonnet-5-5/.test(model)) return { thinking: { type: 'between_tools' } };
  if (/^claude-(opus-5-5|fable)/.test(model)) return { output_config: { effort: 'low' } };
  return { thinking: { type: 'disabled' } };
}

// If a model declines a request (its safety check can misread a contract about fees or scams),
// the main model (ANTHROPIC_MODEL) gets one try at the same request.
const fallbackModel = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export async function claudeChat({ model, messages, maxTokens = 2048, signal }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new HttpError(500, 'The Claude API key is not set up. Add ANTHROPIC_API_KEY to .env and restart netlify dev.');

  // System prompts go in Claude's own `system` field; the conversation must start with the user.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const turns = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: toClaudeContent(m.content) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();

  const started = Date.now();
  let res;
  try {
    res = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      ...noThinking(model),
      ...(system ? { system } : {}),
      messages: turns,
    }, { signal });
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) throw err; // our hedge cancelled it
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error(`Claude ${model} refused the API key (${err.status}).`);
      throw new HttpError(500, 'The Claude API key was not accepted. Check ANTHROPIC_API_KEY in .env.');
    }
    if (err instanceof Anthropic.NotFoundError) {
      console.error(`Claude model not found: ${model}. Check ANTHROPIC_MODEL in .env.`);
      throw new HttpError(500, 'The AI model name is not right. Check ANTHROPIC_MODEL in .env.');
    }
    if (err instanceof Anthropic.APIError) console.error(`Claude ${model} failed (${err.status ?? 'no connection'}):`, err.message);
    else console.error(`Claude ${model} failed:`, err.message);
    throw new HttpError(502, 'The AI service did not respond properly. Please try again.');
  }

  if (process.env.CLAUSEWISE_DEBUG) {
    console.log(`  Claude ${model}: ${((Date.now() - started) / 1000).toFixed(1)}s, ${res.usage.input_tokens} in / ${res.usage.output_tokens} out tokens`);
  }
  if (res.stop_reason === 'max_tokens') console.warn(`Claude ${model} reply was cut off at ${maxTokens} tokens`);
  if (res.stop_reason === 'refusal') {
    console.warn(`Claude ${model} declined to answer (${res.stop_details?.category ?? 'no category'}).`);
    if (model !== fallbackModel()) return claudeChat({ model: fallbackModel(), messages, maxTokens, signal });
    return '';
  }
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}
