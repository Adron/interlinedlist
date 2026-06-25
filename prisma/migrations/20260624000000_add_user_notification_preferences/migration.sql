-- AddColumn: notificationPreferences (idempotent)
-- Nullable JSON column storing per-event notification delivery preferences.
-- NULL/absent means every channel is treated as enabled (preserves current behavior; no backfill needed).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;
