-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_organizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_isPublic_deletedAt_idx" ON "organizations"("isPublic", "deletedAt");

-- CreateIndex
CREATE INDEX "organizations_isSystem_idx" ON "organizations"("isSystem");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_deletedAt_idx" ON "organizations"("deletedAt");

-- CreateIndex
CREATE INDEX "user_organizations_userId_idx" ON "user_organizations"("userId");

-- CreateIndex
CREATE INDEX "user_organizations_organizationId_idx" ON "user_organizations"("organizationId");

-- CreateIndex
CREATE INDEX "user_organizations_userId_role_idx" ON "user_organizations"("userId", "role");

-- CreateIndex
CREATE INDEX "user_organizations_organizationId_role_idx" ON "user_organizations"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_organizations_userId_organizationId_key" ON "user_organizations"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create "The Public" system organization (idempotent - won't fail if already exists)
INSERT INTO "organizations" ("id", "name", "slug", "description", "isPublic", "isSystem", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Public',
  'the-public',
  'The default public organization that all users belong to.',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO NOTHING;

-- Add all existing users to "The Public" organization (idempotent - won't fail if users already members)
INSERT INTO "user_organizations" ("id", "userId", "organizationId", "role", "joinedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  "id",
  '00000000-0000-0000-0000-000000000001',
  'member',
  NOW(),
  NOW(),
  NOW()
FROM "users"
ON CONFLICT ("userId", "organizationId") DO NOTHING;
