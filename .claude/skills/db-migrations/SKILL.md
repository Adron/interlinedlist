---
name: db-migrations
description: >-
  Step-by-step workflow for all Prisma schema changes in InterlinedList.
  Enforces additive-only migrations via npm scripts. Use whenever a field,
  table, index, or relation needs to be added to the database.
---

# Database migration skill (InterlinedList)

## Cardinal rules — read before touching anything

| Rule | Detail |
|------|--------|
| **No direct DB mutation** | Never use `prisma db push`, `$executeRawUnsafe` for DDL, or any out-of-band SQL to change the schema. |
| **npm scripts only** | `npm run db:migrate` (local → localhost) · `npm run db:migrate:neon` (local → Neon) · `npm run db:migrate:deploy` (production/Vercel). Never invoke `prisma migrate *` commands directly. |
| **Additive only** | Every migration adds things (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). Nothing removes or renames without explicit approval. |
| **Idempotent SQL** | Every statement must be safe to re-run. See patterns below. |

## Step-by-step workflow

### 1. Schema edit
Open `prisma/schema.prisma` and make the minimal additive change:
- Add new optional fields (`String?`, `Int?`, `Boolean?`, etc.)
- Add new models or relations
- Add indexes (`@@index`)

### 2. Write the migration file

Create a new directory:
```
prisma/migrations/<YYYYMMDDHHMMSS>_<description>/migration.sql
```

Timestamp: current date + time in `YYYYMMDDHHMMSS` format. If multiple migrations share a date, increment the time portion (e.g. `20260515000001`).

**Idempotent SQL patterns:**

```sql
-- Add column (safe to re-run)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "myField" TEXT;

-- Add NOT NULL column with a default
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "count" INTEGER NOT NULL DEFAULT 0;

-- Create table
CREATE TABLE IF NOT EXISTS "my_table" (
    "id" TEXT NOT NULL,
    CONSTRAINT "my_table_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX IF NOT EXISTS "my_table_userId_idx" ON "my_table"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "my_table_unique_idx" ON "my_table"("col1", "col2");

-- Add foreign key (idempotent via exception handler)
DO $$
BEGIN
    ALTER TABLE "my_table"
        ADD CONSTRAINT "my_table_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
```

**Never write:**
```sql
-- BAD — not idempotent, breaks on re-run
ALTER TABLE "users" ADD COLUMN "myField" TEXT;
DROP TABLE "old_table";
ALTER TABLE "users" DROP COLUMN "deprecated";
ALTER TABLE "users" RENAME COLUMN "old" TO "new";
```

### 3. Apply to the correct database(s)

**Which script to use:**

| Target | Script | Notes |
|--------|--------|-------|
| Local (`localhost:5432`) | `npm run db:migrate` | Uses `.env.local` DATABASE_URL |
| Neon (from local machine) | `npm run db:migrate:neon` | Reads `.env` only, ignores `.env.local` |
| Vercel / production | `npm run db:migrate:deploy` | Run in CI; `.env.local` absent, uses `.env` |

> **Why two Neon scripts?** `db:migrate` and `db:migrate:deploy` both load `.env.local` which overrides `DATABASE_URL` to `localhost:5432`. On a local machine, use `db:migrate:neon` to target Neon explicitly. On Vercel, `.env.local` is absent, so `db:migrate:deploy` correctly targets Neon.

After running, confirm the output shows the migration applied successfully. If the script prompts to reset the database, **stop and investigate** — do not proceed.

### 4. Update application code

After a schema change, check and update:
- `lib/auth/session.ts` — add new fields to `userSelect` if the `User` model changed
- `lib/auth/sync-token.ts` — add new fields to the fallback return object if `User` changed
- Any Prisma queries that need the new fields in their `select`

### 5. Type-check
```bash
npx tsc --noEmit
```

Fix all new TypeScript errors before considering the migration done.

### 6. Commit
Commit `prisma/schema.prisma` and the new `prisma/migrations/` directory together in one commit. Never commit a schema change without its matching migration file, and never commit a migration file without the matching schema change.

### 7. Production
A human runs `npm run db:migrate:deploy` in the production environment after the commit is merged. The migration's idempotent SQL means it is safe to apply even if some DDL already exists.

## Destructive changes — explicit approval required

If a destructive change is ever needed (removing a column, dropping a table, changing a type), follow this multi-step process and **get explicit user approval for each step**:

1. **Deprecate in code** — stop writing to the column/table; continue reading.
2. **Backfill / migrate data** — write a migration that moves data to the new location.
3. **Remove reads** — update all application code to no longer reference the old column.
4. **Drop in a final migration** — only after the above steps are deployed and verified.

Never collapse these into a single migration.

## Quick reference — what NOT to do

- `prisma db push` — bypasses migration history; schema state becomes untracked
- `prisma migrate dev` directly — use `npm run db:migrate` which wraps it safely
- `$executeRawUnsafe` for DDL — leaves no migration record; schema and history diverge
- Bare `ALTER TABLE ADD COLUMN` without `IF NOT EXISTS` — breaks idempotency
- `DROP`, `TRUNCATE`, `RENAME` without explicit approval — data loss risk
