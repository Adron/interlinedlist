---
title: Stripe Subscriptions
---

# Stripe Subscriptions

InterlinedList uses Stripe for paid subscriptions. These endpoints create the redirect URLs that take the user to Stripe-hosted UI for checkout and account management. **Session cookie required** (Bearer tokens are not accepted).

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/stripe/create-checkout-session` | Session | Create a Stripe Checkout session for a subscription purchase. Returns the URL to redirect the user to. |
| POST | `/api/stripe/create-portal-session` | Session | Create a Stripe Customer Portal session for managing an existing subscription. Returns the URL. |

## Starting checkout

```http
POST /api/stripe/create-checkout-session
Content-Type: application/json

{ "plan": "monthly" }
```

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `plan` | string | `monthly`, `annual` | Selects the Stripe price ID configured server-side. |

**Response (200):**

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_..." }
```

Redirect the user's browser to this URL. After completion, Stripe redirects them back to InterlinedList and the [`/api/webhooks/stripe`](./internal-endpoints#stripe-webhook) handler updates the user's `customerStatus`.

## Managing an existing subscription

```http
POST /api/stripe/create-portal-session
```

**Response (200):**

```json
{ "url": "https://billing.stripe.com/p/session/..." }
```

The portal lets the user update payment methods, cancel, switch plans, view invoices, and download receipts. Cancellations are reflected back via the Stripe webhook.

## Subscription tiers

`User.customerStatus` is one of:

| Value | Meaning |
|-------|---------|
| `free` | No paid subscription. Subscriber-only features return `403`. |
| `subscriber` | Active subscriber (legacy, no plan label). |
| `subscriber:monthly` | Active monthly subscriber. |
| `subscriber:annual` | Active annual subscriber. |

Anything starting with `subscriber` grants subscriber access. The Stripe webhook keeps `subscriber:*` during the `past_due` grace period and downgrades to `free` only when the subscription fully cancels.

## Notes

- These endpoints don't require the email to be verified, but the subscriber gate on most paid features does check `emailVerified`.
- Checkout sessions are short-lived. If the user abandons the flow, simply create a new session next time.
