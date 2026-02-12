-- CreateTable
CREATE TABLE "linked_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerUsername" TEXT,
    "providerData" JSONB,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "linked_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linked_identities_userId_provider_key" ON "linked_identities"("userId", "provider");

-- CreateIndex
CREATE INDEX "linked_identities_provider_providerUserId_idx" ON "linked_identities"("provider", "providerUserId");

-- AddForeignKey
ALTER TABLE "linked_identities" ADD CONSTRAINT "linked_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
