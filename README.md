# InterlinedList

Time-series based micro-blogging platform similar to Mastodon, with embedded DSL scripts for creating interactive lists.

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

#### Using Postgres.app (macOS)

1. **Start Postgres.app** and ensure it's running on port 5666
2. **Create the database** (if it doesn't exist):
   ```bash
   createdb interlinedlist
   ```
3. **Configure environment variables**:
   - Create a `.env` file in the project root (or ensure `.env.local` exists)
   - Add your database connection string:
     ```env
     DATABASE_URL="postgresql://<your-username>@localhost:5666/interlinedlist"
     ```
   - Replace `<your-username>` with your macOS username (find it with `whoami`)

#### Using Standard PostgreSQL

1. Ensure PostgreSQL is running
2. Create the database:
   ```bash
   createdb interlinedlist
   ```
3. Update `.env` or `.env.local` with your connection string:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/interlinedlist"
   ```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This will:
- Apply all pending migrations
- Create the necessary tables (including the `users` table)
- Generate Prisma Client

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
- `npm run db:migrate` - Run database migrations
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

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Node environment (development/production)

These should be set in `.env` or `.env.local` (both are gitignored).

## License

MIT

