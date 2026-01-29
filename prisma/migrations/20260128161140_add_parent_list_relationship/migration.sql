-- AlterTable
ALTER TABLE "lists" ADD COLUMN "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "lists_parentId_idx" ON "lists"("parentId");
