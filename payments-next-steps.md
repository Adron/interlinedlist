# Payments: Next Steps for Production (Live Mode)

This document outlines the steps to move Stripe from test/sandbox mode to live production. You've already built out the test setup; these steps mirror that for live payments.

---

## Overview

| Area | Test (Done) | Live (To Do) |
|------|--------------|--------------|
| Products & Prices | ✓ Created | Create in live mode |
| API Keys | `sk_test_`, `pk_test_` | `sk_live_`, `pk_live_` |
| Webhook | CLI or test endpoint | Production endpoint |
| Env vars | `.env.local` | Production env (e.g. Vercel) |

---

## 1. Activate Your Stripe Account for Live Payments

Before you can accept real payments, Stripe must activate your account.

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) and ensure you're in **live mode** (toggle in top-right).
2. Complete the **account activation** flow if prompted:
   - Business details (name, type, address)
   - Identity verification (for account owner)
   - Bank account for payouts
3. Review Stripe's [Prohibited & Restricted businesses](https://stripe.com/restricted-businesses) list.
4. Set up **2FA** (Settings → Security) before going live.
5. Configure **payout schedule** (Settings → Payouts) — daily is recommended.

**Reference:** [Stripe Go-Live Checklist](https://docs.stripe.com/get-started/checklist/go-live)

---

## 2. Create Products and Prices in Live Mode

Products and prices in test mode do **not** exist in live mode. You must recreate them.

1. Switch to **live mode** in the Stripe Dashboard (top-right toggle).
2. Go to [Products](https://dashboard.stripe.com/products).
3. Click **Add product**.
4. Create a product, e.g.:
   - **Name:** InterlinedList Subscription
   - **Description:** (optional) Subscription to InterlinedList
5. Add **two recurring prices**:
   - **Monthly:** e.g. $6.99/month (or your chosen amount)
   - **Annual:** e.g. $60/year (or your chosen amount)
6. Copy the **Price IDs** — they start with `price_` and are different from your test IDs.

**Important:** Live price IDs look like `price_1ABC123...` and are distinct from test IDs like `price_1Test456...`.

---

## 3. Get Live API Keys

1. In **live mode**, go to [API Keys](https://dashboard.stripe.com/apikeys).
2. Copy:
   - **Publishable key** (`pk_live_...`) — safe to expose in client code
   - **Secret key** (`sk_live_...`) — never expose; server-only
3. **Rotate keys** before going live if you've ever exposed them (e.g. in a repo).

---

## 4. Register Production Webhook Endpoint

Webhooks let Stripe notify your app when subscriptions change. The production webhook has its own signing secret.

### Step-by-step

1. In **live mode**, go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. **Endpoint URL:**  
   `https://interlinedlist.com/api/webhooks/stripe`  
   (Replace with your actual production domain if different.)
4. **Events to send:** Click "Select events" and add:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed` (optional; faster post-checkout UX)
5. Click **Add endpoint**.
6. On the new endpoint's page, find **Signing secret** (starts with `whsec_`).
7. Click **Reveal** if needed, then copy the secret.
8. Set this as `STRIPE_WEBHOOK_SECRET` in your production environment.

### Notes

- **HTTPS required** — Stripe only sends webhooks to HTTPS URLs.
- **Separate secrets** — Test and live webhooks have different signing secrets. Use the live one only in production.
- **Verification** — Your app uses this secret in `app/api/webhooks/stripe/route.ts` to verify that requests are from Stripe.

---

## 5. Configure Stripe Customer Portal (Billing Portal)

The Customer Portal lets subscribers manage their subscription (cancel, update payment method). It uses your live Stripe configuration.

1. In **live mode**, go to [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal).
2. Configure:
   - **Products:** Ensure your subscription product is available.
   - **Cancellation:** Choose whether customers can cancel and any retention flow.
   - **Payment method updates:** Allow customers to update cards.
3. Save. No extra env vars needed — the portal uses your live secret key.

---

## 6. Set Production Environment Variables

Set these in your production environment (e.g. Vercel, Railway, or your host's env config).

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | From API Keys (live) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | From API Keys (live) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From production webhook endpoint |
| `STRIPE_PRICE_MONTHLY` | `price_...` | Live monthly price ID |
| `STRIPE_PRICE_ANNUAL` | `price_...` | Live annual price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | Same as `STRIPE_PRICE_MONTHLY` | Exposed to client |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` | Same as `STRIPE_PRICE_ANNUAL` | Exposed to client |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_LABEL` | e.g. `$6.99/mo` | Display label |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_LABEL` | e.g. `$60/yr` | Display label |
| `APP_URL` | `https://interlinedlist.com` | No trailing slash |
| `NEXT_PUBLIC_APP_URL` | `https://interlinedlist.com` | No trailing slash |

**Important:** `APP_URL` and `NEXT_PUBLIC_APP_URL` must point to your production domain. Checkout success/cancel URLs and the Customer Portal return URL use these.

---

## 7. Verify Production Setup

1. Deploy with the new env vars.
2. Visit `https://interlinedlist.com/subscription` (or your production subscription page).
3. Click **Subscribe** and complete a real checkout (small amount if possible).
4. Confirm:
   - Redirect to success URL after payment
   - `customerStatus` updates to `subscriber:monthly` or `subscriber:annual` (via webhook)
   - Subscriber badge appears on avatar
   - "Manage subscription" / Customer Portal works
5. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), check that recent events show **Succeeded** (not failed).

---

## 8. Troubleshooting

| Issue | Check |
|-------|-------|
| Webhook signature verification failed | `STRIPE_WEBHOOK_SECRET` matches the **live** endpoint's signing secret |
| `customerStatus` not updating | Webhooks → endpoint → event history; ensure 200 responses |
| "Subscription plans coming soon" | `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` and `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` are set |
| Wrong redirect after checkout | `APP_URL` and `NEXT_PUBLIC_APP_URL` point to production domain |
| Portal "No subscription to manage" | User has no `stripeCustomerId`; they must complete at least one checkout |

---

## Quick Checklist

- [ ] Stripe account activated for live mode
- [ ] Products and prices created in live mode
- [ ] Live API keys obtained (`sk_live_`, `pk_live_`)
- [ ] Production webhook endpoint registered
- [ ] Webhook signing secret copied to `STRIPE_WEBHOOK_SECRET`
- [ ] Customer Portal configured (if using)
- [ ] All Stripe env vars set in production
- [ ] `APP_URL` / `NEXT_PUBLIC_APP_URL` point to production
- [ ] End-to-end test: subscribe, verify status, test portal
