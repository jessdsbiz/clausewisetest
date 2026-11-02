// Talks to our Netlify Functions. No API keys live in the browser:
// the functions hold them and call the AI (Claude, or NVIDIA as a backup) and Supabase for us.

const DEVICE_KEY = 'clausewise-device-id';
let memoryDeviceId = null;

// crypto.randomUUID only exists on https/localhost, so fall back for phones on a LAN address.
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Anonymous ID so each phone only sees and deletes its own uploads (there is no login).
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    memoryDeviceId ||= newId();
    return memoryDeviceId;
  }
}

// A clear message when the server gave no message of its own. The commonest case is a function
// that ran out of time (netlify dev stops it at 30s and sends an empty 500).
function explain(status, what) {
  const doing = what ? `${what[0].toUpperCase()}${what.slice(1)}` : 'This';
  if (status >= 500) {
    return `${doing} took too long or stopped on the server (error ${status}). The AI service may be busy: please try again in a minute.`;
  }
  if (status === 413) return `${doing} failed: the file is too big. Try a smaller file.`;
  if (status === 404) return `${doing} failed: it could not be found. It may have been deleted.`;
  return `${doing} failed (error ${status}). Please try again.`;
}

// The functions stop after 30s, so a reply that hasn't come by then never will: stop waiting
// and show a message with a Try again button instead of a screen that spins forever.
const TIMEOUT_MS = 35000;
// Status for "we stopped waiting". Below 500, so the screens don't retry it on their own.
const TIMED_OUT = 408;

// `what` describes the action in a few words ("reading your photo") for error messages.
// `keepalive`: the request carries on if the page is closed or reloaded (small saves only).
export async function api(path, { method = 'GET', json, body, what, keepalive = false } = {}) {
  const headers = { 'X-Device-Id': deviceId() };
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  let data;
  try {
    res = await fetch(`/.netlify/functions/${path}`, { method, headers, body, keepalive, signal: controller.signal });
    data = await res.json().catch((e) => {
      if (controller.signal.aborted) throw e; // stopped while the reply was arriving
      return {};
    });
  } catch {
    if (controller.signal.aborted) {
      const doing = what ? `${what[0].toUpperCase()}${what.slice(1)}` : 'This';
      const err = new Error(`${doing} took too long, so we stopped waiting. The AI service may be busy: please try again.`);
      err.status = TIMED_OUT;
      throw err;
    }
    throw new Error(`No connection${what ? ` while ${what}` : ''}. Check your internet and try again.`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = new Error(data.error || explain(res.status, what));
    err.status = res.status;
    throw err;
  }
  return data;
}
