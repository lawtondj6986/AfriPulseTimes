// AfriPulse Times — real-time story broadcast (Vercel serverless function).
//
// When an editor approves a story in the Command Center, the browser POSTs the
// story's slug here and we push a headline + link out to the messaging channels
// (Telegram now; WhatsApp Cloud API when configured). Idempotent: a story is
// broadcast exactly once (guarded by articles.broadcast_at), so repeated approves
// or a retry never double-post.
//
// Invoked by: the Command Center approve action (authenticated editor JWT).
//
// Auth: CRON_SECRET as a Bearer token (server) OR a signed-in EDITOR's Supabase
// JWT. With no CRON_SECRET set the endpoint runs open (local dev only).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, optional CRON_SECRET,
//   Telegram:  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//   WhatsApp:  WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TO (comma-separated E.164)
// Every channel is optional — unset channels are simply skipped (graceful no-op).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://afri-pulse-times.vercel.app').replace(/\/$/, '');

const VLABEL = {
  front: 'Africa', politics: 'Politics', mining: 'Mining & Energy', markets: 'Business',
  tech: 'Tech', culture: 'Culture', sports: 'Sport', opinions: 'Opinion', podcasts: 'Podcast'
};

// ── pure helpers (exported for tests) ─────────────────────────
export function storyUrl(slug, site) {
  return (site || SITE_URL).replace(/\/$/, '') + '/afripulse-preview.html#/article/' + encodeURIComponent(slug || '');
}

export function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// Plain-text message that reads well on Telegram and WhatsApp alike.
export function composeMessage(a, site) {
  const url = storyUrl(a.slug, site);
  const tag = VLABEL[a.vertical] || 'Africa';
  const place = (a.dateline && a.dateline !== 'Wire') ? (String(a.dateline).toUpperCase() + ' · ') : '';
  const dek = a.standfirst ? '\n' + clip(a.standfirst, 160) : '';
  return {
    url,
    text: '🌍 AfriPulse Times · ' + tag + '\n\n' + place + (a.headline || '') + dek + '\n\n📲 Read: ' + url
  };
}

export function selectChannels(env) {
  return {
    telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
    whatsapp: !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID && env.WHATSAPP_TO)
  };
}

export function telegramRequest(env, msg) {
  return {
    channel: 'telegram',
    url: 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage',
    init: {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg.text, disable_web_page_preview: false })
    }
  };
}

// WhatsApp Cloud API sends to each recipient/broadcast number individually.
export function whatsappRequests(env, msg) {
  const tos = String(env.WHATSAPP_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  return tos.map(to => ({
    channel: 'whatsapp',
    to,
    url: 'https://graph.facebook.com/v20.0/' + env.WHATSAPP_PHONE_ID + '/messages',
    init: {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.WHATSAPP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: true, body: msg.text } })
    }
  }));
}

// Normalise a DB row (typed columns + payload) into the fields the message needs.
export function articleFromRow(row) {
  const p = row && row.payload || {};
  return {
    slug: row.slug,
    headline: row.headline || p.headline || '',
    vertical: row.vertical || p.vertical || 'front',
    dateline: p.dateline || null,
    standfirst: p.standfirst || p.dek || row.dek || ''
  };
}

// ── I/O ───────────────────────────────────────────────────────
async function sendReq(r) {
  try {
    const res = await fetch(r.url, r.init);
    const t = await res.text().catch(() => '');
    return { channel: r.channel, to: r.to, status: res.status, ok: res.ok, body: t.slice(0, 300) };
  } catch (e) {
    return { channel: r.channel, to: r.to, ok: false, error: String((e && e.message) || e) };
  }
}

async function isEditor(req, admin) {
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (process.env.CRON_SECRET) {
    if (token && token === process.env.CRON_SECRET) return true;   // server-to-server
    if (!token) return false;
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data || !data.user) return false;
      const { data: prof } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      return !!(prof && (prof.role === 'editor' || prof.role === 'admin'));
    } catch (e) { return false; }
  }
  console.warn('[broadcast] CRON_SECRET not set — endpoint is unprotected. Set it before production.');
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Server not configured' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await isEditor(req, admin))) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  body = body || {};
  const slug = String(body.slug || '').trim();
  if (!slug) return res.status(400).json({ ok: false, error: 'Missing slug' });

  const { data: rows, error } = await admin
    .from('articles').select('slug,headline,dek,vertical,status,payload,broadcast_at').eq('slug', slug).limit(1);
  if (error) return res.status(502).json({ ok: false, error: error.message });
  const row = rows && rows[0];
  if (!row) return res.status(404).json({ ok: false, error: 'Story not found' });
  if (row.status !== 'published') return res.status(409).json({ ok: false, error: 'Only published stories are broadcast' });
  if (row.broadcast_at) return res.status(200).json({ ok: true, slug, skipped: 'already broadcast', at: row.broadcast_at });

  const msg = composeMessage(articleFromRow(row), SITE_URL);
  const channels = selectChannels(process.env);
  const results = [];
  if (channels.telegram) results.push(await sendReq(telegramRequest(process.env, msg)));
  if (channels.whatsapp) {
    const wa = await Promise.all(whatsappRequests(process.env, msg).map(sendReq));
    wa.forEach(r => results.push(r));
  }

  const configured = channels.telegram || channels.whatsapp;
  // Stamp regardless of per-channel success so a failing channel can't spam a
  // retry loop. (Unconfigured → not stamped, so it broadcasts once creds land.)
  if (configured) {
    await admin.from('articles').update({ broadcast_at: new Date().toISOString() }).eq('slug', slug);
  }

  return res.status(200).json({
    ok: true, slug,
    channels: Object.keys(channels).filter(k => channels[k]),
    configured, results, preview: msg.text
  });
}
