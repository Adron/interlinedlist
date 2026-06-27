---
description: Dependency vulnerability + update triage
---

Run `npm audit` and summarize actionable findings:

- Group vulnerabilities by severity (critical / high / moderate / low).
- Separate **safe patch/minor bumps** from **major upgrades that need testing** — call out Next.js 14 and Prisma 5 specifically, since major bumps there touch the build, the App Router, and the generated client.
- Propose a minimal remediation plan (which bumps, in what order, what to test).

Do **not** upgrade anything without confirmation. End with the single highest-priority action.
