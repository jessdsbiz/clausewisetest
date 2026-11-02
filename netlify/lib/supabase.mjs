// Minimal Supabase REST helpers for Netlify Functions.
// Uses the service role key from .env, so this file must only ever run server-side.

import { HttpError } from './http.mjs';

export const BUCKET = 'contracts';

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(500, 'Supabase is not set up. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env and restart netlify dev.');
  }
  if (keyRole(key) === 'anon') {
    throw new HttpError(500, 'SUPABASE_SERVICE_ROLE_KEY in .env is the anon key. Use the service_role key instead and restart netlify dev.');
  }
  return { url: url.replace(/\/$/, ''), key };
}

// Legacy Supabase keys are JWTs with the role inside, so a mixed-up anon key can be caught.
export function keyRole(key) {
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role || null;
  } catch {
    return null;
  }
}

function headers(extra = {}) {
  const { key } = config();
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function check(res, what) {
  if (res.ok) return res;
  const body = await res.text();
  console.error(`Supabase ${what} failed (${res.status}):`, body.slice(0, 300));
  throw new HttpError(502, `Could not ${what}. Please try again.`);
}

// For requests that are safe to repeat. Supabase usually answers in well under a second, but on a
// patchy connection opening it can stall for 3-10s, and it sometimes returns a brief 5xx (e.g.
// Cloudflare 520). So a second, identical request on a fresh connection goes out after HEDGE_MS (or
// at once if the first fails), and whichever answers first is used. Each try gives up after 10s,
// so a stuck request can't hold the function past its time limit.
const HEDGE_MS = 2500;

function fetchRetry(url, options) {
  return new Promise((resolve, reject) => {
    const controllers = [];
    let settled = false;
    let failures = 0;
    let lastError;
    const launch = () => {
      const controller = new AbortController();
      controllers.push(controller);
      const timer = setTimeout(() => controller.abort(new Error('Supabase did not answer within 10s')), 10000);
      fetch(url, { ...options, signal: controller.signal })
        .then((res) => {
          if (res.status >= 500) throw new HttpError(502, `Supabase ${res.status}`);
          if (settled) return;
          settled = true;
          controllers.filter((c) => c !== controller).forEach((c) => c.abort());
          resolve(res);
        })
        .catch((err) => {
          if (settled) return;
          lastError = err;
          failures++;
          console.warn(`Supabase request failed (${err.message})${controllers.length < 2 ? ', trying again' : ''}:`, url.split('?')[0]);
          if (controllers.length < 2) launch();
          else if (failures >= controllers.length) {
            console.error('Supabase did not answer:', lastError.message);
            reject(new HttpError(502, 'Could not reach your saved contracts. Please try again.'));
          }
        })
        .finally(() => clearTimeout(timer));
    };
    launch();
    setTimeout(() => { if (!settled && controllers.length < 2) launch(); }, HEDGE_MS);
  });
}

// ---------- Table: contracts ----------

export async function selectContracts(query) {
  const res = await fetchRetry(`${config().url}/rest/v1/contracts?${query}`, { headers: headers() });
  await check(res, 'load contracts');
  return res.json();
}

export async function insertContract(row) {
  const res = await fetch(`${config().url}/rest/v1/contracts`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  await check(res, 'save the contract');
  const [created] = await res.json();
  return created;
}

export async function updateContract(query, fields) {
  const res = await fetchRetry(`${config().url}/rest/v1/contracts?${query}`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(fields),
  });
  await check(res, 'save the results');
}

export async function deleteContractRow(query) {
  const res = await fetchRetry(`${config().url}/rest/v1/contracts?${query}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=representation' }),
  });
  await check(res, 'delete the contract');
  return res.json();
}

// ---------- Storage: original files ----------
// New uploads no longer store the original file. This only cleans up files from contracts
// uploaded before that change, when they are deleted.

export async function removeFile(path) {
  const res = await fetchRetry(`${config().url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [path] }),
  });
  await check(res, 'delete the file');
}
