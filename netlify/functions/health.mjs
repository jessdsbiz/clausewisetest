// Quick check that netlify dev is running functions and can see .env.
// Reports only whether each value exists, never the values themselves.
import { keyRole } from '../lib/supabase.mjs';

export default async () => {
  const nvidia = process.env.NVIDIA_API_KEY;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Response.json({
    ok: true,
    nvidiaKeyConfigured: Boolean(nvidia) && nvidia !== 'nvapi-your-key-here',
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && supabaseKey),
    supabaseKeyRole: supabaseKey ? keyRole(supabaseKey) : null,
  });
};
