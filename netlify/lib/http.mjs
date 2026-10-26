// Shared error handling for Netlify Functions.
// HttpError messages are written for users and are safe to show in the app;
// anything else is logged and replaced with a generic message.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// There is no login: each browser keeps an anonymous device ID and sends it in
// the X-Device-Id header, so people only see and change their own contracts.
export function requireDevice(req) {
  const deviceId = req.headers.get('x-device-id') || '';
  if (!UUID.test(deviceId)) throw new HttpError(400, 'Missing device ID.');
  return deviceId;
}

export function contractIdParam(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (id && !UUID.test(id)) throw new HttpError(400, 'Invalid contract ID.');
  return id;
}

export function errorResponse(err) {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: 'Something unexpected went wrong on the server. Please try again.' }, { status: 500 });
}
