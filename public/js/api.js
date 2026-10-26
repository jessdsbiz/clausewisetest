// Talks to our Netlify Functions. No API keys live in the browser:
// the functions hold them and call NVIDIA and Supabase for us.

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

// `what` describes the action in a few words ("reading your photo") for error messages.
export async function api(path, { method = 'GET', json, body, what } = {}) {
  const headers = { 'X-Device-Id': deviceId() };
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  let res;
  try {
    res = await fetch(`/.netlify/functions/${path}`, { method, headers, body });
  } catch {
    throw new Error(`No connection${what ? ` while ${what}` : ''}. Check your internet and try again.`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || explain(res.status, what));
    err.status = res.status;
    throw err;
  }
  return data;
}
