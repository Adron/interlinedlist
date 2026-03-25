-- AlterTable
ALTER TABLE "messages" ADD COLUMN "digCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "message_digs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_digs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_digs_userId_messageId_key" ON "message_digs"("userId", "messageId");

-- CreateIndex
CREATE INDEX "message_digs_messageId_idx" ON "message_digs"("messageId");

-- AddForeignKey
ALTER TABLE "message_digs" ADD CONSTRAINT "message_digs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_digs" ADD CONSTRAINT "message_digs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
