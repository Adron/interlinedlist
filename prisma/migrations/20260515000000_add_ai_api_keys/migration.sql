-- AddColumn: openaiApiKey (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "openaiApiKey" TEXT;

-- AddColumn: anthropicApiKey (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anthropicApiKey" TEXT;
