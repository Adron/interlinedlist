# prisma — STRICT additive-only migration workflow

Violating this has broken production before. A PreToolUse hook
(`.claude/hooks/guard-migrations.sh`) blocks the dangerous CLI forms, but the
discipline is yours to keep.

- **Never** run `prisma migrate dev`, `prisma db push`, or raw DDL / `$executeRawUnsafe` against the database.
- Every schema change = edit `prisma/schema.prisma` **and** hand-write `prisma/migrations/<timestamp>_<desc>/migration.sql`.
- Migration SQL must be **idempotent**:
  - `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`
  - FKs wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  - No `DROP` / `TRUNCATE` / destructive `ALTER` without explicit user approval.
- Apply to **both** databases: `npm run db:migrate` (localhost, reads `.env.local`) **and** `npm run db:migrate:deploy` (remote, reads `.env`).
- After a schema change: `rm -rf .next && npx prisma generate && npm run dev`.
- `vercel-build` runs `migrate-deploy.js` automatically on deploy, so a missing/committed-wrong migration ships a broken schema.

Route all schema/migration work to the **db-migrations** agent or `/db-migrations` skill — never fold it into a feature change.
