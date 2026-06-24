# InterlinedList — Feature Evaluation

_Evaluation date: 2026-06-24 · Method: direct source inspection (Prisma schema, 144 API route handlers, app pages, `lib/` integrations, settings/marketing UI)._

InterlinedList is a Next.js 14 (App Router) platform combining micro-blogging, structured relational lists, long-form documents, and outbound social cross-posting, with a token-authenticated HTTP API and a companion CLI. It runs on Postgres/Prisma (28 models), Stripe billing, Resend email, Vercel Blob storage, and APNs push. The codebase is large and substantially feature-complete; the notes below separate what ships today from what is missing or only partially wired.

---

## 1. Features Implemented

### Accounts, Auth & Sessions
- Email/password auth with bcrypt; DB-backed sessions; multi-account switching (`/api/auth/switch`, `/accounts`).
- Email verification, password reset, and email-change-with-reverification flows (token + expiry fields on `User`).
- Sync tokens for CLI/API access (`SyncToken`), account deletion, private-account mode.
- Per-user preferences: theme, max message length, messages-per-page, feed viewing preference, link previews, advanced post settings, lat/long.

### Connected Accounts (OAuth)
- GitHub, Bluesky (AT Protocol OAuth), Mastodon (per-instance), LinkedIn, and Twitter/X — connect, link-to-existing-account, status check, and disconnect.
- Stored as `LinkedIdentity`; token re-verification endpoint for GitHub, Mastodon, LinkedIn, and Twitter.

### Micro-blogging (Messages)
- Markdown posts with image **and** video uploads (Vercel Blob + `sharp`), rich link-metadata previews, tags.
- Threads/replies, "dig" reactions (`MessageDig` / `digCount`), and "push"/repost mechanic (`pushedMessageId` / `pushCount`).
- Public/private visibility per post, scheduled publishing, and a Markdown composer with cross-post target selection.

### Cross-Posting
- Live posting to **Mastodon, Bluesky, LinkedIn, and Twitter/X** from `/api/messages` and the scheduled-publish cron.
- Automatic threading when content exceeds platform char limits, media distribution across posts, reply-threading to external platforms (`reply-to-external.ts`), and external-post deletion (`delete-external.ts`).
- LinkedIn supports personal pages and organization pages with per-user posting-target preferences.

### Structured Lists
- Custom schema DSL with typed properties (text, number, date, select, boolean, URL, Markdown), validation rules, visibility conditions, help text, ordering.
- Data rows with soft-delete, list nesting (parent/child), list-to-list connections (graph), and an ERD/diagram view (`reactflow` + `elkjs`).
- Watcher/collaborator/manager roles per list, list folders, public lists, and search.
- **GitHub-backed lists**: sync a repo's issues into a list with caching (`ListGitHubIssueCache`), refreshed hourly by cron.

### Long-Form Documents
- Full Markdown editor, folder hierarchy, image uploads, document templates (+ seed-defaults), per-document public/private, content-hash tracking, search, and sync.

### Organizations
- Create orgs, manage members and roles (owner/admin/member), public/private + system orgs.
- Org-level shared LinkedIn credentials, page discovery/sync, and page assignments to members.

### Follow / Social Graph
- Follow/unfollow with approve/reject for private accounts; followers / following / mutual / counts / pending-requests endpoints; feed filtering (all / followed-only).

### Notifications & Push
- In-app notification tray (read, mark-all-read, tray limit) via `UserNotification`.
- APNs (iOS) push with device-token registration/unregistration (`DeviceToken`, `lib/push/apns.ts`).

### Subscriptions & Billing
- Stripe Checkout + Customer Portal, webhook handling, `customerStatus` (free/subscriber) gating media, cross-posting, scheduling, lists, documents, and GitHub sync at $6.99/mo.

### Admin & Operations
- User admin (list/edit/password-reset, bulk clearance/delete/status), email-log viewer, analytics dashboard, support-link management.
- Analytics event ingestion (`page_view`/`action`), Resend email logging + delivery webhook.

### Exports & API
- Markdown/data exports for lists, list data rows, messages, and follows.
- Token-authenticated HTTP API across messages/lists/documents, a Go CLI + DSL, and a 131 KB hand-written API reference (`docs/api-reference.md`).

### Peripheral / Utility
- Weather, clock, and location endpoints/pages; an architecture-aggregates DB explorer; help center, blog, and marketing pages.

