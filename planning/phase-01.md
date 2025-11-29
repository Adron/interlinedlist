# Phase 1: Project Setup & Infrastructure - Implementation Plan

## Overview

Phase 1 establishes the foundational infrastructure for InterlinedList, including repository setup, development environment configuration, Vercel deployment setup, and PostgreSQL database initialization. This phase creates the scaffolding upon which all subsequent development will be built.

## Technology Decisions

Based on project requirements and best practices:

- **Framework**: Next.js (optimal Vercel integration, API routes, SSR/SSG)
- **Package Manager**: npm
- **Database ORM/Migrations**: Prisma (type-safe, schema-based migrations)
- **Database Client**: Prisma Client
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Repository Structure**: Single Next.js app (frontend + API routes)
- **License**: MIT
- **Environment Variables**: dotenv for local development + Vercel dashboard for production

## Section 1.1: Repository & Development Environment

### 1.1.1 Initialize GitHub Repository

**Tasks:**

1. Create new GitHub repository
   - Repository name: `interlinedlist`
   - Description: "Time-series micro-blogging platform with embedded list creation via DSL scripts"
   - Visibility: Private (or Public, as preferred)
   - Initialize with: README (yes), .gitignore (Node), License (MIT)

2. Clone repository locally

   ```bash
   git clone https://github.com/[username]/interlinedlist.git
   cd interlinedlist
   ```

3. Verify repository connection
   ```bash
   git remote -v
   ```

**Deliverables:**

- GitHub repository created and accessible
- Repository cloned locally
- Remote connection verified

---

### 1.1.2 Set Up Repository Structure

**Tasks:**

1. Create directory structure

   ```
   interlinedlist/
   ├── .github/
   │   └── workflows/
   ├── prisma/
   │   └── migrations/
   ├── public/
   ├── src/
   │   ├── app/          # Next.js 13+ app directory
   │   ├── components/
   │   ├── lib/
   │   ├── types/
   │   └── utils/
   ├── .env.example
   ├── .env.local        # (gitignored)
   ├── .gitignore
   ├── LICENSE
   ├── next.config.js
   ├── package.json
   ├── postcss.config.js
   ├── prisma/
   │   └── schema.prisma
   ├── README.md
   ├── tailwind.config.js
   └── tsconfig.json
   ```

2. Create `.gitignore` file

   ```gitignore
   # Dependencies
   node_modules/
   /.pnp
   .pnp.js

   # Testing
   /coverage

   # Next.js
   /.next/
   /out/
   .next
   out

   # Production
   /build
   /dist

   # Misc
   .DS_Store
   *.pem

   # Debug
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*

   # Local env files
   .env*.local
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local

   # Vercel
   .vercel

   # TypeScript
   *.tsbuildinfo
   next-env.d.ts

   # Prisma
   /prisma/migrations/*.sql
   !/prisma/migrations/.gitkeep
   ```

3. Create `README.md`

   ```markdown
   # InterlinedList

   Time-series based micro-blogging platform similar to Mastodon, with embedded DSL scripts for creating interactive lists.

   ## Tech Stack

   - **Framework**: Next.js
   - **Database**: PostgreSQL (TigerData)
   - **ORM**: Prisma
   - **Styling**: Tailwind CSS
   - **Hosting**: Vercel
   - **Domain**: https://interlinedlist.com

   ## Getting Started

   ### Prerequisites

   - Node.js 18+
   - npm
   - PostgreSQL database (TigerData)

   ### Installation

   1. Clone the repository
   2. Install dependencies: `npm install`
   3. Copy `.env.example` to `.env.local` and configure
   4. Run database migrations: `npx prisma migrate dev`
   5. Start development server: `npm run dev`

   ## Development

   - `npm run dev` - Start development server
   - `npm run build` - Build for production
   - `npm run start` - Start production server
   - `npm run lint` - Run ESLint
   - `npm run format` - Format code with Prettier

   ## License

   MIT
   ```

4. Create `LICENSE` file (MIT License)
   - Use standard MIT License template
   - Update copyright year and name

**Deliverables:**

- Complete directory structure created
- `.gitignore` configured
- `README.md` with project overview
- `LICENSE` file (MIT)

---

### 1.1.3 Configure Branch Protection Rules

