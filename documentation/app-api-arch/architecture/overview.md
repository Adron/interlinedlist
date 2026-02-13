# Architecture Overview

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Bootstrap 5 + Darkone theme (SCSS)
- **Auth**: Session-based (httpOnly cookies) + OAuth (GitHub, Mastodon, Bluesky)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   app/      │  │ components/ │  │   lib/               │ │
│  │   pages,    │  │   UI and    │  │   auth, lists,      │ │
│  │   layouts   │  │   features  │  │   prisma, etc.      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Prisma)                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Pages, layouts, API routes (App Router) |
| `app/api/` | REST API endpoints |
| `components/` | React components |
| `lib/` | Utilities, auth, queries, Prisma client |
| `prisma/` | Schema and migrations |
| `styles/` | SCSS (Darkone theme) |

## Request Flow

1. **Pages**: Server Components by default; data fetched in `async` page functions
2. **API**: Route handlers in `app/api/**/route.ts`; auth via `getCurrentUser()`
3. **Middleware**: Protects `/dashboard`, `/settings`, `/lists`, `/admin`; redirects to `/login` if no session cookie
