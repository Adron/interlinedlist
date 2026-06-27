# app/api — route conventions

Standard App Router handler shape:

```ts
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const user = await getCurrentUserOrSyncToken(request); // or getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSubscriber(user.customerStatus)) return NextResponse.json({ error: "..." }, { status: 403 });
  // validate body → do work in lib/<feature>/queries.ts → NextResponse.json
}
```

Three auth mechanisms — match the one the endpoint needs:

1. **Session cookie (web):** `getCurrentUser()` (`lib/auth/session.ts`). The cookie holds a comma-separated list of **Session IDs**; the value is ONLY ever validated as a Session ID, **never** as a userId. A userId fallback caused an account-takeover (C1) — do not reintroduce it.
2. **Sync token (CLI / mobile):** `getCurrentUserOrSyncToken(request)` (`lib/auth/sync-token.ts`) — `Authorization: Bearer <token>` (sha256 lookup) with session-cookie fallback. Use for anything the `il-sync` CLI or native app calls.
3. **Cron secret:** `isAuthorizedCronRequest(request)` (`lib/auth/cron.ts`). Every `cron/*` route gates on it **first** and fails **closed**.

Rules:

- Business logic + Prisma queries live in `lib/<feature>/queries.ts`, not inline in the route.
- Keep IDOR filters: `where: { id, userId: user.id }`.
- Subscriber-only actions return **403** for free users (`isSubscriber` from `lib/subscription/is-subscriber.ts`).
- External fetches use the SSRF guards in `lib/security/`.
- `tests/e2e/api/*` assert these auth / IDOR / subscription boundaries — keep them green.