**Tasks:**

1. Navigate to GitHub repository Settings → Branches
2. Add branch protection rule for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators
   - Restrict pushes that create files larger than 100MB

3. Create `develop` branch (optional, for Git Flow)
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

**Deliverables:**

- Branch protection rules configured
- `main` branch protected
- Optional `develop` branch created

---

### 1.1.4 Set Up Development Environment

**Tasks:**

1. Verify Node.js version (18+)

   ```bash
   node --version
   ```

2. Verify npm version

   ```bash
   npm --version
   ```

3. Initialize Next.js project

   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
   ```

   Note: Run this in the repository root directory

4. Verify installation

   ```bash
   npm run dev
   ```

   - Should start dev server on http://localhost:3000
   - Verify Next.js welcome page loads

**Deliverables:**

- Node.js and npm verified
- Next.js project initialized
- Development server running successfully

---

### 1.1.5 Configure TypeScript

**Tasks:**

1. Review and update `tsconfig.json`

   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["dom", "dom.iterable", "esnext"],
       "allowJs": true,
       "skipLibCheck": true,
       "strict": true,
       "noEmit": true,
       "esModuleInterop": true,
       "module": "esnext",
       "moduleResolution": "bundler",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "jsx": "preserve",
       "incremental": true,
       "plugins": [
         {
           "name": "next"
         }
       ],
       "paths": {
         "@/*": ["./src/*"]
       }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

2. Create type definitions directory structure

   ```
   src/types/
   ├── index.ts
   ├── user.ts
   ├── post.ts
   └── list.ts
   ```

3. Create base type definitions
   - `src/types/index.ts` - Export all types
   - Placeholder types for now (will be expanded in later phases)

**Deliverables:**

- TypeScript configured with strict mode
- Type definitions directory structure created
- Base type files created

---

### 1.1.6 Set Up ESLint and Prettier

**Tasks:**

1. Install ESLint and Prettier dependencies

   ```bash
   npm install --save-dev eslint-config-prettier eslint-plugin-prettier prettier
   ```

2. Update `.eslintrc.json` (or create if needed)

   ```json
   {
     "extends": ["next/core-web-vitals", "prettier"],
     "plugins": ["prettier"],
     "rules": {
       "prettier/prettier": "error"
     }
   }
   ```

3. Create `.prettierrc.json`

   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2,
     "useTabs": false,
     "arrowParens": "always"
   }
   ```

4. Create `.prettierignore`

   ```
   node_modules
   .next
   out
   dist
   build
   .vercel
   package-lock.json
   *.log
   ```

5. Add npm scripts to `package.json`

   ```json
   {
     "scripts": {
       "lint": "next lint",
       "format": "prettier --write .",
       "format:check": "prettier --check ."
     }
   }
   ```

6. Test linting and formatting
   ```bash
   npm run lint
   npm run format:check
   ```

**Deliverables:**

- ESLint configured with Next.js and Prettier integration
- Prettier configured with consistent formatting rules
- npm scripts added for linting and formatting
- Linting and formatting verified

---

### 1.1.7 Configure Environment Variables Structure

**Tasks:**

1. Create `.env.example` file

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

   # Next.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # JWT
   JWT_SECRET="your-jwt-secret-key-here"
   JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-here"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"

   # OAuth Providers
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   GITHUB_CLIENT_ID=""
   GITHUB_CLIENT_SECRET=""
   MASTODON_CLIENT_ID=""
   MASTODON_CLIENT_SECRET=""
   MASTODON_INSTANCE_URL=""
   BLUESKY_CLIENT_ID=""
   BLUESKY_CLIENT_SECRET=""

   # Application
   APP_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

2. Create `.env.local` file (gitignored)
   - Copy from `.env.example`
   - Fill in actual values for local development
   - Note: This file should never be committed

3. Create environment variable type definitions
   - `src/lib/env.ts` - Type-safe environment variable access

   ```typescript
   // Example structure - will be expanded
   export const env = {
     DATABASE_URL: process.env.DATABASE_URL!,
     NODE_ENV: process.env.NODE_ENV || 'development',
   };
   ```

4. Install `dotenv` if needed (Next.js has built-in support)
   - Next.js automatically loads `.env.local` files
   - No additional package needed

