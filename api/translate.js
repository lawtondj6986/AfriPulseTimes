// AfriPulse Times — translate published articles into French + Arabic with Claude.
//
// Loads published articles that have no translation yet, asks Claude to
// translate headline / standfirst / body into fr and ar, and saves the result
// to articles.translations. The front end swaps these in when the reader picks
// French or Arabic.
//
// Invoked by: a daily Vercel cron, or the admin on demand. Auth mirrors
// /api/pull-wire: CRON_SECRET as a Bearer token, or a valid Supabase user JWT.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role to read/write),
// ANTHROPIC_API_KEY, and optionally CRON_SECRET.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-opus-4-8';
const MAX_PER_RUN = 8;            // bound cost/time per invocation

// Build the translation prompt and parse Claude's JSON reply. Exported for tests.
export async function translateArticle(anthropic, article){
  const body = Array.isArray(article.body) ? article.body : (article.body ? [String(article.body)] : []);
  const prompt =
`You are a professional translator for a pan-African news service. Translate the article below into French (fr) and Modern Standard Arabic (ar).

Return ONLY a JSON object — no preamble, no markdown fences — with exactly this shape:
{"fr":{"headline":"...","standfirst":"...","body":["paragraph 1", "..."]},"ar":{"headline":"...","standfirst":"...","body":["paragraph 1", "..."]}}

Rules:
- Keep a neutral journalistic tone. Preserve proper nouns, place names, and figures.
- The "body" array must contain exactly ${body.length} paragraph(s), translating each in order.

Article:
Headline: ${article.headline || ''}
Standfirst: ${article.standfirst || ''}
Body:
${body.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if(start === -1 || end === -1) throw new Error('no JSON in model reply');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if(!parsed.fr || !parsed.ar) throw new Error('reply missing fr/ar');
  return { fr: parsed.fr, ar: parsed.ar };
}

async function isAuthorized(req, admin){
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if(process.env.CRON_SECRET){
    if(token && token === process.env.CRON_SECRET) return true;
    if(token){ try{ const { data, error } = await admin.auth.getUser(token); if(!error && data && data.user) return true; }catch(e){} }
    return false;
  }
  console.warn('[translate] CRON_SECRET not set — endpoint is unprotected.');
  return true;
}

export default async function handler(req, res){
  const started = Date.now();
  if(!SUPABASE_URL || !SERVICE_KEY){
    console.error('[translate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured (Supabase)' });
  }
  if(!ANTHROPIC_API_KEY){
    console.error('[translate] Missing ANTHROPIC_API_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured (ANTHROPIC_API_KEY)' });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });
  if(!(await isAuthorized(req, admin))){
    return res.status(401).json({ ok:false, error:'Unauthorized' });
  }

  const { data: rows, error } = await admin
    .from('articles')
    .select('id, slug, headline, dek, payload, translations')
    .eq('status', 'published')
    .is('translations', null)
    .limit(MAX_PER_RUN);
  if(error){
    console.error('[translate] load failed:', error.message);
    return res.status(500).json({ ok:false, error:error.message });
  }
  console.log(`[translate] start · ${rows.length} untranslated published article(s)`);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const report = [];
  let translated = 0;

  for(const row of rows){
    const p = row.payload || {};
    const article = {
      headline: p.headline || row.headline || '',
      standfirst: p.standfirst || row.dek || '',
      body: Array.isArray(p.body) ? p.body : []
    };
    try{
      const t = await translateArticle(anthropic, article);
      const { error: upErr } = await admin.from('articles').update({ translations: t }).eq('id', row.id);
      if(upErr) throw upErr;
      translated++;
      console.log(`[translate] OK   ${row.slug}`);
      report.push({ slug: row.slug, ok: true });
    }catch(err){
      const msg = String((err && err.message) || err);
      console.error(`[translate] FAIL ${row.slug} · ${msg}`);
      report.push({ slug: row.slug, ok: false, error: msg });
    }
  }

  const ms = Date.now() - started;
  console.log(`[translate] done · translated ${translated}/${rows.length} · ${ms}ms`);
  return res.status(200).json({ ok:true, translated, articles: report, ms });
}
