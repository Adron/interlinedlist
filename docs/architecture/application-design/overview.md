# Application Design Overview

## App Structure (Next.js App Router)

```
app/
├── layout.tsx          # Root layout (Navigation, Footer, ThemeProvider)
├── page.tsx            # Home
├── globals.css         # CSS variables, base styles
├── admin/              # Admin panel (users, email-logging, support-links)
├── architecture-aggregates/  # DB schema and aggregate data visualizer
├── dashboard/          # Dashboard page
├── documents/          # Documents and folder management
├── exports/            # Data export page
├── help/               # Help docs (sidebar + content)
├── lists/              # Lists: index, [id], new, edit
├── message/[id]/       # Individual message and thread view
├── organizations/      # Organizations: index, [slug], new, [slug]/edit
├── people/             # User directory
├── settings/           # User settings
├── user/[username]/    # User profile, followers, following
├── user/[username]/lists/[id]/  # Public list view (read-only, watch button)
├── user/organizations/ # Current user's organizations
├── login/, register/   # Auth pages
├── forgot-password/, reset-password/, verify-email/, verify-email-change/
└── api/                # API routes
```

## Routing

- File-based: `app/lists/[id]/page.tsx` → `/lists/:id`
- Dynamic segments: `[id]`, `[slug]`, `[rowId]`, `[username]`
- Nested layouts: `app/help/layout.tsx` wraps `app/help/*`

## Lib Layout

```
lib/
├── auth/                    # session, password, OAuth helpers, admin-access, sync-token
├── architecture-aggregates/ # schema-parser for DB introspection
├── avatar/                  # image resizing for avatars
├── bluesky/                 # Bluesky posting and session utilities
├── config/                  # app config, constants, weather config
├── crosspost/               # cross-posting to Bluesky/Mastodon
├── documents/               # document queries, blob URL extraction
├── email/                   # resend client, log-email, email URL builder, templates
├── follows/                 # follow queries
├── lists/                   # queries, dsl-parser, form-generator, tree-utils, date-utils
├── mastodon/                # Mastodon posting utilities
├── messages/                # link-detector, metadata-fetcher, linkify, queries
├── organizations/           # queries, utils
├── theme/                   # darkone-bridge, theme-sync
├── types/                   # shared TypeScript types
├── utils/                   # errors, relativeTime, message-extractor
├── help-config.ts           # help navigation config
├── help.ts                  # help content loader
└── prisma.ts                # Prisma client singleton
```

## Data Fetching

- Pages: Server Components, `async` functions, direct Prisma or `lib/*/queries`
- API routes: `getCurrentUser()`, then business logic
- No global state for auth; session checked per request
