-- AlterTable: Add isPrivateAccount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'isPrivateAccount'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "isPrivateAccount" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- CreateTable: Create follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "follows_followerId_status_idx" ON "follows"("followerId", "status");

CREATE INDEX IF NOT EXISTS "follows_followingId_status_idx" ON "follows"("followingId", "status");

CREATE INDEX IF NOT EXISTS "follows_followingId_status_createdAt_idx" ON "follows"("followingId", "status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- AddForeignKey: Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'follows_followerId_fkey'
    ) THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'follows_followingId_fkey'
    ) THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
