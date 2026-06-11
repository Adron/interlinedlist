-- CreateTable
CREATE TABLE "org_linkedin_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectedByUserId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerUsername" TEXT,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "scopesGranted" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "org_linkedin_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_linkedin_pages" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "linkedInPageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageLogoUrl" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "org_linkedin_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_linkedin_page_assignments" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_linkedin_page_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_linkedin_credentials_organizationId_key" ON "org_linkedin_credentials"("organizationId");

-- CreateIndex
CREATE INDEX "org_linkedin_credentials_organizationId_idx" ON "org_linkedin_credentials"("organizationId");

-- CreateIndex
CREATE INDEX "org_linkedin_credentials_connectedByUserId_idx" ON "org_linkedin_credentials"("connectedByUserId");

-- CreateIndex
CREATE INDEX "org_linkedin_pages_credentialId_idx" ON "org_linkedin_pages"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "org_linkedin_pages_credentialId_linkedInPageId_key" ON "org_linkedin_pages"("credentialId", "linkedInPageId");

-- CreateIndex
CREATE INDEX "org_linkedin_page_assignments_userId_idx" ON "org_linkedin_page_assignments"("userId");

-- CreateIndex
CREATE INDEX "org_linkedin_page_assignments_pageId_idx" ON "org_linkedin_page_assignments"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "org_linkedin_page_assignments_pageId_userId_key" ON "org_linkedin_page_assignments"("pageId", "userId");

-- AddForeignKey
ALTER TABLE "org_linkedin_credentials" ADD CONSTRAINT "org_linkedin_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_linkedin_credentials" ADD CONSTRAINT "org_linkedin_credentials_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_linkedin_pages" ADD CONSTRAINT "org_linkedin_pages_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "org_linkedin_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_linkedin_page_assignments" ADD CONSTRAINT "org_linkedin_page_assignments_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "org_linkedin_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_linkedin_page_assignments" ADD CONSTRAINT "org_linkedin_page_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_linkedin_page_assignments" ADD CONSTRAINT "org_linkedin_page_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
