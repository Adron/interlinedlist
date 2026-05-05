-- Add tags column to messages table (idempotent: column may already exist from drift or prior partial apply)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tags" JSONB;
