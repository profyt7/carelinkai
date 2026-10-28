-- Idempotent migration to add fields to AssessmentResult and ResidentIncident tables
-- This migration can be run multiple times safely

-- ==================== AssessmentResult Table ====================

-- Add status column to AssessmentResult
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='status') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "status" TEXT;
    END IF;
END $$;

-- Add conductedBy column to AssessmentResult
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='conductedBy') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "conductedBy" TEXT;
    END IF;
END $$;

-- Add or modify conductedAt column to AssessmentResult
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='conductedAt') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ELSE
        -- If column exists, ensure it has the default value
        ALTER TABLE "AssessmentResult" ALTER COLUMN "conductedAt" SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add notes column to AssessmentResult
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='notes') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "notes" TEXT;
    END IF;
END $$;

-- Add recommendations column to AssessmentResult
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='recommendations') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "recommendations" TEXT;
    END IF;
END $$;

-- ==================== ResidentIncident Table ====================

-- Add status column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='status') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'REPORTED';
    END IF;
END $$;

-- Add location column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='location') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "location" TEXT;
    END IF;
END $$;

-- Add reportedBy column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='reportedBy') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "reportedBy" TEXT;
    END IF;
END $$;

-- Add reportedAt column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='reportedAt') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add witnessedBy column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='witnessedBy') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "witnessedBy" TEXT;
    END IF;
END $$;

-- Add actionsTaken column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='actionsTaken') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "actionsTaken" TEXT;
    END IF;
END $$;

-- Add followUpRequired column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='followUpRequired') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "followUpRequired" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add resolutionNotes column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='resolutionNotes') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "resolutionNotes" TEXT;
    END IF;
END $$;

-- Add resolvedAt column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='resolvedAt') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "resolvedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add resolvedBy column to ResidentIncident
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ResidentIncident' AND column_name='resolvedBy') THEN
        ALTER TABLE "ResidentIncident" ADD COLUMN "resolvedBy" TEXT;
    END IF;
END $$;

-- ==================== Create Indexes (Idempotent) ====================

-- Create indexes for AssessmentResult if they don't exist
CREATE INDEX IF NOT EXISTS "AssessmentResult_conductedAt_idx" ON "AssessmentResult"("conductedAt");
CREATE INDEX IF NOT EXISTS "AssessmentResult_type_idx" ON "AssessmentResult"("type");
CREATE INDEX IF NOT EXISTS "AssessmentResult_status_idx" ON "AssessmentResult"("status");

-- Create indexes for ResidentIncident if they don't exist
CREATE INDEX IF NOT EXISTS "ResidentIncident_type_idx" ON "ResidentIncident"("type");
CREATE INDEX IF NOT EXISTS "ResidentIncident_severity_idx" ON "ResidentIncident"("severity");
CREATE INDEX IF NOT EXISTS "ResidentIncident_status_idx" ON "ResidentIncident"("status");
CREATE INDEX IF NOT EXISTS "ResidentIncident_reportedAt_idx" ON "ResidentIncident"("reportedAt");
