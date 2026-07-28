// AfriPulse Times — SMS opt-in (Vercel serverless function).
//
// Accepts { phone, country, language } from the public site, normalises the phone
// to E.164 (Nigeria pilot default +234), and records it in sms_subscribers via the
// service role (RLS blocks anon direct writes). The daily digest (/api/sms-digest)
// sends to everyone here who is active.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional SMS_DEFAULT_CC.

import { createClient } from '@supabase/supabase-js';
import { normalizePhone, isValidE164 } from './sms-digest.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LANGUAGES = ['en', 'fr', 'ar', 'sw', 'pt'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  body = body || {};

  const phone = normalizePhone(body.phone, body.cc);
  const country = body.country ? String(body.country).slice(0, 60) : null;
  const language = LANGUAGES.includes(body.language) ? body.language : 'en';

  if (!isValidE164(phone)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid mobile number (e.g. 0803 123 4567).' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from('sms_subscribers').insert({ phone, country, language, source: 'web' });
  if (error) {
    if (error.code === '23505') return res.status(200).json({ ok: true, phone, status: 'already subscribed' });
    console.error('[sms-subscribe] failed for', phone, '·', error.message);
    return res.status(502).json({ ok: false, error: 'Could not save your number. Please try again.' });
  }
  console.log('[sms-subscribe]', phone, country || '');
  return res.status(200).json({ ok: true, phone, status: 'subscribed' });
}
