// AfriPulse Times — Supabase browser client
//
// This is the single shared Supabase client for the front end. Import it wherever
// you need to talk to the database or auth:
//
//   import { supabase } from '/lib/supabase.js';
//
// Vite only exposes environment variables prefixed with `VITE_` to browser code
// (via import.meta.env), so the public Supabase values live under the
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY names in .env.local. The anon key is
// designed to be public — access is controlled server-side by Row Level Security,
// which we'll configure in a later step. Never put the service_role key here.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly during development if the env file hasn't been filled in yet.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your project values from ' +
      'supabase.com → Project Settings → API.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
