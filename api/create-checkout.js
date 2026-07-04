// AfriPulse Times — start a Stripe Checkout for a paid subscription (Phase 3).
//
// Called by the front end (signed-in reader) with { plan, interval }. Verifies the
// Supabase JWT, finds or creates the reader's Stripe customer, opens a Checkout
// Session in subscription mode, and returns its URL for the browser to redirect to.
// The reader's tier is upgraded later by the webhook (api/stripe-webhook.js) once
// Stripe confirms payment — never trust the browser for that.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the four
// price IDs: STRIPE_PRICE_MEMBER_MONTH, STRIPE_PRICE_MEMBER_YEAR,
// STRIPE_PRICE_INSIDER_MONTH, STRIPE_PRICE_INSIDER_YEAR. Optional SITE_URL.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export const PLANS = { member:'member', insider:'insider' };

// Which Stripe price ID applies, from env. Pure + exported for tests.
export function pickPrice(plan, interval, env){
  const key = 'STRIPE_PRICE_' + String(plan||'').toUpperCase() + '_' + String(interval||'').toUpperCase();
  return (env || process.env)[key] || null;
}
export function tierForPlan(plan){ return plan === 'insider' ? 'insider' : 'member'; }

function siteOrigin(req){
  const o = (req.headers && (req.headers.origin || req.headers.referer)) || '';
  if(o) { try { return new URL(o).origin; } catch(e){} }
  return process.env.SITE_URL || 'https://afri-pulse-times.vercel.app';
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });
  if(!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY){
    return res.status(500).json({ ok:false, error:'Server not configured (Stripe/Supabase env).' });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

  // Authenticate the reader from their Supabase JWT.
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i,'').trim();
  if(!token) return res.status(401).json({ ok:false, error:'Sign in required.' });
  let user;
  try{ const { data, error } = await admin.auth.getUser(token); if(error || !data || !data.user) throw new Error('bad token'); user = data.user; }
  catch(e){ return res.status(401).json({ ok:false, error:'Sign in required.' }); }

  const body = (req.body && typeof req.body === 'object') ? req.body : (function(){ try{ return JSON.parse(req.body||'{}'); }catch(e){ return {}; } })();
  const plan = body.plan === 'insider' ? 'insider' : 'member';
  const interval = body.interval === 'year' ? 'year' : 'month';
  const price = pickPrice(plan, interval, process.env);
  if(!price) return res.status(400).json({ ok:false, error:'That plan is not configured yet (missing price ID).' });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  try{
    // Reuse the reader's Stripe customer if we've seen one; else create + store it.
    let customerId = null;
    const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if(sub && sub.stripe_customer_id) customerId = sub.stripe_customer_id;
    if(!customerId){
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await admin.from('subscriptions').upsert({ user_id: user.id, stripe_customer_id: customerId, tier:'free', status:'inactive' }, { onConflict:'user_id' });
    }

    const origin = siteOrigin(req);
    const tier = tierForPlan(plan);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { user_id: user.id, tier: tier, billing_interval: interval },
      subscription_data: { metadata: { user_id: user.id, tier: tier, billing_interval: interval } },
      success_url: origin + '/afripulse-preview.html?checkout=success#/me',
      cancel_url: origin + '/afripulse-preview.html#/upgrade'
    });
    return res.status(200).json({ ok:true, url: session.url });
  }catch(err){
    console.error('[create-checkout]', (err && err.message) || err);
    return res.status(500).json({ ok:false, error: (err && err.message) || 'Could not start checkout.' });
  }
}
