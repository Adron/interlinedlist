-- AlterTable
ALTER TABLE "users" ADD COLUMN "customerStatus" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "stripeCustomerId" TEXT;
