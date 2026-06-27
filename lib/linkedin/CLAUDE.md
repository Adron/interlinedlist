# lib/linkedin — LinkedIn posting targets

LinkedIn has the most complex target model in the app. Three target kinds:

- **Personal profile** — the user's own LinkedIn identity (`LinkedIdentity`, provider `linkedin`).
- **Org pages** — shared at the organization level (`OrgLinkedInCredential` / `OrgLinkedInPage`), assignable to members.
- **Personal company pages** — `LinkedInPersonalPage`.

The user's default target is a `LinkedInPostingTargetPreference`. Always resolve through `resolveLinkedInTarget` (`resolve-linkedin-target.ts`) rather than reading the preference directly.

**Treat a malformed / unparseable stored target as "no explicit target"** so it never blocks publishing — never throw on bad stored config; fall back to the sensible default. Posting itself goes through `post-status.ts`.