**Deliverables:**

- `.env.example` created with all required variables
- `.env.local` created (gitignored) for local development
- Environment variable type definitions created
- Documentation of environment variables in README

---

## Section 1.2: Vercel Configuration

### 1.2.1 Connect GitHub Repository to Vercel

**Tasks:**

1. Log in to Vercel dashboard (https://vercel.com)
2. Navigate to "Add New Project"
3. Import GitHub repository
   - Select `interlinedlist` repository
   - Authorize Vercel to access GitHub if needed
4. Configure project settings:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (root)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)
5. Click "Deploy" to create initial deployment
6. Wait for deployment to complete
7. Verify deployment URL (e.g., `interlinedlist.vercel.app`)

**Deliverables:**

- GitHub repository connected to Vercel
- Initial deployment successful
- Deployment URL accessible

---

### 1.2.2 Configure Domain (interlinedlist.com)

**Tasks:**

1. In Vercel project settings, navigate to "Domains"
2. Add custom domain: `interlinedlist.com`
3. Add domain: `www.interlinedlist.com` (optional, redirects to main)
4. Follow DNS configuration instructions:
   - Add A record or CNAME record as instructed by Vercel
   - Wait for DNS propagation (can take up to 48 hours, usually faster)
5. Verify domain configuration
   - Check DNS records are correct
   - Verify SSL certificate is issued (automatic via Vercel)
6. Test domain access
   - Visit https://interlinedlist.com
   - Verify site loads correctly
   - Verify HTTPS redirect works

**Deliverables:**

- Domain configured in Vercel
- DNS records configured correctly
- SSL certificate issued and active
- Domain accessible via HTTPS

---

### 1.2.3 Set Up Environment Variables in Vercel Dashboard

**Tasks:**

1. Navigate to Vercel project → Settings → Environment Variables
2. Add environment variables for Production:
   - `DATABASE_URL` - Production database connection string
   - `NEXTAUTH_URL` - `https://interlinedlist.com`
   - `NEXTAUTH_SECRET` - Generate secure random string
   - `JWT_SECRET` - Generate secure random string
   - `JWT_REFRESH_SECRET` - Generate secure random string
   - `JWT_ACCESS_EXPIRES_IN` - `15m`
   - `JWT_REFRESH_EXPIRES_IN` - `7d`
   - `APP_URL` - `https://interlinedlist.com`
   - `NODE_ENV` - `production`
   - OAuth provider credentials (when available)
3. Add environment variables for Preview:
   - Copy production variables
   - Update `NEXTAUTH_URL` to use preview URL
   - Update `APP_URL` to use preview URL
4. Add environment variables for Development:
   - Copy production variables
   - Update URLs to localhost
   - Use development database connection string
5. Generate secure secrets:

   ```bash
   # Generate random secrets (use in production)
   openssl rand -base64 32
   ```

   - Generate separate secrets for NEXTAUTH_SECRET, JWT_SECRET, JWT_REFRESH_SECRET

**Deliverables:**

- Environment variables configured for all environments
- Secure secrets generated and stored
- Environment-specific configurations set

---

### 1.2.4 Configure Build Settings

**Tasks:**

1. Review Vercel build settings (Settings → General)
   - Framework Preset: Next.js
   - Build Command: `npm run build` (verify)
   - Output Directory: `.next` (verify)
   - Install Command: `npm install` (verify)
   - Node.js Version: 18.x or 20.x (select latest LTS)
2. Configure build optimizations:
   - Enable "Optimize for Production" (default)
   - Enable "Include Source Maps" (for debugging, optional)
3. Set up build environment variables if needed
   - Variables needed during build time (if any)
4. Configure build timeout (if needed)
   - Default: 45 seconds (usually sufficient)

**Deliverables:**

- Build settings configured correctly
- Node.js version specified
- Build optimizations enabled

---

### 1.2.5 Set Up Preview Deployments for Pull Requests

**Tasks:**

1. Verify preview deployments are enabled (default in Vercel)
   - Settings → Git → Preview Deployments
   - Should be enabled by default
