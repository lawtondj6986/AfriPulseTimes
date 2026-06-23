// AfriPulse Times — newsletter signup (Vercel serverless function).
//
// Accepts { email, language }, validates the email, records the subscriber in
// Supabase (subscribers table), AND registers them with Buttondown.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS so an
// anonymous visitor's signup can be inserted), and BUTTONDOWN_API_KEY. If the
// Buttondown key is absent the Supabase insert still happens and Buttondown is
// skipped with a warning (handy for local testing before keys are set).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_URL = process.env.BUTTONDOWN_API_URL || 'https://api.buttondown.email/v1/subscribers';

const LANGUAGES = ['en', 'fr', 'ar'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Record the subscriber in Supabase. Returns 'inserted' | 'duplicate' | throws.
async function saveToSupabase(email, language){
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });
  const { error } = await admin.from('subscribers').insert({ email, language });
  if(error){
    if(error.code === '23505') return 'duplicate';   // unique_violation on email
    throw new Error('supabase: ' + error.message);
  }
  return 'inserted';
}

// Register the subscriber with Buttondown. Returns 'created' | 'duplicate' |
// 'skipped' | throws. Exported for tests.
export async function saveToButtondown(email, language){
  if(!BUTTONDOWN_API_KEY){
    console.warn('[subscribe] BUTTONDOWN_API_KEY not set — skipping Buttondown.');
    return 'skipped';
  }
  const res = await fetch(BUTTONDOWN_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + BUTTONDOWN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email_address: email, metadata: { language } })
  });
  if(res.status === 201 || res.status === 200) return 'created';
  const text = await res.text().catch(() => '');
  // Buttondown returns 400 when the address already exists.
  if(res.status === 400 && /already.*subscrib|exists/i.test(text)) return 'duplicate';
  throw new Error('buttondown ' + res.status + ': ' + text.slice(0, 300));
}

export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }
  if(!SUPABASE_URL || !SERVICE_KEY){
    console.error('[subscribe] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured' });
  }

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body || '{}'); }catch(e){ body = {}; } }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  const language = LANGUAGES.includes(body.language) ? body.language : 'en';

  if(!EMAIL_RE.test(email)){
    return res.status(400).json({ ok:false, error:'Invalid email address' });
  }

  let supa, bd;
  try{
    supa = await saveToSupabase(email, language);
  }catch(err){
    console.error('[subscribe] Supabase failed for', email, '·', err.message);
    return res.status(502).json({ ok:false, error:'Could not save subscriber' });
  }

  try{
    bd = await saveToButtondown(email, language);
  }catch(err){
    // The subscriber is safely in our DB; surface a soft failure for Buttondown.
    console.error('[subscribe] Buttondown failed for', email, '·', err.message);
    bd = 'failed';
  }

  console.log(`[subscribe] ${email} (${language}) · supabase=${supa} · buttondown=${bd}`);
  return res.status(200).json({ ok:true, email, language, supabase:supa, buttondown:bd });
}
