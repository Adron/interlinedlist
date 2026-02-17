-- AlterTable
ALTER TABLE "users" ADD COLUMN "cleared" BOOLEAN NOT NULL DEFAULT false;

-- Set existing users to cleared
UPDATE "users" SET "cleared" = true;
