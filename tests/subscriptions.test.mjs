// Tests for Phase 3 payments: price selection (create-checkout) and the webhook
// tier logic (stripe-webhook). Stripe/Supabase network calls are never made — we
// test the pure/injected functions only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrice, tierForPlan } from '../api/create-checkout.js';
import { statusToTier, normalizeStripeSub, applySubscriptionEvent } from '../api/stripe-webhook.js';

const ENV = {
  STRIPE_PRICE_MEMBER_MONTH:'price_mm', STRIPE_PRICE_MEMBER_YEAR:'price_my',
  STRIPE_PRICE_INSIDER_MONTH:'price_im', STRIPE_PRICE_INSIDER_YEAR:'price_iy'
};

test('pickPrice maps plan+interval to the right env price id', () => {
  assert.equal(pickPrice('member','month',ENV), 'price_mm');
  assert.equal(pickPrice('member','year',ENV), 'price_my');
  assert.equal(pickPrice('insider','month',ENV), 'price_im');
  assert.equal(pickPrice('insider','year',ENV), 'price_iy');
  assert.equal(pickPrice('member','week',ENV), null);   // unknown interval
  assert.equal(pickPrice('gold','month',ENV), null);    // unknown plan
});

test('tierForPlan defaults unknown plans to member', () => {
  assert.equal(tierForPlan('insider'), 'insider');
  assert.equal(tierForPlan('member'), 'member');
  assert.equal(tierForPlan('whatever'), 'member');
});

test('statusToTier grants the tier only when the subscription is active/trialing', () => {
  assert.equal(statusToTier('active','member'), 'member');
  assert.equal(statusToTier('trialing','insider'), 'insider');
  assert.equal(statusToTier('canceled','insider'), 'free');
  assert.equal(statusToTier('past_due','member'), 'free');
  assert.equal(statusToTier('incomplete','insider'), 'free');
  assert.equal(statusToTier('active','gold'), 'member'); // active but unknown tier → member
});

test('normalizeStripeSub reads user_id/tier from metadata and interval from the price', () => {
  const s = { id:'sub_1', customer:'cus_1', status:'active', current_period_end:1893456000,
    metadata:{ user_id:'u1', tier:'insider' }, items:{ data:[{ price:{ recurring:{ interval:'year' } } }] } };
  const n = normalizeStripeSub(s);
  assert.equal(n.user_id, 'u1');
  assert.equal(n.tier, 'insider');
  assert.equal(n.customer_id, 'cus_1');
  assert.equal(n.subscription_id, 'sub_1');
  assert.equal(n.status, 'active');
  assert.equal(n.interval, 'year');
  assert.match(n.period_end, /^20\d\d-/);   // ISO timestamp
});

function mockAdmin(calls){
  return { from(table){ return {
    upsert(row, opts){ calls.push({ op:'upsert', table, row, opts }); return Promise.resolve({ error:null }); },
    update(patch){ return { eq(col, val){ calls.push({ op:'update', table, patch, col, val }); return Promise.resolve({ error:null }); } }; }
  }; } };
}

test('applySubscriptionEvent upserts the subscription and syncs profiles.tier', async () => {
  const calls = [];
  const r = await applySubscriptionEvent(mockAdmin(calls),
    { user_id:'u1', customer_id:'cus_1', subscription_id:'sub_1', tier:'member', status:'active', interval:'month', period_end:null });
  assert.equal(r.tier, 'member');
  const up = calls.find(c => c.op==='upsert');
  assert.equal(up.table, 'subscriptions');
  assert.equal(up.row.user_id, 'u1');
  assert.equal(up.row.tier, 'member');
  assert.equal(up.row.billing_interval, 'month');
  const pf = calls.find(c => c.op==='update');
  assert.equal(pf.table, 'profiles');
  assert.deepEqual(pf.patch, { tier:'member' });
  assert.equal(pf.val, 'u1');
});

test('applySubscriptionEvent downgrades to free when canceled', async () => {
  const calls = [];
  const r = await applySubscriptionEvent(mockAdmin(calls),
    { user_id:'u1', tier:'insider', status:'canceled' });
  assert.equal(r.tier, 'free');
  assert.equal(calls.find(c => c.op==='upsert').row.tier, 'free');
  assert.deepEqual(calls.find(c => c.op==='update').patch, { tier:'free' });
});

test('applySubscriptionEvent no-ops safely when user_id is missing', async () => {
  const admin = { from(){ throw new Error('should not touch the DB without a user_id'); } };
  const r = await applySubscriptionEvent(admin, { status:'active', tier:'member' });
  assert.equal(r.ok, false);
});
