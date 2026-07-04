// AfriPulse Times — Stripe webhook (Phase 3). The ONLY thing that changes a
// reader's paid tier. Stripe calls this after checkout and on every subscription
// change; we verify the signature, then set profiles.tier + the subscriptions row
// using the service-role key. Never trust the browser to grant paid access.
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.
//
// Vercel: the raw body is required for signature verification, so body parsing is
// disabled and we read the stream ourselves.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// An active subscription grants its tier; anything else drops to free. Exported for tests.
export function statusToTier(status, metaTier){
  const active = status === 'active' || status === 'trialing';
  if(!active) return 'free';
  return metaTier === 'insider' ? 'insider' : 'member';
}

// Normalise a Stripe Subscription object to the fields we persist. Exported for tests.
export function normalizeStripeSub(s){
  const meta = s.metadata || {};
  const item = s.items && s.items.data && s.items.data[0];
  const interval = (item && item.price && item.price.recurring && item.price.recurring.interval) || meta.billing_interval || null;
  return {
    user_id: meta.user_id || null,
    customer_id: typeof s.customer === 'string' ? s.customer : (s.customer && s.customer.id) || null,
    subscription_id: s.id || null,
    tier: meta.tier || null,
    status: s.status || 'inactive',
    interval: interval,
    period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null
  };
}

// Persist a normalised subscription: upsert the row and sync profiles.tier.
// Exported + dependency-injected (admin) for tests.
export async function applySubscriptionEvent(admin, sub){
  if(!sub || !sub.user_id) return { ok:false, skipped:'no user_id' };
  const tier = statusToTier(sub.status, sub.tier);
  await admin.from('subscriptions').upsert({
    user_id: sub.user_id,
    stripe_customer_id: sub.customer_id || null,
    stripe_subscription_id: sub.subscription_id || null,
    tier: tier,
    status: sub.status || 'inactive',
    billing_interval: (sub.interval === 'year' || sub.interval === 'month') ? sub.interval : null,
    current_period_end: sub.period_end || null
  }, { onConflict:'user_id' });
  await admin.from('profiles').update({ tier: tier }).eq('id', sub.user_id);
  return { ok:true, tier: tier };
}

async function readRawBody(req){
  const chunks = [];
  for await (const chunk of req){ chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk); }
  return Buffer.concat(chunks);
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method not allowed');
  if(!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY){
    console.error('[stripe-webhook] missing env');
    return res.status(500).send('Server not configured');
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

  let event;
  try{
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  }catch(err){
    console.error('[stripe-webhook] signature verification failed:', (err && err.message) || err);
    return res.status(400).send('Webhook signature verification failed');
  }

  try{
    if(event.type === 'checkout.session.completed'){
      const session = event.data.object;
      if(session.subscription){
        const s = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        );
        // Checkout metadata is the most reliable source of user_id/tier.
        s.metadata = Object.assign({}, s.metadata, session.metadata);
        await applySubscriptionEvent(admin, normalizeStripeSub(s));
      }
    } else if(event.type === 'customer.subscription.created'
           || event.type === 'customer.subscription.updated'
           || event.type === 'customer.subscription.deleted'){
      await applySubscriptionEvent(admin, normalizeStripeSub(event.data.object));
    }
    return res.status(200).json({ received:true });
  }catch(err){
    console.error('[stripe-webhook] handler error:', (err && err.message) || err);
    return res.status(500).send('Webhook handler error');
  }
}
