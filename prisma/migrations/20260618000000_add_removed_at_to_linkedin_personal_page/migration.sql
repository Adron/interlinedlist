-- AlterTable: add nullable removedAt column for soft-delete rediscovery semantics
ALTER TABLE "linkedin_personal_pages" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);
