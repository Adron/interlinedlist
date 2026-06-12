-- CreateTable
CREATE TABLE IF NOT EXISTS "linkedin_posting_target_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_posting_target_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "linkedin_posting_target_preferences_userId_idx" ON "linkedin_posting_target_preferences"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "linkedin_posting_target_preferences_pageId_idx" ON "linkedin_posting_target_preferences"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "linkedin_posting_target_preferences_userId_kind_pageId_key" ON "linkedin_posting_target_preferences"("userId", "kind", "pageId");

-- AddForeignKey (idempotent)
DO $$
BEGIN
    ALTER TABLE "linkedin_posting_target_preferences"
        ADD CONSTRAINT "linkedin_posting_target_preferences_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    ALTER TABLE "linkedin_posting_target_preferences"
        ADD CONSTRAINT "linkedin_posting_target_preferences_pageId_fkey"
        FOREIGN KEY ("pageId") REFERENCES "org_linkedin_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
