-- AlterTable
ALTER TABLE "messages" ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "scheduledCrossPostConfig" JSONB;

-- CreateIndex
CREATE INDEX "messages_scheduledAt_idx" ON "messages"("scheduledAt");
