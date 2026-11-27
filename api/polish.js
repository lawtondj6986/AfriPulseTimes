// AfriPulse Times — rewrite choppy RSS wire text into a clean, coherent
// AfriPulse news brief with Claude.
//
// RSS feeds ship truncated, boilerplate-laden, single-blob text. This pass loads
// published wire articles that haven't been polished yet, asks Claude to rewrite
// them into a short, neutral, well-organised brief in AfriPulse's house voice —
// FACTS ONLY, nothing invented — and saves the result back to the article. The
// original wire text is preserved in payload.wire_original so the pass is fully
// reversible, and every wire item keeps its "Read at source" attribution.
//
// Runs before translation so the five-language versions are built from the clean
// text, not the choppy original.
//
// Invoked by: a daily Vercel cron, or the admin "Polish wire" button. Auth
// mirrors /api/translate: CRON_SECRET as a Bearer token, or a valid Supabase JWT.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, optional CRON_SECRET.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-opus-4-8';
const MAX_PER_RUN = 8;            // bound cost/time per invocation

// Build the polish prompt and parse Claude's JSON reply. Exported for tests.
// Returns { standfirst, body:[...] }. Throws if the reply is unusable.
export async function polishArticle(anthropic, article){
  const rawBody = Array.isArray(article.body)
    ? article.body.join('\n\n')
    : String(article.body || '');
  const prompt =
`You are a senior wire editor for AfriPulse Times, a pan-African news service. You are given raw, often truncated or messy text from a syndicated RSS news feed. Rewrite it into a clean, coherent, neutral news brief in clear house style.

Return ONLY a JSON object — no preamble, no markdown fences — with exactly this shape:
{"standfirst":"one-sentence summary","body":["paragraph 1","paragraph 2"]}

Strict rules:
- FACTS ONLY. Use only information present in the source text. Do NOT invent or infer names, quotes, figures, dates, locations, causes, or context that is not explicitly there.
- Preserve every proper noun, place name, organisation, and number exactly as given.
- Neutral, factual, third-person journalistic tone. No opinion, no first person, no direct address, no calls to action.
- Remove feed boilerplate ("Read more", "Continue reading", "The post … appeared first on …", share prompts, cookie/subscribe notices).
- 1 to 4 short paragraphs. If the source is very thin (e.g. little more than a headline), write a single concise, factual sentence — do NOT pad it out with filler.
- "standfirst" is a single summarising sentence, at most ~200 characters.
- Do NOT include the headline in the body.

Headline (for context only, do not repeat): ${article.headline || ''}

Raw feed text:
${rawBody || '(none provided)'}`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if(start === -1 || end === -1) throw new Error('no JSON in model reply');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const body = Array.isArray(parsed.body)
    ? parsed.body.map(p => String(p || '').trim()).filter(Boolean)
    : [];
  if(!body.length) throw new Error('reply missing a usable body');
  const standfirst = String(parsed.standfirst || '').trim();
  return { standfirst: standfirst || (article.standfirst || ''), body };
}

async function isAuthorized(req, admin){
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if(process.env.CRON_SECRET){
    if(token && token === process.env.CRON_SECRET) return true;
    if(token){ try{ const { data, error } = await admin.auth.getUser(token); if(!error && data && data.user) return true; }catch(e){} }
    return false;
  }
  console.warn('[polish] CRON_SECRET not set — endpoint is unprotected.');
  return true;
}

export default async function handler(req, res){
  const started = Date.now();
  if(!SUPABASE_URL || !SERVICE_KEY){
    console.error('[polish] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured (Supabase)' });
  }
  if(!ANTHROPIC_API_KEY){
    console.error('[polish] Missing ANTHROPIC_API_KEY');
    return res.status(500).json({ ok:false, error:'Server not configured (ANTHROPIC_API_KEY)' });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });
  if(!(await isAuthorized(req, admin))){
    return res.status(401).json({ ok:false, error:'Unauthorized' });
  }

  // Only unpolished, published wire items — oldest first so nothing is starved.
  const { data: rows, error } = await admin
    .from('articles')
    .select('id, slug, headline, dek, payload, polished_at')
    .eq('status', 'published')
    .eq('source', 'rss')
    .is('polished_at', null)
    .order('published_at', { ascending: true })
    .limit(MAX_PER_RUN);
  if(error){
    console.error('[polish] load failed:', error.message);
    return res.status(500).json({ ok:false, error:error.message });
  }
  console.log(`[polish] start · ${rows.length} unpolished wire article(s)`);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const report = [];
  let polished = 0;

  for(const row of rows){
    const p = row.payload || {};
    const article = {
      headline: p.headline || row.headline || '',
      standfirst: p.standfirst || row.dek || '',
      body: Array.isArray(p.body) ? p.body : (p.body ? [String(p.body)] : [])
    };
    try{
      const clean = await polishArticle(anthropic, article);

      // Non-destructive: keep the original wire text once, then swap in the brief.
      const nextPayload = Object.assign({}, p);
      if(!nextPayload.wire_original){
        nextPayload.wire_original = { standfirst: article.standfirst, body: article.body };
      }
      nextPayload.standfirst = clean.standfirst;
      nextPayload.body = clean.body;
      nextPayload.polished = true;             // drives the UI transparency note

      const { error: upErr } = await admin.from('articles').update({
        payload: nextPayload,
        dek: clean.standfirst,
        body: clean.body.join('\n\n'),
        polished_at: new Date().toISOString()
      }).eq('id', row.id);
      if(upErr) throw upErr;

      polished++;
      console.log(`[polish] OK   ${row.slug}`);
      report.push({ slug: row.slug, ok: true });
    }catch(err){
      const msg = String((err && err.message) || err);
      console.error(`[polish] FAIL ${row.slug} · ${msg}`);
      report.push({ slug: row.slug, ok: false, error: msg });
    }
  }

  const ms = Date.now() - started;
  console.log(`[polish] done · polished ${polished}/${rows.length} · ${ms}ms`);
  return res.status(200).json({ ok:true, polished, articles: report, ms });
}
