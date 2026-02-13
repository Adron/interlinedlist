# Application Design Overview

## App Structure (Next.js App Router)

```
app/
├── layout.tsx          # Root layout (Navigation, Footer, ThemeProvider)
├── page.tsx            # Home
├── globals.css         # CSS variables, base styles
├── dashboard/          # Dashboard page
├── lists/              # Lists: index, [id], new, edit
├── help/               # Help docs (sidebar + content)
├── settings/           # User settings
├── organizations/      # Organizations: index, [slug], new
├── user/[username]/    # User profile, followers, following
├── login/, register/   # Auth pages
├── forgot-password/, reset-password/, verify-email/
└── api/                # API routes
```

## Routing

- File-based: `app/lists/[id]/page.tsx` → `/lists/:id`
- Dynamic segments: `[id]`, `[slug]`, `[rowId]`
- Nested layouts: `app/help/layout.tsx` wraps `app/help/*`

## Lib Layout

```
lib/
├── auth/         # session, password, OAuth helpers
├── lists/        # queries, dsl-parser, form-generator
├── messages/     # link-detector, metadata-fetcher, linkify
├── organizations/# queries, utils
├── follows/      # queries
├── config/       # app config, constants
├── prisma.ts     # Prisma client singleton
└── utils/        # errors, relativeTime, etc.
```

## Data Fetching

- Pages: Server Components, `async` functions, direct Prisma or `lib/*/queries`
- API routes: `getCurrentUser()`, then business logic
- No global state for auth; session checked per request
