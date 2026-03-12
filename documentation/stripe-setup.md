# Stripe Setup Guide

This guide covers configuring Stripe for subscription billing in InterlinedList.

## Prerequisites

- Stripe account (use [test mode](https://dashboard.stripe.com/test) for development)
- App deployed or running locally with a public URL for webhooks

## 1. Create Products and Prices

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create a product (e.g. "InterlinedList Subscription")
3. Add two recurring prices:
   - **Monthly**: e.g. $6.99/month
   - **Annual**: e.g. $60/year
4. Copy the Price IDs (they start with `price_`)

## 2. Configure Environment Variables

Set these in `.env` (or your deployment platform):

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Secret key from [API Keys](https://dashboard.stripe.com/apikeys) (use `sk_test_` for dev) |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key (use `pk_test_` for dev) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (see step 3) |
| `STRIPE_PRICE_MONTHLY` | Price ID for monthly plan |
| `STRIPE_PRICE_ANNUAL` | Price ID for annual plan |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | Same as `STRIPE_PRICE_MONTHLY` (exposed to client) |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` | Same as `STRIPE_PRICE_ANNUAL` (exposed to client) |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_LABEL` | Display label, e.g. "$6.99/mo" |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_LABEL` | Display label, e.g. "$60/yr" |

## 3. Register Webhook Endpoint

### Production

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed` (optional, for faster post-checkout UX)
5. Copy the **Signing secret** (`whsec_...`) and set as `STRIPE_WEBHOOK_SECRET`

### Local Development

Use the Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret. Use that for `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## 4. Verify Setup

1. Run the app and go to Subscription (user dropdown > Subscription, or `/subscription`)
2. Click **Subscribe** and complete a test checkout (use card `4242 4242 4242 4242`)
3. After checkout, you should see "Subscription activated successfully"
4. Your `customerStatus` should update to `subscriber:monthly` or `subscriber:annual` (via webhook)
5. Subscriber features (lists, documents, organizations, etc.) should unlock

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Set `customerStatus` from subscription |
| `customer.subscription.updated` | Update `customerStatus` |
| `customer.subscription.deleted` | Set `customerStatus` to `free` |
| `checkout.session.completed` | Immediate sync for faster UX (optional) |

## Troubleshooting

- **Webhook signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret. For local dev, use the secret from `stripe listen`.
- **customerStatus not updating**: Check Stripe Dashboard > Webhooks for failed deliveries. Ensure your endpoint is reachable and returns 200.
- **"Subscription plans coming soon"**: `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` and `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` must be set.
