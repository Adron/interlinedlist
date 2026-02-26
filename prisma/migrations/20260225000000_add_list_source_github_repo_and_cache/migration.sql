-- AlterTable
ALTER TABLE "lists" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "lists" ADD COLUMN "githubRepo" TEXT;

-- CreateTable
CREATE TABLE "list_github_issue_cache" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "issueData" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_github_issue_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lists_source_idx" ON "lists"("source");

-- CreateIndex
CREATE UNIQUE INDEX "list_github_issue_cache_listId_issueNumber_key" ON "list_github_issue_cache"("listId", "issueNumber");

-- CreateIndex
CREATE INDEX "list_github_issue_cache_listId_idx" ON "list_github_issue_cache"("listId");

-- AddForeignKey
ALTER TABLE "list_github_issue_cache" ADD CONSTRAINT "list_github_issue_cache_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
