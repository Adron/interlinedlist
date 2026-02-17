-- AlterTable
ALTER TABLE "messages" ADD COLUMN "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "messages_parentId_idx" ON "messages"("parentId");
