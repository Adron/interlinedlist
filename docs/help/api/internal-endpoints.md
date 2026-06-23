---
title: Cron & Webhooks (Internal)
---

# Cron & Webhooks (Internal)

These endpoints are **not intended for direct use**. They are exposed publicly for protocol reasons (cron and webhooks need to be reachable over HTTP) but are secured by shared secrets or signature verification.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/publish-scheduled-messages` | `CRON_SECRET` | Publish messages whose `scheduledAt` is in the past; cross-post per the saved config. |
| GET | `/api/cron/sync-github-lists` | `CRON_SECRET` | Refresh every active GitHub-backed list from GitHub. |
| POST | `/api/webhooks/stripe` | Stripe signature | Process Stripe events; updates `customerStatus` on the user. |
| POST | `/api/webhooks/resend` | Resend signature | Process Resend email-delivery events; updates the email log. |

## Cron secret

Cron endpoints accept either of:

- `Authorization: Bearer <CRON_SECRET>`
- `x-vercel-cron` header carrying the same secret

If the `CRON_SECRET` environment variable is unset, the secret check is skipped — intended for local development only. Production deployments **must** set `CRON_SECRET`.

## Publish scheduled messages

```http
GET /api/cron/publish-scheduled-messages
Authorization: Bearer <CRON_SECRET>
```

Runs through all messages whose `scheduledAt` is in the past and:

1. Publishes them (clears `scheduledAt` and `scheduledCrossPostConfig`).
2. Executes cross-posting per the saved config.
3. Resolves LinkedIn targets identically to the live `POST /api/messages` path — an active `OrgLinkedInPage` assignment overrides the personal LinkedIn identity; without an assignment, falls back to the personal identity.

Returns:

```json
{ "published": 4, "total": 4, "errors": [] }
```

Per-target cross-post failures are recorded as entries in `errors` but do not abort the run.

## Sync GitHub-backed lists

```http
GET /api/cron/sync-github-lists
Authorization: Bearer <CRON_SECRET>
```

Refreshes the GitHub Issues cache for every active GitHub-backed list. Per-list failures are isolated; one bad list does not halt the run.

```json
{ "message": "Sync complete", "synced": 12, "total": 14, "errors": ["List abc123: ..."] }
```

`errors` is omitted when there are none.

## Stripe webhook

```http
POST /api/webhooks/stripe
stripe-signature: t=...,v1=...
```

Handles the following Stripe events:

- `checkout.session.completed` — sets `customerStatus` based on the purchased plan.
- `customer.subscription.created` / `customer.subscription.updated` — updates `customerStatus`, retaining `subscriber:*` during `past_due`.
- `customer.subscription.deleted` — downgrades to `free`.

Verified via the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`. Configure the corresponding webhook endpoint URL in your Stripe dashboard.

## Resend webhook

```http
POST /api/webhooks/resend
svix-signature: ...
```

Receives email delivery events from Resend (delivered, bounced, complained, opened, clicked) and updates the corresponding row in the `EmailLog` table. Verified via Resend's signature mechanism.

## Local development

For local testing, both webhooks can be tested using the providers' CLI tools (`stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`, etc.) which sign payloads correctly.
