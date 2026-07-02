// AfriPulse Times — investor / partner enquiry capture (Vercel serverless).
//
// Accepts { name, email, organisation, interest, message, language } from the
// investor section's contact form, records it in the Supabase `leads` table, and
// (best-effort) emails a notification to the team so nobody has to sit watching
// the dashboard. The service_role key bypasses RLS so an anonymous visitor's
// enquiry can be inserted while the table stays locked down to the public anon key.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — required (save the lead)
//   RESEND_API_KEY                            — optional (send notification email)
//   LEADS_NOTIFY_TO                           — optional (recipient; can be a
//                                               comma-separated list)
//   LEADS_NOTIFY_FROM                         — optional (verified sender;
//                                               defaults to Resend's shared sender)
// If RESEND_API_KEY or LEADS_NOTIFY_TO is absent, the email step is skipped and
// the enquiry is still saved — the notification is never allowed to fail the request.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const NOTIFY_TO = process.env.LEADS_NOTIFY_TO || '';
const NOTIFY_FROM = process.env.LEADS_NOTIFY_FROM || 'AfriPulse Times <onboarding@resend.dev>';

const LANGUAGES = ['en', 'fr', 'ar', 'sw', 'pt'];
const INTERESTS = ['investor', 'advertiser', 'partner', 'other'];
const INTEREST_LABEL = { investor:'Investor', advertiser:'Advertiser', partner:'Partner', other:'Other' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Email the team about a new enquiry via Resend. Returns 'sent' | 'skipped' |
// throws. Exported for tests. Best-effort: the caller swallows failures.
export async function notifyNewLead(lead){
  if(!RESEND_API_KEY || !NOTIFY_TO){
    console.warn('[contact] RESEND_API_KEY or LEADS_NOTIFY_TO not set — skipping notification.');
    return 'skipped';
  }
  const to = NOTIFY_TO.split(',').map(s => s.trim()).filter(Boolean);
  const label = INTEREST_LABEL[lead.interest] || 'Enquiry';
  const subject = `New ${label.toLowerCase()} enquiry — ${lead.name}`;
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Interest', label],
    ['Organisation', lead.organisation || '—'],
    ['Language', (lead.language || 'en').toUpperCase()],
    ['Message', lead.message || '—']
  ];
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#14140F">' +
      '<div style="background:#0E2818;color:#F3EEE2;padding:18px 22px;border-radius:8px 8px 0 0">' +
        '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#C9A227;font-weight:700">AfriPulse Times · New enquiry</div>' +
        '<div style="font-size:20px;font-weight:700;margin-top:4px">' + esc(lead.name) + ' &middot; ' + esc(label) + '</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #E2DCD0;border-top:none">' +
        rows.map(function(r){
          return '<tr>' +
            '<td style="padding:10px 14px;background:#FAF8F3;border-bottom:1px solid #E2DCD0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6B6660;font-weight:600;width:130px;vertical-align:top">' + esc(r[0]) + '</td>' +
            '<td style="padding:10px 14px;border-bottom:1px solid #E2DCD0;font-size:14px;color:#14140F;white-space:pre-wrap">' + esc(r[1]) + '</td>' +
          '</tr>';
        }).join('') +
      '</table>' +
      '<div style="padding:16px 22px;font-size:12px;color:#6B6660">' +
        'Reply directly to <a href="mailto:' + esc(lead.email) + '" style="color:#1E6B3A">' + esc(lead.email) + '</a>, ' +
        'or manage it in the admin desk under <strong>Enquiries</strong>.' +
      '</div>' +
    '</div>';
  const text = subject + '\n\n' +
    rows.map(function(r){ return r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nReply to ' + lead.email + ' or open the admin Enquiries tab.';

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to,
      reply_to: lead.email,
      subject,
      html,
      text
    })
  });
  if(res.status === 200 || res.status === 201) return 'sent';
  const detail = await res.text().catch(() => '');
  throw new Error('resend ' + res.status + ': ' + detail.slice(0, 300));
}

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

  const lead = { name, email, organisation: organisation || null, interest, message: message || null, language };

  let id;
  try{
    id = await saveLead(lead);
  }catch(err){
    console.error('[contact] Supabase failed for', email, '·', err.message);
    return res.status(502).json({ ok:false, error:'Could not save enquiry' });
  }

  // Notify the team. Best-effort: the lead is safely saved, so a mail failure
  // must not turn into an error for the visitor.
  let notify = 'skipped';
  try{
    notify = await notifyNewLead(lead);
  }catch(err){
    console.error('[contact] Notification failed for', email, '·', err.message);
    notify = 'failed';
  }

  console.log(`[contact] ${email} (${interest}/${language}) · id=${id} · notify=${notify}`);
  return res.status(200).json({ ok:true, id });
}