---

## 2. Known Feature Gaps

These are capabilities a platform of this scope would normally have but that are **entirely absent** from the codebase:

- **No Android / web push.** `DeviceToken.platform` allows `"android"`, but only an APNs (iOS) sender exists — there is no FCM path and no browser Web Push. Non-iOS device tokens are accepted but never delivered to.
- **No API rate limiting or abuse protection.** Only `send-verification-email` and `change-email/request` have ad-hoc throttling; the other ~140 endpoints (including token-auth API routes) are unprotected.
- **No machine-readable API contract or versioning.** No OpenAPI/Swagger spec and no `/api/v1` namespace — the API reference is hand-maintained Markdown only.
- **No unified/global search.** Search exists only per-domain (lists, documents); there is no cross-entity search over messages, people, or organizations.
- **No two-factor authentication (2FA/MFA).**
- **No safety/moderation primitives.** No user block/mute, no content reporting, and no moderation queue — notable for a social product.
- **No private direct messaging.** "Messages" are posts; there is no person-to-person DM channel.
- **No outbound webhooks / developer event subscriptions.** Webhooks are inbound only (Stripe, Resend).
- **No email notification digests or per-channel notification preferences.** Email is transactional only; users cannot choose what notifies them or where.

---

## 3. Incomplete Features & Nice-to-Haves

### 3a. Incomplete features (present in code but not fully usable)

1. **AI Writing Assist** — Advertised as "Coming Soon." Users can save and store OpenAI/Anthropic API keys (`User.openaiApiKey` / `anthropicApiKey`, `GenerativeAISection`, integrations page), and `@anthropic-ai/sdk` is a dependency, but **no code consumes the keys** for drafting or editing. Needs composer integration to deliver the promised value.
2. **Organization settings management** — Member management and org LinkedIn credentials work, and a PATCH/DELETE org API exists, but the org detail page renders _"Organization management features coming soon"_ for owners/admins. There is no UI to rename, edit description/avatar, change visibility, or delete an org.
3. **Bluesky identity verification** — `app/api/user/identities/verify/route.ts` contains a `// TODO: implement proper Bluesky verification`. The Bluesky branch updates `lastVerifiedAt` **without validating the token**, giving a false "verified" state (every other provider is actually checked).
4. **Twitter/X cross-posting is built but not surfaced** — Full OAuth, composer toggle, scheduled posting, and threaded posting are implemented and called from the live message route, yet Twitter/X is omitted from the public Features and pricing copy (which list only Mastodon, Bluesky, LinkedIn). Either finish productizing/announcing it or document why it's held back — a working feature is currently invisible to users.
5. **Products marketplace** — `/products`, `/products/[slug]`, and `ProductsDropdown` render "Coming Soon / in development" placeholders against `lib/products.ts` data. There is no product detail content or purchase flow behind them.
6. **Android device-token path** — Registration accepts `platform: "android"` but, per §2, no delivery exists, so the stored tokens are dead data until an FCM sender is added.

### 3b. Nice-to-Haves — TOP FIVE for a more complete web application & API

1. **Ship AI Writing Assist (finish #1 above).** It's ~80% scaffolded — key storage, settings UI, and SDK dependency already exist. Wiring drafting/rewrite/summarize actions into the composer (BYO key, streamed responses) closes the single most prominent "Coming Soon" gap with the least remaining work.
2. **Turn the internal API into a real developer platform.** Add a versioned (`/api/v1`) surface, an OpenAPI spec generated from the route handlers, scoped/revocable API keys (building on `SyncToken`), and rate limiting. With 100+ endpoints and a CLI already in place, this is mostly hardening and exposure rather than new capability.
3. **Unified global search.** A single search across messages, lists, documents, people, and organizations — ideally backed by Postgres full-text (`tsvector`/`pg_trgm`) — replacing today's siloed per-domain search and making the consolidated-workspace pitch real.
4. **Notification preferences with multi-channel parity.** Let users choose what notifies them and where; add browser Web Push and Android FCM so push isn't iOS-only, plus optional email digests. This completes the half-built notification stack (in-app + APNs).
5. **Safety & moderation suite.** Block/mute between users, content reporting, and a lightweight admin moderation queue. These are table-stakes for a social platform with a public feed and follow graph, and none exist today.

_Honorable mentions: 2FA/MFA, outbound webhooks for third-party integrations, and email-based notification digests._
