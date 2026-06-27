# Repo Migration Plan — `Adron/interlinedlist` → `CompositeCode/interlinedlist`

**Decisions driving this plan**

| Decision | Choice |
|---|---|
| Scope | **GitHub repo only.** Vercel project and Neon database stay under the current accounts. |
| Repo method | **Transfer** the existing repo (keeps history, issues, PRs, releases, stars; old URL auto-redirects). |
| Production domain | **Keep `interlinedlist.com`** — no OAuth / Stripe / Resend / APNs reconfiguration. |

**Bottom line:** This is a low-risk, ~30-minute change. The codebase barely references the repo owner, and nothing about the data or secrets moves. The one real operational gotcha is re-authorizing Vercel's GitHub App against the `CompositeCode` org so deploy-on-push keeps working.

---

## 1. Mental model — three independent systems

The deployment is three loosely-coupled systems. Only the first is moving:

1. **GitHub repo** (source of truth for code) → transferring to `CompositeCode`.
2. **Vercel project** (build + host + crons + env vars + domain) → *stays put*; we only re-point its Git connection.
3. **Neon database** (the data) → *stays put*; `DATABASE_URL` is unchanged.

Because (2) and (3) don't move:
- **No env vars change.** All ~48 vars (including `SECRETS_ENCRYPTION_KEY`, `STRIPE_*`, `CRON_SECRET`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `APNS_*`) live in the Vercel project and are untouched. Critically, `SECRETS_ENCRYPTION_KEY` stays identical, so encrypted user API keys remain readable.
- **No database migration.** Same Neon DB, same connection string. The first post-move deploy runs `prisma migrate deploy` as usual (via `scripts/migrate-deploy.js` in `vercel-build`); it's a no-op since migrations are already applied and idempotent.
- **No external integration reconfig.** Every OAuth callback (`GitHub`, `LinkedIn`, `X/Twitter`, `Bluesky`, `Mastodon`), the Stripe webhook, the Resend webhook, and the iOS `interlinedlist://` scheme all derive from the domain — which is unchanged.

**What's actually affected:** the Git connection that triggers Vercel builds, your local git remotes, and a handful of cosmetic in-repo references (optional).

---

## 2. Pre-flight checklist

- [ ] You have **admin** on `Adron/interlinedlist` (required to initiate a transfer).
- [ ] You are an **owner/admin of the `CompositeCode` org**, or an org owner is available to accept the transfer and install apps. (GitHub repo transfers into an org must be accepted by someone who can create repos there.)
- [ ] You can manage the **Vercel project** (Settings → Git) under the current account.
- [ ] You can authorize the **Vercel GitHub App** on the `CompositeCode` org (org owner permission, or request + approve).
- [ ] Pick a quiet window. Deploy-on-push will be briefly broken between the transfer and the Vercel reconnect — a manual redeploy still works in the meantime.
- [ ] Confirm no in-flight PRs you care about are mid-merge during the cutover (they transfer fine, but avoid racing a deploy).

---

## 3. Step-by-step

### Phase 1 — Transfer the GitHub repo

