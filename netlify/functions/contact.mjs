// /.netlify/functions/contact
//   GET -> { email }   The Data Protection Officer's email for the privacy page, from CONTACT_EMAIL.
// Not set (or not an email address): { email: null }, the page shows "Contact details coming soon",
// and a warning goes to the server log.

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export default async () => {
  const email = String(process.env.CONTACT_EMAIL ?? '').trim().replace(/^["']|["']$/g, '').trim();
  const ok = EMAIL.test(email);
  if (!ok) {
    console.warn(email
      ? 'CONTACT_EMAIL is not a valid email address: the privacy page shows "Contact details coming soon".'
      : 'CONTACT_EMAIL is not set: the privacy page shows "Contact details coming soon".');
  }
  return Response.json({ email: ok ? email : null }, { headers: { 'Cache-Control': 'no-store' } });
};
