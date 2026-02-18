-- AlterTable
ALTER TABLE "users" ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "emailChangeToken" TEXT,
ADD COLUMN "emailChangeExpires" TIMESTAMP(3);
