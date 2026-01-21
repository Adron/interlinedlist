-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_properties" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "propertyKey" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "validationRules" JSONB,
    "helpText" TEXT,
    "placeholder" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "visibilityCondition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_data_rows" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "rowData" JSONB NOT NULL,
    "rowNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "list_data_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lists_userId_deletedAt_idx" ON "lists"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "lists_messageId_idx" ON "lists"("messageId");

-- CreateIndex
CREATE INDEX "lists_createdAt_idx" ON "lists"("createdAt");

-- CreateIndex
CREATE INDEX "list_properties_listId_displayOrder_idx" ON "list_properties"("listId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "list_properties_listId_propertyKey_key" ON "list_properties"("listId", "propertyKey");

-- CreateIndex
CREATE INDEX "list_data_rows_listId_deletedAt_idx" ON "list_data_rows"("listId", "deletedAt");

-- CreateIndex
CREATE INDEX "list_data_rows_listId_createdAt_idx" ON "list_data_rows"("listId", "createdAt");

-- CreateIndex (GIN index for JSONB queries)
CREATE INDEX "list_data_rows_rowData_idx" ON "list_data_rows" USING GIN ("rowData");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_properties" ADD CONSTRAINT "list_properties_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_data_rows" ADD CONSTRAINT "list_data_rows_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
