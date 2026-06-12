-- CreateTable
CREATE TABLE IF NOT EXISTS "linkedin_personal_pages" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "linkedInPageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageLogoUrl" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "linkedin_personal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "linkedin_personal_pages_identityId_idx" ON "linkedin_personal_pages"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "linkedin_personal_pages_identityId_linkedInPageId_key" ON "linkedin_personal_pages"("identityId", "linkedInPageId");

-- AlterTable
ALTER TABLE "linkedin_posting_target_preferences" ADD COLUMN IF NOT EXISTS "personalPageId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "linkedin_posting_target_preferences_personalPageId_idx" ON "linkedin_posting_target_preferences"("personalPageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "linkedin_posting_target_preferences_userId_kind_personalPag_key" ON "linkedin_posting_target_preferences"("userId", "kind", "personalPageId");

-- AddForeignKey (idempotent)
DO $$
BEGIN
    ALTER TABLE "linkedin_personal_pages"
        ADD CONSTRAINT "linkedin_personal_pages_identityId_fkey"
        FOREIGN KEY ("identityId") REFERENCES "linked_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    ALTER TABLE "linkedin_posting_target_preferences"
        ADD CONSTRAINT "linkedin_posting_target_preferences_personalPageId_fkey"
        FOREIGN KEY ("personalPageId") REFERENCES "linkedin_personal_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
