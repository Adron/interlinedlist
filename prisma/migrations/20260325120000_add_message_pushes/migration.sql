-- AlterTable
ALTER TABLE "messages" ADD COLUMN "pushCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "messages" ADD COLUMN "pushedMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_pushedMessageId_fkey" FOREIGN KEY ("pushedMessageId") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "messages_pushedMessageId_idx" ON "messages"("pushedMessageId");

-- At most one plain push (empty content) per user per canonical source
CREATE UNIQUE INDEX "messages_one_plain_push_per_user_source" ON "messages" ("userId", "pushedMessageId") WHERE "pushedMessageId" IS NOT NULL AND btrim("content") = '';
