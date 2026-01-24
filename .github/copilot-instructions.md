# Copilot Instructions for InterlinedList

## Project Overview

InterlinedList is a time-series based micro-blogging platform (similar to Mastodon) with embedded script support for creating interactive lists. Built with Next.js 14, React 18, TypeScript, Prisma ORM, and PostgreSQL.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router)
- **Runtime:** Node.js 18+
- **Language:** TypeScript (strict mode enabled)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Session-based with bcryptjs
- **Email:** Resend API
- **Styling:** Bootstrap 5.3.3, SASS, DarkOne theme framework
- **Package Manager:** npm

## Project Structure

```
.
├── app/                    # Next.js App Router (pages & API routes)
│   ├── api/               # RESTful API endpoints
│   │   ├── auth/          # Authentication (login, register, password reset, email verification)
│   │   ├── messages/      # Message CRUD operations
│   │   ├── lists/         # Interactive list management
│   │   ├── user/          # User profile/settings management
│   │   ├── test-db/       # Database connection testing
│   │   ├── location/      # Location services
│   │   └── weather/       # Weather services
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── settings/          # User settings page
│   └── layout.tsx         # Root layout
├── components/            # React components (Avatar, MessageFeed, Navigation, etc.)
├── lib/                   # Utilities and configurations
│   ├── auth/             # Password hashing, session management, tokens
│   ├── email/            # Resend client, email templates
│   ├── lists/            # DSL parser, validator, form generator, queries
│   ├── messages/         # Message queries
│   ├── theme/            # DarkOne theme bridge
│   ├── utils/            # Utilities (relativeTime, etc.)
│   ├── config/           # App configuration
│   ├── types/            # TypeScript type definitions
│   └── prisma.ts         # Prisma Client singleton
├── prisma/
│   ├── schema.prisma     # Database schema (User, Message, List, ListProperty, ListDataRow)
│   └── migrations/       # Database migration history
├── public/               # Static assets (images, fonts, icons)
├── scripts/              # Utility scripts (setup-database.sh, backup-database.js)
├── styles/               # Global styles and DarkOne SCSS theme
├── middleware.ts         # Next.js middleware (auth, routing)
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json        # ESLint configuration (extends next/core-web-vitals)
└── .prettierrc.json      # Prettier configuration
```

## Build, Test, and Development Commands

### Installation & Setup
**ALWAYS run `npm install` first when working with this repository.** This installs dependencies and automatically runs `prisma generate` via the postinstall hook.

```bash
npm install
```

### Database Setup

**Prerequisites:**
- PostgreSQL must be running locally or remotely
- Create a `.env.local` file with `DATABASE_URL`

**Automated Setup (Local Development):**
```bash
./scripts/setup-database.sh
```
This script creates the database user, database, grants permissions, and runs migrations.

**Manual Migration Commands:**
```bash
# Create and apply new migration (local development)
npm run db:migrate

# Apply existing migrations (production)
npm run db:migrate:deploy

# Regenerate Prisma Client
npm run db:generate

# Open Prisma Studio (database GUI)
npm run db:studio
```

**Important:** Database commands use `dotenv -e .env.local` to load environment variables from `.env.local`.

### Development Server
```bash
npm run dev
```
Starts the Next.js development server at `http://localhost:3000`.

### Build
```bash
npm run build
```
Builds the production application. **Note:** TypeScript errors will fail the build (`ignoreBuildErrors: false`), but ESLint errors are allowed (`ignoreDuringBuilds: true`).

### Production Server
```bash
npm run start
```
Starts the production server after building.

### Linting
```bash
npm run lint
```
**Known Issue:** The current ESLint setup has compatibility issues with Next.js. If linting fails with "Invalid Options" errors, this is a known issue and can be ignored for now. Focus on TypeScript type checking instead.

### Vercel Deployment
The `vercel-build` script automatically runs migrations and builds:
```bash
npm run vercel-build  # Runs: prisma migrate deploy && next build
```

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend API key for emails
- `NODE_ENV` - Node environment (development/production)

**Optional:**
- `RESEND_FROM_EMAIL` - Email sender (defaults to `onboarding@resend.dev`)
- `NEXT_PUBLIC_APP_URL` - App URL for email links (auto-detected on Vercel)
- `APP_NAME` - Application name (defaults to `InterlinedList`)
- `APP_CONTACT_EMAIL` - Contact email (defaults to `contact@interlinedlist.com`)
- `SESSION_COOKIE_NAME` - Session cookie name (defaults to `session`)
- `SESSION_MAX_AGE` - Session max age in seconds (defaults to 604800 = 7 days)

**Note:** Use `.env.local` for local development (gitignored). Use `.env` for production secrets (also gitignored).

## Database Schema

The Prisma schema (`prisma/schema.prisma`) defines:

