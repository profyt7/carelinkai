-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "downloadUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedById" TEXT NOT NULL,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportHistory_exportedById_idx" ON "ExportHistory"("exportedById");

-- CreateIndex
CREATE INDEX "ExportHistory_exportType_idx" ON "ExportHistory"("exportType");

-- CreateIndex
CREATE INDEX "ExportHistory_createdAt_idx" ON "ExportHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
