// AfriPulse Times — open the Stripe Billing Portal so a paying reader can update
// their card, view invoices, or cancel (Phase 3). Verifies the Supabase JWT, looks
// up the reader's Stripe customer, and returns a portal URL to redirect to.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional SITE_URL.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function siteOrigin(req){
  const o = (req.headers && (req.headers.origin || req.headers.referer)) || '';
  if(o){ try{ return new URL(o).origin; }catch(e){} }
  return process.env.SITE_URL || 'https://afri-pulse-times.vercel.app';
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });
  if(!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY){
    return res.status(500).json({ ok:false, error:'Server not configured (Stripe/Supabase env).' });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i,'').trim();
  if(!token) return res.status(401).json({ ok:false, error:'Sign in required.' });
  let user;
  try{ const { data, error } = await admin.auth.getUser(token); if(error || !data || !data.user) throw new Error('bad token'); user = data.user; }
  catch(e){ return res.status(401).json({ ok:false, error:'Sign in required.' }); }

  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if(!sub || !sub.stripe_customer_id) return res.status(400).json({ ok:false, error:'No subscription found for this account.' });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  try{
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: siteOrigin(req) + '/afripulse-preview.html#/me'
    });
    return res.status(200).json({ ok:true, url: session.url });
  }catch(err){
    console.error('[billing-portal]', (err && err.message) || err);
    return res.status(500).json({ ok:false, error:(err && err.message) || 'Could not open billing portal.' });
  }
}
