-- CreateTable
CREATE TABLE "list_connections" (
    "id" TEXT NOT NULL,
    "fromListId" TEXT NOT NULL,
    "toListId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_connections_fromListId_toListId_key" ON "list_connections"("fromListId", "toListId");

-- CreateIndex
CREATE INDEX "list_connections_fromListId_idx" ON "list_connections"("fromListId");

-- CreateIndex
CREATE INDEX "list_connections_toListId_idx" ON "list_connections"("toListId");

-- AddForeignKey
ALTER TABLE "list_connections" ADD CONSTRAINT "list_connections_fromListId_fkey" FOREIGN KEY ("fromListId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_connections" ADD CONSTRAINT "list_connections_toListId_fkey" FOREIGN KEY ("toListId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