1. **User** - User accounts with authentication, profile, preferences
   - Authentication: email, username, password hash
   - Profile: display name, avatar, bio
   - Preferences: theme, max message length, default message visibility
   - Security: email verification, password reset tokens

2. **Message** - Time-series messages
   - Content with user-defined length limits
   - Public/private visibility
   - Linked to User (cascade delete)

3. **List** - Interactive lists with DSL support
   - Title, description, metadata
   - Linked to User and optional Message
   - Soft delete support (deletedAt)

4. **ListProperty** - Dynamic properties for lists
   - Property definitions with types and validation
   - Display order, visibility conditions
   - Linked to List (cascade delete)

5. **ListDataRow** - Data rows for lists
   - JSON data storage
   - Row numbering and soft delete
   - Linked to List (cascade delete)

**Migration Workflow:**
1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate` locally (creates migration + applies + regenerates client)
3. Test locally
4. Commit migration files to git
5. Deploy (migrations run automatically on Vercel via `vercel-build` script)

## Code Style & Best Practices

1. **TypeScript:**
   - Strict mode enabled
   - No `any` types without justification
   - Use type imports: `import type { ... } from '...'`
   - Path alias `@/*` maps to project root

2. **Next.js App Router:**
   - Use Server Components by default
   - Mark Client Components with `'use client'` directive
   - API routes in `app/api/*/route.ts` format
   - Use Next.js Image component for images

3. **Database:**
   - Always use Prisma Client singleton from `lib/prisma.ts`
   - Handle database errors gracefully
   - Use transactions for multi-step operations
   - Follow existing cascade delete patterns

4. **Authentication:**
   - Use session utilities from `lib/auth/session.ts`
   - Hash passwords with `lib/auth/password.ts`
   - Generate tokens with `lib/auth/tokens.ts`
   - Email verification required for posting messages

5. **API Routes:**
   - Return proper HTTP status codes
   - Handle errors with try-catch
   - Validate input data
   - Use consistent JSON response format

6. **Security:**
   - Never commit secrets to git
   - Use httpOnly cookies for sessions
   - Rate limit sensitive operations (e.g., email resend: 10 minutes)
   - Validate and sanitize user input

## Common Pitfalls & Workarounds

1. **ESLint Configuration Issue:**
   - The current ESLint setup has compatibility issues with Next.js
   - If `npm run lint` fails with "Invalid Options" errors, this is a known issue
   - Focus on TypeScript type checking instead of linting for now

2. **Prisma Client Generation:**
   - Always run `npm install` after pulling changes (postinstall hook runs `prisma generate`)
   - If you get "Cannot find module '@prisma/client'", run `npm run db:generate`

3. **Database Connection:**
   - Local development requires `.env.local` with `DATABASE_URL`
   - Test connection at `/api/test-db` endpoint
   - Ensure PostgreSQL is running before starting the app

4. **Image Configuration:**
   - `next.config.js` allows all remote image patterns
   - Use Next.js Image component with proper width/height

5. **Theme System:**
   - DarkOne theme files are in `styles/darkone/scss/`
   - Theme bridge is in `lib/theme/darkone-bridge.ts`
   - User theme preference is stored in database (system/light/dark)

## Testing & Validation

**No automated test suite exists yet.** To validate changes:

1. **Manual Testing:**
   - Run `npm run dev` and test in browser
   - Check console for errors
   - Test authentication flow (register, login, email verification)
   - Test message posting and visibility
   - Test list creation and management

2. **TypeScript Validation:**
   - TypeScript errors will fail the build
   - Fix type errors before committing

3. **Database Validation:**
   - Use `npm run db:studio` to inspect database
   - Verify migrations applied correctly
   - Check data relationships and constraints

4. **Production Build:**
   - Run `npm run build` to ensure production build succeeds
   - Fix any build errors before deploying

## Key Features

- User authentication with email verification
- Password reset via email
- Time-series message posting (Mastodon-like)
- Customizable character limits per user (default: 666)
- Public/private message visibility
- Interactive lists with DSL support
- Theme management (system/light/dark)
- User profiles with avatars and bios
- Session-based authentication

## Deployment

The application is designed for Vercel deployment:
- Migrations run automatically via `vercel-build` script
- Environment variables configured in Vercel dashboard
- `NEXT_PUBLIC_APP_URL` auto-detected via `VERCEL_URL`
- PostgreSQL database required (Vercel Postgres, Neon, Supabase, etc.)

## Additional Notes

- **Node Version:** Use Node.js 18+ (see `.nvmrc`)
- **Git Ignore:** `.env` and `.env.local` are gitignored
- **Backup:** Use `npm run backup` to backup databases
- **Session Cookies:** httpOnly cookies, 7-day expiration by default
- **Email Rate Limiting:** Email verification resend limited to once per 10 minutes
