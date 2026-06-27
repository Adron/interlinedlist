---
description: Regenerate the source-derived docs and sanity-check the diff
---

Run `npm run docs:all` to regenerate `docs/*.md` and `docs/openapi.json` from source, then:

- Summarize what changed.
- Flag anything that looks like an accidental removal (a dropped endpoint, a shrunk section).
- Flag any new endpoint that landed without docs.

These files are generated — never hand-edit them. If something is wrong in the output, fix the **source** (route handlers / JSDoc / the generator in `scripts/`), not the generated markdown.
