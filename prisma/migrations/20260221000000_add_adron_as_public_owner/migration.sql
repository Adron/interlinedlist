-- Data migration: Set Adron (adronhall@proton.me) as owner of "The Public" organization
-- Purely additive: only updates existing membership; no schema changes
-- Safe to run multiple times (idempotent)
UPDATE "user_organizations"
SET "role" = 'owner'
WHERE "userId" = (SELECT "id" FROM "users" WHERE "email" = 'adronhall@proton.me' LIMIT 1)
  AND "organizationId" = (SELECT "id" FROM "organizations" WHERE "name" = 'The Public' AND "deletedAt" IS NULL LIMIT 1);
