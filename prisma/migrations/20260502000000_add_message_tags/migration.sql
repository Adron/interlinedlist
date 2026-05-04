-- Add tags column to messages table
ALTER TABLE "messages" ADD COLUMN "tags" JSONB;
