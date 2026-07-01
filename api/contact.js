// AfriPulse Times — investor / partner enquiry capture (Vercel serverless).
//
// Accepts { name, email, organisation, interest, message, language } from the
// investor section's contact form and records it in the Supabase `leads` table.
// The service_role key bypasses RLS so an anonymous visitor's enquiry can be
// inserted while the table stays locked down to the public anon key.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LANGUAGES = ['en', 'fr', 'ar'];
const INTERESTS = ['investor', 'advertiser', 'partner', 'other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Insert the lead. Returns the created row's id (or null). Exported for tests.
export async function saveLead(lead){
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });
  const { data, error } = await admin.from('leads').insert(lead).select('id').single();
  if(error) throw new Error('supabase: ' + error.message);
  return data ? data.id : null;
}

export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }
  if(!SUPABASE_URL || !SERVICE_KEY){
    console.error('[contact] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured' });
  }

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body || '{}'); }catch(e){ body = {}; } }
  body = body || {};

  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
  const organisation = String(body.organisation || body.org || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 4000);
  const interest = INTERESTS.includes(body.interest) ? body.interest : 'other';
  const language = LANGUAGES.includes(body.language) ? body.language : 'en';

  if(!name){
    return res.status(400).json({ ok:false, error:'Name is required' });
  }
  if(!EMAIL_RE.test(email)){
    return res.status(400).json({ ok:false, error:'Invalid email address' });
  }

  let id;
  try{
    id = await saveLead({ name, email, organisation: organisation || null, interest, message: message || null, language });
  }catch(err){
    console.error('[contact] Supabase failed for', email, '·', err.message);
    return res.status(502).json({ ok:false, error:'Could not save enquiry' });
  }

  console.log(`[contact] ${email} (${interest}/${language}) · id=${id}`);
  return res.status(200).json({ ok:true, id });
}
