-- AlterTable: Add archivedAt field to Resident model for soft delete
ALTER TABLE "Resident" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex: Add index on archivedAt for efficient filtering
CREATE INDEX "Resident_archivedAt_idx" ON "Resident"("archivedAt");
