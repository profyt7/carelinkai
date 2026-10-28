-- CreateEnum
CREATE TYPE "LeadTargetType" AS ENUM ('AIDE', 'PROVIDER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "careNotes" TEXT,
ADD COLUMN     "mobilityLevel" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "primaryContactName" TEXT,
ADD COLUMN     "primaryDiagnosis" TEXT,
ADD COLUMN     "recipientAge" INTEGER,
ADD COLUMN     "relationshipToRecipient" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "targetType" "LeadTargetType" NOT NULL,
    "aideId" TEXT,
    "providerId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "message" TEXT,
    "preferredStartDate" TIMESTAMP(3),
    "expectedHoursPerWeek" INTEGER,
    "location" TEXT,
    "operatorNotes" TEXT,
    "assignedOperatorId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_familyId_idx" ON "Lead"("familyId");

-- CreateIndex
CREATE INDEX "Lead_targetType_idx" ON "Lead"("targetType");

-- CreateIndex
CREATE INDEX "Lead_aideId_idx" ON "Lead"("aideId");

-- CreateIndex
CREATE INDEX "Lead_providerId_idx" ON "Lead"("providerId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_assignedOperatorId_idx" ON "Lead"("assignedOperatorId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_aideId_fkey" FOREIGN KEY ("aideId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedOperatorId_fkey" FOREIGN KEY ("assignedOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
