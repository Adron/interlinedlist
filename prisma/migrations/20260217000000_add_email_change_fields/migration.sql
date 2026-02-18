-- AlterTable (idempotent: IF NOT EXISTS prevents error when columns already exist)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailChangeToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailChangeExpires" TIMESTAMP(3);
