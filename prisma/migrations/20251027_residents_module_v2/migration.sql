-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL', 'CARE_TEAM', 'FAMILY');

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" INTEGER,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentIncident" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionFitScore" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionFitScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentNote" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "content" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentResult_residentId_idx" ON "AssessmentResult"("residentId");

-- CreateIndex
CREATE INDEX "AssessmentResult_createdAt_idx" ON "AssessmentResult"("createdAt");

-- CreateIndex
CREATE INDEX "ResidentIncident_residentId_idx" ON "ResidentIncident"("residentId");

-- CreateIndex
CREATE INDEX "ResidentIncident_occurredAt_idx" ON "ResidentIncident"("occurredAt");

-- CreateIndex
CREATE INDEX "ComplianceRecord_residentId_idx" ON "ComplianceRecord"("residentId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_status_idx" ON "ComplianceRecord"("status");

-- CreateIndex
CREATE INDEX "ComplianceRecord_dueDate_idx" ON "ComplianceRecord"("dueDate");

-- CreateIndex
CREATE INDEX "AdmissionFitScore_residentId_idx" ON "AdmissionFitScore"("residentId");

-- CreateIndex
CREATE INDEX "AdmissionFitScore_createdAt_idx" ON "AdmissionFitScore"("createdAt");

-- CreateIndex
CREATE INDEX "ResidentNote_residentId_idx" ON "ResidentNote"("residentId");

-- CreateIndex
CREATE INDEX "ResidentNote_createdByUserId_idx" ON "ResidentNote"("createdByUserId");

-- CreateIndex
CREATE INDEX "ResidentNote_visibility_idx" ON "ResidentNote"("visibility");

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentIncident" ADD CONSTRAINT "ResidentIncident_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionFitScore" ADD CONSTRAINT "AdmissionFitScore_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentNote" ADD CONSTRAINT "ResidentNote_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentNote" ADD CONSTRAINT "ResidentNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

