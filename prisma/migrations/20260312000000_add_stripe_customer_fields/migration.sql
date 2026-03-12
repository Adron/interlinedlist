-- Add Stripe customer fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customerStatus" TEXT DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
