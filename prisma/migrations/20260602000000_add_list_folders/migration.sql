-- AlterTable
ALTER TABLE "lists" ADD COLUMN "folderId" TEXT;

-- CreateTable
CREATE TABLE "list_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "list_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "list_folders_userId_deletedAt_idx" ON "list_folders"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "list_folders_parentId_idx" ON "list_folders"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "list_folders_userId_parentId_name_key" ON "list_folders"("userId", "parentId", "name");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "list_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_folders" ADD CONSTRAINT "list_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_folders" ADD CONSTRAINT "list_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "list_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
