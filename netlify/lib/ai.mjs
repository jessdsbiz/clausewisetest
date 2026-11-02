// The one place the functions call the AI from. AI_PROVIDER in .env picks who answers:
//   claude (default) - the Claude API: ANTHROPIC_MODEL for everything, and ANTHROPIC_RISK_MODEL
//                      for the risk check (both Haiku), see claude.mjs
//   nvidia           - the NVIDIA Build models used before, see nvidia.mjs
// Both get the same prompts and messages, so every reply keeps the same JSON shape.

import { HttpError } from './http.mjs';
import { withKeepNames } from './names.mjs';
import { claudeChat } from './claude.mjs';
import { nvidiaChat, NVIDIA_MODELS } from './nvidia.mjs';

export const AI_PROVIDER = String(process.env.AI_PROVIDER || 'claude').trim().toLowerCase() === 'nvidia' ? 'nvidia' : 'claude';

// Haiku is the fastest and cheapest Claude model: each call stays well under 20s.
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
// The risk check has its own setting. Sonnet was tried and ran past the 30s function limit, so it
// is Haiku too; warnings that fail the quote check are kept from their clause's words (risks.mjs).
const CLAUDE_RISK_MODEL = process.env.ANTHROPIC_RISK_MODEL || CLAUDE_MODEL;
const pick = (job) => (AI_PROVIDER === 'claude' ? (job === 'risks' ? CLAUDE_RISK_MODEL : CLAUDE_MODEL) : NVIDIA_MODELS[job]);

export const VISION_MODEL = pick('vision');
export const TEXT_MODEL = pick('text');
export const RISKS_MODEL = pick('risks');
export const ASK_MODEL = pick('ask');
export const COMIC_MODEL = pick('comic');
export const SUMMARY_MODEL = pick('summary');
export const VERIFY_MODEL = pick('verify');
export const TAILOR_MODEL = pick('tailor');
export const TRANSLATE_MODEL = pick('translate');
export const DECIDE_MODEL = pick('decide');

// "Make it fail" (PRD FR10): two different AIs check each other. NVIDIA checks what Claude wrote
// (NVIDIA_CHECK_MODEL), Claude fixes it. SECOND_CHECKER=claude skips NVIDIA (e.g. if its key stops
// working); Claude Haiku then does the check, as it also does whenever NVIDIA fails or is slow.
export const SECOND_CHECKER = String(process.env.SECOND_CHECKER || 'nvidia').trim().toLowerCase() === 'claude' ? 'claude' : 'nvidia';
// Nemotron Ultra caught both planted demo mistakes in ~12s; the fast model missed a changed number.
export const NVIDIA_CHECK_MODEL = process.env.NVIDIA_CHECK_MODEL || NVIDIA_MODELS.verify;
export const CLAUDE_CHECK_MODEL = CLAUDE_MODEL;

// How long a function may run: Netlify stops it after 30s, on the live site and in netlify dev.
export const FUNCTION_LIMIT_MS = 30000;
// The longest one AI call may take before it is given up (with a clear "try again" message).
export const MAX_CALL_MS = 15000;

// Time left for a request's AI steps, counted from when it came in. Keeps a few seconds back for
// saving the result, so the function always answers before Netlify stops it. Later steps (rewrites,
// shortening) only run if there is time for them.
export function timeBudget() {
  const started = Date.now();
  return () => FUNCTION_LIMIT_MS - 4000 - (Date.now() - started);
}

export function chat(options) {
  const o = { ...options, messages: withKeepNames(options.messages) };
  return AI_PROVIDER === 'claude' ? claudeChat(o) : nvidiaChat(o);
}

// A "hedged" chatJson: NVIDIA's free endpoint usually answers in ~10s but now and then a request
// sits in its queue for 30s+. If no answer has come after `hedgeAfterMs`, an identical second
// request is sent and whichever finishes first wins (the other is cancelled). Gives up after
// `timeoutMs`, so the function can still reply before its own time limit.
export function chatJsonHedged(options, timing = {}) {
  return hedged((signal) => chatJson({ ...options, signal }), timing);
}

// JSON from one particular AI ("claude" or "nvidia"), whichever writes everything else.
export function jsonFrom(provider, options, timing = {}) {
  const send = provider === 'nvidia' ? nvidiaChat : claudeChat;
  return hedged((signal) => chatJson({ ...options, signal }, send), timing);
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
export async function chatJson(options, send = chat) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await send(options);
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