2. Test preview deployment:
   - Create a test branch

   ```bash
   git checkout -b test-preview-deployment
   ```

   - Make a small change (e.g., update README)
   - Commit and push

   ```bash
   git add .
   git commit -m "Test preview deployment"
   git push -u origin test-preview-deployment
   ```

   - Create a pull request on GitHub
   - Verify Vercel creates preview deployment
   - Check preview deployment URL in PR comments

3. Configure preview deployment settings:
   - Automatic preview deployments: Enabled
   - Cancel previous deployments: Enabled (optional)
   - Comment on PR: Enabled (default)

**Deliverables:**

- Preview deployments enabled and tested
- Pull request workflow verified
- Preview URLs appear in PR comments

---

### 1.2.6 Test Deployment Pipeline

**Tasks:**

1. Test production deployment:
   - Make a small change to main branch
   - Push to main
   - Verify automatic deployment triggers
   - Monitor deployment logs in Vercel dashboard
   - Verify deployment succeeds
   - Test deployed site functionality
2. Test preview deployment:
   - Create feature branch
   - Make changes
   - Create PR
   - Verify preview deployment
   - Test preview URL
3. Test rollback (if needed):
   - Verify ability to rollback to previous deployment
   - Test rollback functionality
4. Set up deployment notifications (optional):
   - Configure email/Slack notifications for deployments
   - Set up deployment status checks

**Deliverables:**

- Production deployment pipeline tested
- Preview deployment pipeline tested
- Deployment monitoring configured
- Rollback process verified

---

## Section 1.3: Database Setup (TigerData PostgreSQL)

### 1.3.1 Create PostgreSQL Database Instance

**Tasks:**

1. Access TigerData dashboard/console
2. Create new PostgreSQL database instance:
   - Database name: `interlinedlist` (or as preferred)
   - Region: Select appropriate region (closest to Vercel deployment)
   - PostgreSQL version: Latest stable (14+)
   - Plan: Select appropriate plan (development/production)
3. Configure database settings:
   - Enable connection pooling (if available)
   - Set up backup schedule (daily recommended)
   - Configure maintenance window
4. Note database connection details:
   - Host
   - Port (usually 5432)
   - Database name
   - Username
   - Password (save securely)
   - Connection string format: `postgresql://user:password@host:port/database?schema=public`

**Deliverables:**

- PostgreSQL database instance created
- Connection details documented securely
- Database configuration optimized

---

### 1.3.2 Set Up Database Connection Configuration

**Tasks:**

1. Install Prisma CLI (if not already installed)

   ```bash
   npm install -D prisma
   npm install @prisma/client
   ```

2. Initialize Prisma

   ```bash
   npx prisma init
   ```

   - Creates `prisma/schema.prisma`
   - Creates `.env` file (if not exists)

3. Configure `prisma/schema.prisma`

   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

4. Update `.env.local` with database connection string

   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   ```

5. Test database connection

   ```bash
   npx prisma db pull
   ```

   - Should connect successfully
   - May show empty schema (expected)

6. Create Prisma Client utility (`src/lib/prisma.ts`)

   ```typescript
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   export const prisma =
     globalForPrisma.prisma ??
     new PrismaClient({
       log:
         process.env.NODE_ENV === 'development'
           ? ['query', 'error', 'warn']
           : ['error'],
     });

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

**Deliverables:**

- Prisma initialized and configured
- Database connection string configured
- Prisma Client utility created
- Database connection verified

---

### 1.3.3 Create Database Migration System

**Tasks:**

1. Create initial migration directory structure

   ```bash
   mkdir -p prisma/migrations
   ```

2. Create initial schema file (`prisma/schema.prisma`)
   - Start with basic structure (will be expanded in Phase 2)

   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   // Models will be added in Phase 2
   ```

3. Create initial migration

   ```bash
   npx prisma migrate dev --name init
   ```

   - This creates the migration file
   - Applies migration to database
   - Generates Prisma Client

4. Verify migration system:
   - Check `prisma/migrations` directory has migration files
   - Verify Prisma Client generated in `node_modules/.prisma/client`
   - Test Prisma Client import

5. Set up migration workflow:
   - Document migration commands in README
   - Create migration scripts in `package.json`:
   ```json
   {
     "scripts": {
       "db:migrate": "prisma migrate dev",
       "db:migrate:deploy": "prisma migrate deploy",
       "db:generate": "prisma generate",
       "db:studio": "prisma studio",
       "db:reset": "prisma migrate reset"
     }
   }
   ```

**Deliverables:**

- Prisma migration system configured
- Initial migration created
- Migration scripts added to package.json
- Migration workflow documented

---

### 1.3.4 Set Up Database Connection Pooling

**Tasks:**

1. Review TigerData connection pooling options:
   - Check if TigerData provides built-in connection pooling
   - Review connection limit settings
   - Understand pooling configuration

2. Configure Prisma connection pooling:
   - Update `DATABASE_URL` if using connection pooler:
     - Format: `postgresql://user:password@host:port/database?schema=public&connection_limit=10&pool_timeout=20`
   - Adjust connection pool settings based on plan limits

