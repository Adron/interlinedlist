---
name: docs-user
description: >-
  Writes and maintains docs/user-guide.md — the end-user guide for
  InterlinedList. Use when the user asks to generate, update, or review
  end-user documentation covering posting, cross-posting, scheduling, lists,
  documents, organizations, following, notifications, or subscriptions.
---

# docs-user skill (InterlinedList)

## When this applies

Use this skill whenever the task involves **end-user documentation** for InterlinedList:

- Generating `docs/user-guide.md` from scratch
- Updating it after a new feature ships
- Answering "how do I explain this feature to a user?"
- Reviewing or extending an existing draft

## Two modes of operation

### Mode 1 — Automated (recommended for initial generation or full refresh)

```bash
node scripts/generate-docs.js --perspective user
```

Requires `ANTHROPIC_API_KEY`. Explores the codebase autonomously and writes `docs/user-guide.md`.

### Mode 2 — Interactive (this Claude Code session)

Follow the research checklist and write/update the guide directly.

## Research checklist for interactive mode

Explore these areas in order:

1. **App page structure** — `list app/` to find all user-facing routes (skip `/api`, `/admin`)

2. **Core compose flow** — read `components/MessageInput.tsx`; note:
   - Character limit state and settings
   - Image/video attachment
   - Cross-post toggles (Mastodon, Bluesky, LinkedIn)
   - LinkedIn "post link as first comment" option
   - Schedule modal
   - Tags

3. **Cross-posting connections** — read settings pages (`app/settings/`) for how users connect each platform

4. **Lists feature** — read `app/lists/` pages; understand the DSL schema, row data, watching, exports

5. **Documents feature** — read `app/documents/` pages; folders, templates, sync

6. **Organizations** — read `app/organizations/` pages

7. **Following system** — read `app/api/follow/` to understand the request/approval model; find the following UI

8. **Notifications** — find notification components and `app/api/notifications/`

9. **Subscriptions** — find Stripe checkout/portal usage; find feature gating (`isSubscriber`) to list paid-tier features

10. **Settings** — read every setting in `app/settings/SettingsForm.tsx` or `app/settings/ProfileSettings.tsx`

11. **Push / mobile** — read `app/api/push/` and any iOS app documentation in the repo

12. **Data exports** — read `app/api/exports/` routes

## Voice and tone

- **Plain language** — write as if explaining to someone who is not technical.
- **Action-oriented** — use imperative verbs: "Click", "Select", "Type".
- **Specific** — name the exact button or field the user interacts with.
- **No code** — do not reference file names, component names, or implementation details.

## Output structure for docs/user-guide.md

```markdown
# InterlinedList User Guide

## Table of Contents
...

## What is InterlinedList?
One-paragraph product description.

## Getting Started
### Creating an account
### Verifying your email
### Logging in

## Your Profile
### Editing your profile
### Changing your avatar
### Theme settings

## Posting
### Writing a post
### Attaching images and videos
### Public vs private posts
### Tagging your posts
### Replying to posts

## Cross-Posting to Other Platforms
### Connecting Mastodon
### Connecting Bluesky
### Connecting LinkedIn
### Posting links as a first comment (LinkedIn)
### Scheduling a post

## Lists
...

## Documents
...

## Organizations
...

## Following People
...

## Notifications
...

## Subscription & Billing
...

## Account Settings
...

## Mobile Notifications
...

## Exporting Your Data
...
```

## Constraints

- Do not mention infrastructure or deployment — that is `docs/operational.md`.
- Do not show raw HTTP requests or JSON — that is `docs/api-reference.md`.
- Do not describe features that do not exist in the codebase.
