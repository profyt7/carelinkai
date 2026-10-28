-- AlterTable: Add new fields to AssessmentResult
ALTER TABLE "AssessmentResult" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "AssessmentResult" ADD COLUMN IF NOT EXISTS "conductedBy" TEXT;
ALTER TABLE "AssessmentResult" ALTER COLUMN "conductedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AssessmentResult" ADD COLUMN IF NOT EXISTS "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AssessmentResult" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "AssessmentResult" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;

-- AlterTable: Add new fields to ResidentIncident
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'REPORTED';
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "reportedBy" TEXT;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "witnessedBy" TEXT;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "actionsTaken" TEXT;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "followUpRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "ResidentIncident" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;

-- CreateIndex: Add indexes for new fields
CREATE INDEX IF NOT EXISTS "AssessmentResult_conductedAt_idx" ON "AssessmentResult"("conductedAt");
CREATE INDEX IF NOT EXISTS "AssessmentResult_type_idx" ON "AssessmentResult"("type");
CREATE INDEX IF NOT EXISTS "AssessmentResult_status_idx" ON "AssessmentResult"("status");

CREATE INDEX IF NOT EXISTS "ResidentIncident_type_idx" ON "ResidentIncident"("type");
CREATE INDEX IF NOT EXISTS "ResidentIncident_severity_idx" ON "ResidentIncident"("severity");
CREATE INDEX IF NOT EXISTS "ResidentIncident_status_idx" ON "ResidentIncident"("status");
CREATE INDEX IF NOT EXISTS "ResidentIncident_reportedAt_idx" ON "ResidentIncident"("reportedAt");