3. Implement connection pooling in Prisma Client:
   - Prisma Client handles connection pooling automatically
   - Configure `connection_limit` in connection string if needed
   - Set appropriate `pool_timeout`

4. Test connection pooling:
   - Create test script to verify multiple connections
   - Monitor connection usage
   - Verify pool behavior

5. Document connection pooling configuration:
   - Add to README
   - Document environment-specific settings

**Deliverables:**

- Connection pooling configured
- Connection limits set appropriately
- Pooling behavior tested
- Configuration documented

---

### 1.3.5 Configure Database Backup Strategy

**Tasks:**

1. Review TigerData backup options:
   - Check available backup schedules (daily, weekly)
   - Review backup retention policies
   - Understand point-in-time recovery options

2. Configure automated backups:
   - Set up daily automated backups
   - Configure backup retention (7-30 days recommended)
   - Enable point-in-time recovery if available

3. Set up manual backup process:
   - Document manual backup procedure
   - Create backup script (optional):

   ```bash
   # Example backup script
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

4. Test backup restoration:
   - Create test backup
   - Test restore procedure
   - Verify data integrity after restore

5. Document backup strategy:
   - Add backup procedures to README
   - Document recovery procedures
   - Include backup schedule information

**Deliverables:**

- Automated backups configured
- Backup retention policy set
- Manual backup process documented
- Backup restoration tested

---

### 1.3.6 Set Up Database Monitoring

**Tasks:**

1. Review TigerData monitoring options:
   - Check available metrics dashboard
   - Review query performance monitoring
   - Understand alerting capabilities

2. Configure database monitoring:
   - Set up performance metrics tracking
   - Configure slow query logging (if available)
   - Set up connection monitoring

3. Set up alerts (if available):
   - High connection usage alerts
   - Slow query alerts
   - Database size alerts
   - Backup failure alerts

4. Create monitoring dashboard (optional):
   - Use TigerData dashboard
   - Or integrate with external monitoring tools

5. Document monitoring setup:
   - Add monitoring information to README
   - Document alert thresholds
   - Include monitoring dashboard access

**Deliverables:**

- Database monitoring configured
- Alerts set up (if available)
- Monitoring dashboard accessible
- Monitoring documentation created

---

## Phase 1 Completion Checklist

### Repository & Development Environment

- [ ] GitHub repository created and configured
- [ ] Repository structure established
- [ ] Branch protection rules configured
- [ ] Next.js project initialized
- [ ] TypeScript configured
- [ ] ESLint and Prettier configured
- [ ] Environment variables structure created

### Vercel Configuration

- [ ] Repository connected to Vercel
- [ ] Domain (interlinedlist.com) configured
- [ ] Environment variables set in Vercel
- [ ] Build settings configured
- [ ] Preview deployments tested
- [ ] Deployment pipeline verified

### Database Setup

- [ ] PostgreSQL database instance created
- [ ] Database connection configured
- [ ] Prisma migration system set up
- [ ] Connection pooling configured
- [ ] Backup strategy implemented
- [ ] Database monitoring configured

## Next Steps

After completing Phase 1, proceed to Phase 2: Authentication System, which will build upon this foundation to implement the complete authentication system with JWT tokens and OAuth providers.

## Notes

- All environment variables should be kept secure and never committed to version control
- Database migrations should be tested in development before applying to production
- Regular backups should be verified to ensure they can be restored
- Monitoring should be reviewed regularly to catch issues early
- Keep documentation updated as configuration changes
