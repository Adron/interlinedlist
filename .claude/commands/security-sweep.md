---
description: Adversarial security pass over the current diff
---

Run a focused security review of the current diff (or the last commit if the working tree is clean). Prefer delegating to the `security-reviewer` agent or running the `/security-review` skill, then confirm these repo-specific invariants explicitly:

- Every new/changed route uses one of the three auth mechanisms and returns **401** when unauthenticated.
- The session cookie is never validated as a userId (regression guard for the C1 account-takeover).
- IDOR ownership filters (`where: { id, userId }`) are present on every read/write.
- Subscriber-only actions return **403** for free users.
- Any new external fetch uses the `lib/security/` SSRF guards.
- Secrets go through `lib/crypto/` and are never returned to the browser.
- No `app/api/cron/*` route fails open.

Report findings by severity (Critical / High / Medium / Low) with file:line and a concrete fix. Cross-reference `security-evaluation-coverage.md` to avoid re-reporting known/accepted items without noting status.
