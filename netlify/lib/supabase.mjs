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

// Supabase sometimes returns a brief 5xx (e.g. Cloudflare 520). Requests that are safe
// to repeat are retried once after a short pause. Each try gives up after 10s, so a stuck
// request can't hold the function past its time limit.
async function fetchRetry(url, options) {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (res.status < 500) return res;
    console.warn(`Supabase ${res.status}, retrying once:`, url.split('?')[0]);
  } catch (err) {
    console.warn('Supabase connection failed, retrying once:', err.message);
  }
  await new Promise((r) => setTimeout(r, 600));
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
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
