-- CreateTable
CREATE TABLE "sync_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'CLI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_tokens_tokenHash_key" ON "sync_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "sync_tokens_userId_idx" ON "sync_tokens"("userId");

-- AddForeignKey
ALTER TABLE "sync_tokens" ADD CONSTRAINT "sync_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
