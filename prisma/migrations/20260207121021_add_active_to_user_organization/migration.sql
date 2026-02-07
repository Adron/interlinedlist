-- AlterTable
ALTER TABLE "user_organizations" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "user_organizations_organizationId_active_idx" ON "user_organizations"("organizationId", "active");
