# Docker Database Setup Guide

This guide explains how to set up a local PostgreSQL database using Docker for InterlinedList development. The same database schema and migrations work seamlessly with TigerData in production.

## Quick Start

### Option 1: Automated Setup Script

```bash
./scripts/db-setup.sh
```

This script will:

1. Check Docker is running
2. Start PostgreSQL container
3. Wait for database to be ready
4. Generate Prisma Client
5. Run database migrations

### Option 2: Manual Setup

1. **Start PostgreSQL container:**

   ```bash
   docker-compose up -d postgres
   ```

2. **Wait for database to be ready** (about 5-10 seconds)

3. **Generate Prisma Client:**

   ```bash
   npx prisma generate
   ```

4. **Run migrations:**
   ```bash
   npx prisma migrate dev --name init_auth
   ```

## Docker Configuration

The `docker-compose.yml` file configures:

- **Image**: PostgreSQL 16 Alpine (lightweight)
- **Container Name**: `interlinedlist_db`
- **Port**: 5432 (standard PostgreSQL port)
- **Database**: `interlinedlist`
- **User**: `interlinedlist`
- **Password**: `interlinedlist_dev_password`
- **Volume**: Persistent data storage

## Environment Variables

The `.env.local` file should contain:

```env
DATABASE_URL="postgresql://interlinedlist:interlinedlist_dev_password@localhost:5432/interlinedlist?schema=public"
```

This is already configured in `.env.example` for local development.

## Database Management

### Start Database

```bash
docker-compose up -d postgres
```

### Stop Database

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs postgres
```

### Access Database CLI

```bash
docker-compose exec postgres psql -U interlinedlist -d interlinedlist
```

### View Database in Prisma Studio

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555

## Migrating to TigerData

When you're ready to deploy to production:

1. **Get your TigerData connection string** from your TigerData dashboard

2. **Update `.env.local`** (or set in Vercel environment variables):

   ```env
   DATABASE_URL="postgresql://user:password@tigerdata-host:port/database?schema=public"
   ```

3. **Run migrations** (this will connect to TigerData):

   ```bash
   npm run db:migrate:deploy
   ```

4. **Verify connection:**
   ```bash
   npx prisma studio
   ```

The same Prisma schema and migrations work with both local Docker and TigerData PostgreSQL instances. No changes needed!

## Troubleshooting

### Docker is not running

```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker
```

### Port 5432 is already in use

If you have PostgreSQL running locally, either:

- Stop your local PostgreSQL service
- Change the port in `docker-compose.yml`:
  ```yaml
  ports:
    - '5433:5432' # Use 5433 instead
  ```
  Then update `DATABASE_URL` to use port 5433

### Database connection errors

1. Ensure Docker container is running: `docker ps`
2. Check container logs: `docker-compose logs postgres`
3. Verify DATABASE_URL in `.env.local` matches docker-compose.yml
4. Wait a few seconds after starting container for PostgreSQL to initialize

### Reset database

```bash
# Stop and remove container and volume
docker-compose down -v

# Start fresh
docker-compose up -d postgres
npx prisma migrate dev
```

## Production Considerations

- **Never commit `.env.local`** - It's in `.gitignore`
- **Use strong passwords** in production (TigerData)
- **Enable SSL** for production connections (TigerData handles this)
- **Backup regularly** - TigerData provides automated backups
- **Monitor connections** - Use connection pooling in production

## Benefits of Docker Setup

1. **Consistent Environment**: Same PostgreSQL version across all developers
2. **Easy Reset**: Quickly reset database for testing
3. **Isolated**: Doesn't interfere with system PostgreSQL
4. **Portable**: Works on macOS, Windows, and Linux
5. **Production Parity**: Same schema works with TigerData
