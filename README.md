# InterlinedList

Time-series based micro-blogging platform, with embedded DSL scripts for creating interactive lists.

## Prerequisites

- **Node.js**: Version 18+ (required for Next.js and Prisma)
  - Check your version: `node --version`
- **npm**: Latest version
- **PostgreSQL**: Postgres.app (macOS) or PostgreSQL installed locally
  - For Postgres.app: Ensure PostgreSQL is running on port 5666

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd interlinedlist
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- Next.js 14
- React 18
- Prisma
- TypeScript

### 3. Set Up Database

#### Automated Setup (Recommended)

The project includes an automated database setup script that handles user creation, database creation, permissions, and migrations.

**Prerequisites:**
- PostgreSQL must be running locally
- You must have superuser access (either as `postgres` user or your current user with superuser privileges)

**Steps:**

1. **Create `.env.local` file** in the project root:
   ```bash
   touch .env.local
   ```

2. **Add your database configuration** to `.env.local`:
   ```env
   DATABASE_URL="postgresql://interlinedlist:interlinedlist_dev_password@localhost:5432/interlinedlist?schema=public"
   ```
   
   **Note:** The script will create a user `interlinedlist` with password `interlinedlist_dev_password` and database `interlinedlist`. If you prefer different credentials, edit `scripts/setup-database.sh` before running.

3. **Make the script executable** (if not already):
   ```bash
   chmod +x scripts/setup-database.sh
   ```

