-- User notifications + tray limit (idempotent).
-- Safe if notificationTrayLimit or user_notifications already exist (e.g. after `prisma db push`).
-- If this migration previously failed with P3018 / 42701, run once against production:
--   npx prisma migrate resolve --rolled-back 20260326120000_add_user_notifications
-- then: npm run db:migrate:deploy

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationTrayLimit" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "type" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_notifications_userId_readAt_createdAt_idx" ON "user_notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");

-- AddForeignKey (skip if constraint already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_notifications_userId_fkey'
  ) THEN
    ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
