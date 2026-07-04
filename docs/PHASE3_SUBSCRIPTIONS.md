# Phase 3 — Paid Subscriptions (Stripe)

Readers can become a **Member** ($5/mo · $50/yr) or **Insider** ($18/mo · $180/yr).
Payment is handled entirely by **Stripe Checkout** (hosted) — no card data ever
touches our servers. A reader's paid access is the `profiles.tier` flag, which is
set **only** by the Stripe webhook after payment is confirmed (never by the
browser). Members get an **ad-light** experience; the plumbing is ready for
Insider-only perks.

## ⚠️ Before you start: Stripe merchant country

Stripe only onboards businesses registered in
[supported countries](https://stripe.com/global) — which currently does **not**
include Mauritius or most African countries. To bill through Stripe you'll need a
company/bank in a supported country (US, UK, EU, etc.). If that's a blocker, tell
me and I can swap the payment layer to **Flutterwave** or **Paystack** (pan-African
support) — the app is structured so only the three `/api` payment files change.

## Setup — walk through it once (~15 min)

### 1. Run the database migration
Supabase → SQL Editor → run:
`supabase/migrations/20260707120000_subscriptions.sql`

### 2. Create the products & prices in Stripe
In the Stripe Dashboard (start in **Test mode** — toggle top-right):
1. **Products → Add product** → "AfriPulse Member". Add **two prices**: $5 / month
   (recurring) and $50 / year (recurring).
2. Add another product "AfriPulse Insider" with $18 / month and $180 / year.
3. For **each** of the 4 prices, copy its **Price ID** (looks like `price_1AbC…`).

### 3. Add the environment variables in Vercel
Project → Settings → Environment Variables:

| Variable | Where to find it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** (`sk_test_…` in test mode) |
| `STRIPE_WEBHOOK_SECRET` | from step 4 below (`whsec_…`) |
| `STRIPE_PRICE_MEMBER_MONTH` | the $5/month Price ID |
| `STRIPE_PRICE_MEMBER_YEAR` | the $50/year Price ID |
| `STRIPE_PRICE_INSIDER_MONTH` | the $18/month Price ID |
| `STRIPE_PRICE_INSIDER_YEAR` | the $180/year Price ID |

(You already have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from earlier.)

### 4. Add the webhook endpoint in Stripe
Stripe → Developers → **Webhooks → Add endpoint**:
- **Endpoint URL:** `https://YOUR-SITE/api/stripe-webhook`
- **Events to send:** `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- Save, then copy the endpoint's **Signing secret** (`whsec_…`) into
  `STRIPE_WEBHOOK_SECRET` (step 3) and **redeploy**.

### 5. Turn on the Billing Portal
Stripe → Settings → **Billing → Customer portal** → activate it (lets members
update cards / cancel). No code needed.

### 6. Test it (test mode)
Sign in as a reader → **Membership** → pick a plan → on Stripe's page use the test
card **4242 4242 4242 4242**, any future expiry, any CVC. After paying you're
redirected back and, within a few seconds, your profile shows your new tier and ads
disappear. Check **Supabase → subscriptions** for the row and `profiles.tier`.

When everything works in test mode, switch Stripe to **Live mode**, redo steps
2–4 with live keys/prices, and you're taking real payments.

## How it behaves

- **Free readers** see a "Become a member" call to action on their profile and at
  `#/upgrade`; **members/insiders** see "Manage subscription" (opens the Stripe
  Billing Portal) and read **ad-light**.
- Canceling (or a failed renewal) flips `profiles.tier` back to `free`
  automatically via the webhook.

## Security (verified against real Postgres)

- A reader **cannot change their own `tier`** — no column privilege on it; only the
  webhook (service role) writes it. Verified.
- A reader can read **only their own** `subscriptions` row (RLS). Verified.
- The webhook rejects any request whose Stripe signature doesn't verify.
- The tier logic is unit-tested: `active`/`trialing` → the paid tier; anything else
  → `free`; upgrades and cancellations map correctly (`npm test`).

## Where it lives

- **DB:** `supabase/migrations/20260707120000_subscriptions.sql`
- **API:** `api/create-checkout.js`, `api/stripe-webhook.js`, `api/billing-portal.js`
- **Front end:** `viewUpgrade` (`#/upgrade`), the membership block in `viewMe`,
  `startCheckout` / `openBillingPortal`, and `adsHidden()` (ad-light). Styling:
  the `.up-*` and `.rp-member` CSS.
- **Tests:** `tests/subscriptions.test.mjs`.

## Not yet (future)

- Regional / purchasing-power pricing for in-continent readers.
- Insider-only gated content sections (the `tier` flag is ready to gate on).
- Dunning emails / receipts beyond Stripe's defaults.
