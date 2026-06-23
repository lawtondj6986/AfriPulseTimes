// AfriPulse Times — browser Supabase client.
//
// afripulse-preview.html is served as a static file (Vite does not process it),
// so it can't use the bundled npm package or import.meta.env. This module loads
// the client straight from a CDN and reads the public project values below.
//
// The anon key is SAFE to expose publicly — Row Level Security guards the data.
// Never put the service_role key here. Server-side code (Vercel /api routes)
// uses the npm @supabase/supabase-js + .env.local instead; this file is the
// browser-only counterpart. Fill in the two values from
// supabase.com -> Project Settings -> API (same values as .env.local).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Hand the client to afripulse-preview.html's store (see window.__supabaseReady).
window.__supabase = supabase;
if (typeof window.__supabaseResolve === 'function') window.__supabaseResolve(supabase);
