-- CreateTable
CREATE TABLE "list_watchers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_watchers_userId_listId_key" ON "list_watchers"("userId", "listId");

-- CreateIndex
CREATE INDEX "list_watchers_userId_idx" ON "list_watchers"("userId");

-- CreateIndex
CREATE INDEX "list_watchers_listId_idx" ON "list_watchers"("listId");

-- AddForeignKey
ALTER TABLE "list_watchers" ADD CONSTRAINT "list_watchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_watchers" ADD CONSTRAINT "list_watchers_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
