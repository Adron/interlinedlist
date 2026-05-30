# Email Logging: Next Steps for Verification and Troubleshooting

This document describes how to verify and troubleshoot transactional emails using the Email Logging feature in the admin panel.

## Verification Steps

### 1. Compare with Resend Dashboard

- The `providerId` in each log entry corresponds to the Resend email ID.
- Log in to [Resend](https://resend.com) and navigate to the Emails section.
- Search for the `providerId` to confirm delivery status, opens, clicks, and bounce/complaint events.
- A matching record in Resend with "Delivered" status confirms the email was accepted by the recipient's mail server.

### 2. Resend Webhooks

- Configure Resend webhooks for `email.sent`, `email.delivered`, `email.bounced`, and `email.complained`.
- A future enhancement could update the `EmailLog` table when webhooks fire (e.g. add a `deliveryStatus` column: `sent` | `delivered` | `bounced` | `complained`).
- Webhook payloads include `email_id`, which can be matched to `providerId`.

### 3. Environment and Domain Configuration

- Verify `RESEND_API_KEY` is set and valid in `.env` / `.env.local`.
- Ensure `FROM_EMAIL` (or `RESEND_FROM_EMAIL`) uses a domain verified in Resend.
- Unverified domains will cause sends to fail; check the `errorMessage` column for details.

## Troubleshooting Failed Sends

### 1. Inspect `errorMessage`

- Failed sends are logged with `status: failed` and an `errorMessage`.
- Common Resend errors:
  - **Rate limit**: "Too many requests" – wait and retry.
  - **Invalid from/to**: "Invalid email" – check recipient format and `FROM_EMAIL`.
  - **Domain not verified**: "Domain not verified" – add and verify the domain in Resend.
  - **API key invalid**: "Unauthorized" – regenerate the API key in Resend.

### 2. Resend Logs

- Resend provides detailed logs at [resend.com/emails](https://resend.com/emails).
- Use `providerId` to find the corresponding email and see full error details, retries, and delivery attempts.

### 3. FROM_EMAIL and Domain

- Ensure the sending domain is verified in Resend.
- Default `onboarding@resend.dev` works for testing but has limits; use a custom domain for production.

## Future Enhancements

1. **Resend webhook handler** – Update `EmailLog` with delivery/bounce/complaint status when webhooks fire.
2. **Retry mechanism** – Allow admins to retry failed sends from the Email Logging UI.
3. **Export to CSV** – Export logs for external analysis or compliance.
4. **Retention policy** – Auto-delete or archive logs older than 90 days to manage storage.
5. **Recipient search** – Add search/filter by recipient email for support workflows.
6. **Link to User** – When `userId` is present, link to the user's profile in the admin panel.
