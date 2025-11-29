# InterlinedList

Time-series based micro-blogging platform similar to Mastodon, with embedded DSL scripts for creating interactive lists.

## Tech Stack

- **Framework**: Next.js
- **Database**: PostgreSQL (TigerData)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Domain**: https://interlinedlist.com

## Prerequisites

- **Node.js**: Version 20.19+, 22.12+, or 24.0+ (required for Prisma)
  - Check your version: `node --version`
  - If using nvm: `nvm use` (uses .nvmrc file)
- **npm**: Latest version
- **Docker** and **Docker Compose**: For local database development
- **PostgreSQL database**: TigerData instance (for production)

## Getting Started

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/[username]/interlinedlist.git
   cd interlinedlist
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up local database with Docker

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

4. Set up environment variables

   ```bash
   cp .env.example .env.local
   ```

   The `.env.local` file is already configured for local Docker development.
   For production, update `DATABASE_URL` with your TigerData connection string.

5. Start development server

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Database

### Local Development (Docker)

- `docker-compose up -d postgres` - Start PostgreSQL container
- `docker-compose down` - Stop PostgreSQL container
- `docker-compose logs postgres` - View database logs
- `docker-compose exec postgres psql -U interlinedlist -d interlinedlist` - Access database CLI

### Database Commands

- `npm run db:migrate` - Run database migrations (development)
- `npm run db:migrate:deploy` - Deploy migrations (production)
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database (development only)

### Migrating to TigerData

When ready to deploy to production with TigerData:

1. Update `DATABASE_URL` in `.env.local` with your TigerData connection string
2. Run migrations: `npm run db:migrate:deploy`
3. Verify connection: `npx prisma studio` (will connect to TigerData)

The same Prisma schema and migrations work seamlessly with both local Docker and TigerData PostgreSQL instances.

## Project Structure

```
interlinedlist/
├── app/              # Next.js app directory (pages, layouts)
├── components/       # React components
├── lib/              # Utility functions and configurations
├── types/            # TypeScript type definitions
├── utils/            # Helper functions
├── prisma/           # Prisma schema and migrations
├── public/           # Static assets
└── planning/         # Project planning documents
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- OAuth provider credentials (Google, GitHub, Mastodon, Blue Sky)

## License

MIT
