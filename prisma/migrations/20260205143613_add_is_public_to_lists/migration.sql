-- AlterTable
ALTER TABLE "lists" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "lists_isPublic_idx" ON "lists"("isPublic");