1. On GitHub: `Adron/interlinedlist` → **Settings → General → Danger Zone → Transfer ownership**.
2. New owner: `CompositeCode`. Keep the name `interlinedlist`.
3. An org owner of `CompositeCode` accepts (if you're not already an owner there).
4. Verify the repo is live at `https://github.com/CompositeCode/interlinedlist` and that `https://github.com/Adron/interlinedlist` **redirects** to it.

What transfers automatically: history, branches, tags, **issues, PRs, releases, stars/watchers**, the `.github/ISSUE_TEMPLATE/` files, and most settings. The old URL (HTTPS and SSH) redirects until/unless someone later creates a new repo at the old path.

### Phase 2 — Re-point Vercel at the transferred repo

> GitHub's redirect keeps things limping along, but you should explicitly reconnect so the Vercel GitHub App has real access on the new org. Otherwise deploy-on-push silently stops.

1. **Authorize Vercel on the org first.** GitHub → `CompositeCode` org → **Settings → GitHub Apps → Vercel** (or install it) → grant access to the `interlinedlist` repo. If you can't see it, install the Vercel app on the org and select the repo.
2. Vercel → the **interlinedlist project → Settings → Git**.
   - If it still shows `Adron/interlinedlist`: **Disconnect**, then **Connect Git Repository** → choose `CompositeCode/interlinedlist`.
   - Confirm the **Production Branch** is correct (`main`, per repo convention).
3. Leave **Environment Variables**, **Domains**, and **Crons** alone — they belong to the project, not the repo, and don't move. (Crons are declared in `vercel.json` and re-register on the next deploy.)
4. Trigger a deploy to validate the new wiring: push a trivial commit (e.g. a README touch) to `main`, or use Vercel → Deployments → **Redeploy**.

### Phase 3 — Update local clones & remotes

On each machine with a clone:

```bash
git remote set-url origin git@github.com:CompositeCode/interlinedlist.git
git remote -v   # confirm both fetch/push point at CompositeCode
git fetch origin
```

(The old SSH/HTTPS URL still works via redirect, but update it to avoid surprises and keep tooling honest.)

### Phase 4 — Verify

- [ ] Push a no-op commit to `main` → Vercel **builds and deploys automatically** (confirms the GitHub App reconnection).
- [ ] Build log shows `prisma generate && migrate-deploy && next build` succeeding; migrate step reports nothing to apply.
- [ ] Vercel → Settings → **Crons** lists both jobs (`sync-github-lists` hourly, `publish-scheduled-messages` every minute).
- [ ] Production site loads at `interlinedlist.com`.
- [ ] One **login with an OAuth provider** works (proves the unchanged-domain assumption end-to-end).
- [ ] One **cross-post** and one **scheduled post** publish (proves crons + provider tokens unaffected).
- [ ] Open a test PR on the new repo → confirm a **preview deployment** is created.

---

## 4. Optional cleanup (cosmetic; safe to defer)

None of these block the migration; the redirect keeps old links working. Do them as a follow-up commit when convenient.

- **`test-data/test-accounts.json`** — ~57 avatar URLs hardcode `github.com/Adron/interlinedlist/blob/develop/...`. Test data only; still resolves via redirect. Bulk-replace `Adron/interlinedlist` → `CompositeCode/interlinedlist` if you want them clean.
- **`test-data/README.md`** — 2 example URLs, same replacement.
- **`app/eula/page.tsx:108`** — attribution line `InterlinedList (Adron Hall)`. This is a **legal/branding** choice, not technical; change only if attribution should now read as the org.
- **GitHub OAuth App ownership (optional, separate from this move).** The OAuth app powering "Login with GitHub" and GitHub-backed lists is registered under a personal developer account and keyed to the **callback URL (domain)**, not the repo — so it keeps working unchanged. If you later want `CompositeCode` to *own* it, GitHub supports transferring an OAuth app to an org; that's an independent task with its own (domain-unchanged, so low) risk.

---

## 5. Things that explicitly do NOT change (reassurance)

- Neon database, its data, and `DATABASE_URL`.
- All Vercel environment variables and secrets — including `SECRETS_ENCRYPTION_KEY` (so encrypted user API keys stay valid), Stripe keys/webhook secret, `CRON_SECRET`, APNs key, Blob token.
- Production domain `interlinedlist.com` and therefore **every** OAuth callback, the Stripe webhook, the Resend webhook, and the iOS custom URL scheme.
- Cron schedules (`vercel.json`) and their auth.
- The `source: "github"` lists feature — it uses each user's own GitHub token + a user-supplied `owner/repo`, nothing tied to this repository.
- The `il-sync` CLI binaries under `public/downloads/` — served statically from the same domain.
- No GitHub Actions to migrate (there are none; CI is purely Vercel's Git integration).

---

## 6. Rollback

- **Repo:** a transfer is reversible — transfer back to `Adron`, or the old path redirects until reused.
- **Vercel:** reconnecting the Git source is non-destructive and repeatable; you can point it back at `Adron/interlinedlist` (or its redirect) at any time.
- **Worst case during the gap:** if auto-deploy is broken before the Vercel reconnect, production keeps running the last good deployment, and you can **Redeploy** manually from the Vercel dashboard.

---

## 7. Risk summary

| Risk | Likelihood | Mitigation |
|---|---|---|
| Deploy-on-push stops after transfer | **High if Vercel not reconnected** | Phase 2 — authorize Vercel GitHub App on the org and reconnect. |
| Brief window with no auto-deploy | Medium | Do it in a quiet window; manual Redeploy available. |
| Stale local remotes | Low | Phase 3 `git remote set-url`. |
| Broken provider logins | Very low | Domain unchanged — none expected; verified in Phase 4. |
| Data/secret loss | None | Vercel project + Neon DB are not touched. |