4. **Run the setup script**:
   ```bash
   ./scripts/setup-database.sh
   ```

   The script will:
   - Check PostgreSQL connection
   - Create database user `interlinedlist` (if it doesn't exist)
   - Grant `CREATEDB` permission (required for Prisma shadow database)
   - Create database `interlinedlist` (if it doesn't exist)
   - Grant all necessary permissions
   - Run Prisma migrations automatically

**What the script does:**
- Creates a PostgreSQL user with the configured password
- Grants `CREATEDB` permission (required for Prisma migrations)
- Creates the database owned by the new user
- Grants all privileges on the database and schema
- Runs Prisma migrations to set up all tables

#### Manual Setup (Alternative)

If you prefer to set up the database manually:

**Using Postgres.app (macOS):**

1. **Start Postgres.app** and ensure it's running on port 5666
2. **Create the database**:
   ```bash
   createdb interlinedlist
   ```
3. **Configure environment variables**:
   - Create a `.env.local` file in the project root
   - Add your database connection string:
     ```env
     DATABASE_URL="postgresql://<your-username>@localhost:5666/interlinedlist"
     ```
   - Replace `<your-username>` with your macOS username (find it with `whoami`)

**Using Standard PostgreSQL:**

1. Ensure PostgreSQL is running
2. Create the database:
   ```bash
   createdb interlinedlist
   ```
3. Update `.env.local` with your connection string:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/interlinedlist"
   ```

4. **Run migrations manually**:
   ```bash
   npm run db:migrate
   ```

### 4. Verify Database Setup

After running the setup script or manual setup, verify everything is working:

```bash
npm run db:studio
```

This will open Prisma Studio at `http://localhost:5555` where you can view your database tables.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations locally (creates new migrations)
- `npm run db:migrate:deploy` - Apply migrations to production database
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
interlinedlist/
├── app/              # Next.js app directory (pages, API routes)
├── lib/              # Utility functions and configurations
│   └── prisma.ts     # Prisma Client singleton
├── prisma/           # Prisma schema and migrations
│   ├── schema.prisma # Database schema
│   └── migrations/   # Database migration files
└── package.json      # Project dependencies
```

## Database

The application uses Prisma as the ORM with PostgreSQL. The database schema is defined in `prisma/schema.prisma`.

### Viewing the Database

To open Prisma Studio and browse your database:

```bash
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can view and edit your database.

### Testing Database Connection

A test API endpoint is available at `/api/test-db` to verify your database connection is working correctly.

## Features

### Core Features

- **User Authentication**: Registration, login, and session management
- **Email Verification**: Email verification workflow with resend capability (rate limited to 10 minutes)
- **Password Reset**: Secure password reset via email
- **Theme Management**: System, light, and dark theme support
- **Message Posting**: Time-series based micro-blogging (Mastodon-like)
  - Customizable character limits per user (default: 666 characters)
  - Public/private message visibility
  - Email verification required to post messages
- **User Profiles**: Customizable display names, avatars, and bios

### Security Features

- Password hashing with bcrypt
- Email verification required for posting messages
- Rate limiting on email resend (10 minutes)
- Secure token generation for password resets and email verification
- Session-based authentication with httpOnly cookies

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend API key for sending emails
- `RESEND_FROM_EMAIL` - Email address to send from (optional, defaults to onboarding@resend.dev)
- `NEXT_PUBLIC_APP_URL` - Application URL for email links (optional, auto-detected on Vercel)
- `NODE_ENV` - Node environment (development/production)

These should be set in `.env` or `.env.local` (both are gitignored).

### Local Development

Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://interlinedlist:interlinedlist_dev_password@localhost:5432/interlinedlist?schema=public"
RESEND_API_KEY="your_resend_api_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Email Configuration

The application uses [Resend](https://resend.com) for sending emails. To set up:

1. **Create a Resend account** at https://resend.com
2. **Get your API key** from the Resend dashboard
3. **Add it to your environment variables**:
   - Local: Add to `.env.local`
   - Production: Add to Vercel environment variables

**Note**: The `NEXT_PUBLIC_APP_URL` is automatically detected on Vercel using the `VERCEL_URL` environment variable. For local development, set it to `http://localhost:3000`.

## Deployment

### Deploying to Vercel

#### 1. Set Up Remote Database

For production deployment, you'll need a remote PostgreSQL database. Popular options include:
- **Vercel Postgres** (integrated with Vercel)
- **Neon** (serverless PostgreSQL)
- **Supabase** (PostgreSQL with additional features)
- **Railway** (PostgreSQL hosting)
- **AWS RDS** (managed PostgreSQL)

**Using the setup script with a remote database:**

The `setup-database.sh` script can be adapted for remote databases. You'll need to:

1. **Modify the script variables** at the top of `scripts/setup-database.sh`:
   ```bash
   DB_USER="your_remote_db_user"
   DB_PASSWORD="your_remote_db_password"
   DB_NAME="your_remote_db_name"
   DB_HOST="your_remote_db_host"  # e.g., "ep-cool-name-123456.us-east-1.aws.neon.tech"
   DB_PORT="5432"  # Usually 5432 for PostgreSQL
   ADMIN_USER="your_admin_user"  # Usually the same as DB_USER for managed services
   ```

2. **Ensure you have PostgreSQL client tools installed** (`psql`, `pg_isready`)

3. **Run the script** (it will connect to your remote database):
   ```bash
   ./scripts/setup-database.sh
   ```

**Alternative: Manual remote database setup**

If you prefer to set up the remote database manually:

1. **Create the database user** (if your provider allows):
   ```sql
   CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
   ALTER USER your_db_user CREATEDB;
   ```

2. **Create the database**:
   ```sql
   CREATE DATABASE your_db_name OWNER your_db_user;
   GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_db_user;
   ```

3. **Run migrations** using your remote `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public" npm run db:migrate
   ```

#### 2. Configure Vercel Environment Variables

After setting up your remote database, configure environment variables in Vercel:

1. **Go to your Vercel project dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project (or create a new one)

2. **Open Project Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add Required Environment Variables**

   Click **Add New** and add each variable:

   **`DATABASE_URL`** (Required)
   - **Key:** `DATABASE_URL`
   - **Value:** Your remote PostgreSQL connection string
     ```
     postgresql://user:password@host:5432/dbname?schema=public
     ```
   - **Environment:** Select all environments (Production, Preview, Development)
   - **Note:** Make sure to include `?schema=public` at the end

   **`NODE_ENV`** (Optional, but recommended)
   - **Key:** `NODE_ENV`
   - **Value:** `production`
   - **Environment:** Production only

4. **Save and Redeploy**
   - Click **Save** after adding each variable
   - Vercel will automatically trigger a new deployment
   - Or manually trigger a redeploy from the **Deployments** tab

#### 3. Vercel Build Configuration

Vercel will automatically detect Next.js and run the build. However, you may need to ensure Prisma generates the client during build:

**Add a `vercel.json` file** (optional, if needed):

```json
{
  "buildCommand": "npm run db:generate && npm run build"
}
```

Or ensure your `package.json` has a `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### 4. Run Migrations on Vercel

After deployment, you'll need to run migrations on your production database. You have several options:

**Option A: Using Vercel CLI (Recommended)**

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Pull environment variables**:
   ```bash
   vercel env pull .env.local
   ```

5. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

**Option B: Using Vercel Environment Variables Directly**

```bash
DATABASE_URL="your_production_database_url" npm run db:migrate
```

**Option C: Using Vercel's Postinstall Hook**

Add to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

This will automatically run migrations during each Vercel deployment.

#### 5. Verify Deployment

1. **Check build logs** in Vercel dashboard to ensure migrations ran successfully
2. **Test your application** at your Vercel URL
3. **Verify database connection** by checking if data persists

### Important Notes for Production

- **Never commit `.env.local`** - It's already in `.gitignore`
- **Use strong passwords** for production databases
- **Enable SSL** for database connections (most providers do this by default)
- **Set up database backups** through your provider
- **Monitor database performance** and scale as needed
- **Use connection pooling** for better performance (most managed providers handle this)

## License

MIT

