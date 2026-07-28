// AfriPulse Times — SMS daily digest (Vercel serverless function).
//
// Sends the day's top headlines as a short SMS to opted-in subscribers, via
// Africa's Talking (great coverage in Nigeria and across the continent). SMS is
// metered, so this is a once-a-day digest — not per-story like WhatsApp/Telegram.
//
// Invoked by: a daily Vercel cron (see vercel.json) OR an editor from the admin.
// Auth: CRON_SECRET Bearer token (cron) or a signed-in editor JWT.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, optional CRON_SECRET,
//   Africa's Talking: AT_API_KEY, AT_USERNAME, optional AT_SENDER (sender id/shortcode).
// If AT creds are absent the digest is composed and reported but not sent (no-op).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afri-pulse-times.vercel.app').replace(/\/$/, '');
const DEFAULT_CC = process.env.SMS_DEFAULT_CC || '234'; // Nigeria pilot

// ── pure helpers (exported for tests) ─────────────────────────
// Normalise a raw phone to E.164, defaulting the country code (Nigeria = 234).
export function normalizePhone(raw, defaultCc) {
  const cc = String(defaultCc || DEFAULT_CC).replace(/\D/g, '');
  let s = String(raw || '').trim();
  const hadPlus = s.trim().startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!d) return '';
  if (hadPlus) return '+' + d;              // already international
  if (d.startsWith('00')) return '+' + d.slice(2);
  if (d.startsWith(cc)) return '+' + d;      // includes country code, no plus
  if (d.startsWith('0')) return '+' + cc + d.slice(1); // national trunk 0 → +cc
  return '+' + cc + d;                        // bare national number
}

export function isValidE164(p) { return /^\+[1-9]\d{7,14}$/.test(p || ''); }

export function clipSms(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// A compact digest that fits a couple of SMS segments. Keeps it cheap.
export function composeDigest(items, site) {
  const host = String(site || SITE_URL).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const lines = (items || []).slice(0, 4).map((a, i) => (i + 1) + '. ' + clipSms(a.headline, 62));
  const head = 'AfriPulse Times — today\'s headlines';
  const foot = 'Read more: ' + host + ' Txt STOP to opt out';
  return [head, lines.join('\n'), foot].filter(Boolean).join('\n');
}

export function smsConfigured(env) { return !!(env.AT_API_KEY && env.AT_USERNAME); }

export function africasTalkingRequest(env, recipients, text) {
  const params = new URLSearchParams();
  params.set('username', env.AT_USERNAME);
  params.set('to', (recipients || []).join(','));
  params.set('message', text);
  if (env.AT_SENDER) params.set('from', env.AT_SENDER);
  return {
    url: 'https://api.africastalking.com/version1/messaging',
    init: {
      method: 'POST',
      headers: { 'apiKey': env.AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params.toString()
    }
  };
}

// ── I/O ───────────────────────────────────────────────────────
async function isAuthorized(req, admin) {
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (process.env.CRON_SECRET) {
    if (token && token === process.env.CRON_SECRET) return true;
    if (!token) return false;
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data || !data.user) return false;
      const { data: prof } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      return !!(prof && (prof.role === 'editor' || prof.role === 'admin'));
    } catch (e) { return false; }
  }
  console.warn('[sms-digest] CRON_SECRET not set — endpoint is unprotected. Set it before production.');
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Server not configured' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await isAuthorized(req, admin))) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  // Today's top published headlines.
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const { data: arts, error: aErr } = await admin
    .from('articles').select('headline,payload,published_at,status')
    .eq('status', 'published').gte('published_at', since.toISOString())
    .order('published_at', { ascending: false }).limit(8);
  if (aErr) return res.status(502).json({ ok: false, error: aErr.message });
  const items = (arts || []).map(a => ({ headline: a.headline || (a.payload && a.payload.headline) || '' }))
    .filter(a => a.headline);

  if (!items.length) return res.status(200).json({ ok: true, sent: 0, note: 'No published stories today.' });

  const { data: subs, error: sErr } = await admin
    .from('sms_subscribers').select('phone').eq('active', true).limit(5000);
  if (sErr) return res.status(502).json({ ok: false, error: sErr.message });
  const recipients = (subs || []).map(s => s.phone).filter(isValidE164);

  const text = composeDigest(items, SITE_URL);

  if (!smsConfigured(process.env)) {
    return res.status(200).json({ ok: true, configured: false, recipients: recipients.length, preview: text, note: 'Africa\'s Talking not configured — composed only.' });
  }
  if (!recipients.length) {
    return res.status(200).json({ ok: true, configured: true, sent: 0, preview: text, note: 'No active SMS subscribers yet.' });
  }

  const r = africasTalkingRequest(process.env, recipients, text);
  let result;
  try {
    const resp = await fetch(r.url, r.init);
    const bodyText = await resp.text().catch(() => '');
    result = { status: resp.status, ok: resp.ok, body: bodyText.slice(0, 400) };
  } catch (e) { result = { ok: false, error: String((e && e.message) || e) }; }

  return res.status(200).json({ ok: true, configured: true, recipients: recipients.length, headlines: items.length, preview: text, result });
}
