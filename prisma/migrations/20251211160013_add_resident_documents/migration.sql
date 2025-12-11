-- CreateEnum
CREATE TYPE "ResidentDocumentType" AS ENUM ('MEDICAL_RECORD', 'CARE_PLAN', 'INSURANCE', 'ADVANCE_DIRECTIVE', 'MEDICATION_LIST', 'ASSESSMENT_REPORT', 'INCIDENT_REPORT', 'PHOTO_ID', 'EMERGENCY_CONTACT', 'OTHER');

-- CreateTable
CREATE TABLE "ResidentDocument" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "documentType" "ResidentDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentDocument_residentId_idx" ON "ResidentDocument"("residentId");

-- CreateIndex
CREATE INDEX "ResidentDocument_documentType_idx" ON "ResidentDocument"("documentType");

-- CreateIndex
CREATE INDEX "ResidentDocument_uploadedById_idx" ON "ResidentDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "ResidentDocument_uploadedAt_idx" ON "ResidentDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
