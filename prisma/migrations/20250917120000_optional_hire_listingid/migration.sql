-- AlterEnum
BEGIN;
CREATE TYPE "FamilyDocumentType_new" AS ENUM ('MEDICAL_RECORD', 'INSURANCE_DOCUMENT', 'PHOTO', 'VIDEO', 'LEGAL_DOCUMENT', 'PERSONAL_DOCUMENT', 'OTHER');
ALTER TABLE "FamilyDocument" ALTER COLUMN "type" TYPE "FamilyDocumentType_new" USING ("type"::text::"FamilyDocumentType_new");
ALTER TYPE "FamilyDocumentType" RENAME TO "FamilyDocumentType_old";
ALTER TYPE "FamilyDocumentType_new" RENAME TO "FamilyDocumentType";
DROP TYPE "FamilyDocumentType_old";
COMMIT;

-- DropIndex
DROP INDEX "FamilyMember_familyId_userId_key";

-- AlterTable
ALTER TABLE "MarketplaceHire" ALTER COLUMN "listingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EmergencyPreference" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "residentId" TEXT,
    "escalationChain" JSONB NOT NULL,
    "notifyMethods" TEXT[],
    "careInstructions" TEXT,
    "lastConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyPreference_familyId_idx" ON "EmergencyPreference"("familyId");

-- CreateIndex
CREATE INDEX "EmergencyPreference_residentId_idx" ON "EmergencyPreference"("residentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyPreference_familyId_residentId_key" ON "EmergencyPreference"("familyId", "residentId");

-- AddForeignKey
ALTER TABLE "EmergencyPreference" ADD CONSTRAINT "EmergencyPreference_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPreference" ADD CONSTRAINT "EmergencyPreference_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

