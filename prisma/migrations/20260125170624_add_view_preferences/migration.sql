-- AlterTable
ALTER TABLE "users" ADD COLUMN "messagesPerPage" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "users" ADD COLUMN "viewingPreference" TEXT NOT NULL DEFAULT 'all_messages';
ALTER TABLE "users" ADD COLUMN "showPreviews" BOOLEAN NOT NULL DEFAULT true;
