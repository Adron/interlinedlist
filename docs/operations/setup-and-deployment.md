# Setup and Deployment Guide

This guide covers the steps from the README.md and provides detailed instructions for setting up and deploying InterlinedList.

## Prerequisites

Before starting, ensure you have:

- **Node.js**: Version 20.19+, 22.12+, or 24.0+ (required for Prisma)
  - Check version: `node --version`
  - Using nvm: `nvm use` (uses .nvmrc file)
- **npm**: Latest version
- **Docker** and **Docker Compose**: For local database development
- **PostgreSQL database**: TigerData instance (for production)
- **Git**: For version control

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/[username]/interlinedlist.git
cd interlinedlist
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Local Database with Docker

**Option A: Using the setup script (recommended)**

```bash
./scripts/db-setup.sh
```

**Option B: Manual setup**

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready (about 5-10 seconds)
# Then generate Prisma Client and run migrations
npx prisma generate
npx prisma migrate dev --name init_auth
```

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

**Required Variables:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/interlinedlist"
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-here-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**OAuth Variables (Optional):**
```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
MASTODON_CLIENT_ID=""
MASTODON_CLIENT_SECRET=""
MASTODON_INSTANCE_URL=""
BLUESKY_CLIENT_ID=""
BLUESKY_CLIENT_SECRET=""
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

### Local Development (Docker)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Stop PostgreSQL container
docker-compose down

# View database logs
docker-compose logs postgres

# Access database CLI
docker-compose exec postgres psql -U interlinedlist -d interlinedlist
```

### Database Commands

```bash
# Run database migrations (development)
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Generate Prisma Client
npm run db:generate

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only - WARNING: deletes all data)
npm run db:reset
```

### Migrating to TigerData (Production)

1. Create a PostgreSQL database instance in TigerData
2. Update `DATABASE_URL` in `.env.local` with your TigerData connection string:
   ```env
   DATABASE_URL="postgresql://user:password@tigerdata-host:5432/database"
   ```
3. Run migrations:
   ```bash
   npm run db:migrate:deploy
   ```
4. Verify connection:
   ```bash
   npx prisma studio
   ```

The same Prisma schema and migrations work seamlessly with both local Docker and TigerData PostgreSQL instances.

## Vercel Deployment

### 1. Connect Repository to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings

### 2. Configure Build Settings

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

**Required:**
- `DATABASE_URL` - Your TigerData PostgreSQL connection string
- `JWT_SECRET` - Strong random secret for JWT signing
- `JWT_REFRESH_SECRET` - Strong random secret for refresh tokens
- `JWT_ACCESS_EXPIRES_IN` - Access token expiration (e.g., "15m")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (e.g., "7d")
- `APP_URL` - Your production URL (e.g., "https://interlinedlist.com")
- `NODE_ENV` - Set to "production"

**OAuth (if using):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `MASTODON_CLIENT_ID`
- `MASTODON_CLIENT_SECRET`
- `MASTODON_INSTANCE_URL`
- `BLUESKY_CLIENT_ID`
- `BLUESKY_CLIENT_SECRET`

### 4. Configure Domain

1. Go to Project Settings → Domains
2. Add your domain: `interlinedlist.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

### 5. Deploy

- Push to `main` branch triggers automatic deployment
- Preview deployments are created for pull requests
- Monitor deployment status in Vercel Dashboard

## Production Checklist

Before going live:

- [ ] Database migrations deployed
- [ ] Environment variables configured
- [ ] Domain configured and verified
- [ ] SSL certificate active (automatic with Vercel)
- [ ] JWT secrets are strong and unique
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Email service configured (for verification emails)
- [ ] OAuth providers configured (if using)

## Troubleshooting

### Build Failures

- Check Node.js version matches requirements
- Verify all environment variables are set
- Check for TypeScript errors: `npm run build`
- Review build logs in Vercel Dashboard

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel
- Ensure database allows connections from Vercel IPs
- Test connection locally first

### Migration Issues

- Ensure database is accessible
- Check Prisma schema is up to date
- Review migration files for conflicts
- Use `npx prisma migrate resolve` to mark migrations as applied if needed

## Next Steps

After deployment:

1. Test all authentication flows
2. Verify email sending works
3. Test OAuth providers (if configured)
4. Set up monitoring and alerts
5. Configure backups
6. Review security settings

