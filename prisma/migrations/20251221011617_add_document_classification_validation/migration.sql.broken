-- AlterEnum: Update DocumentType enum with new values
-- Step 1: Create new enum type with updated values
DO $$ BEGIN
    CREATE TYPE "DocumentType_new" AS ENUM (
        'MEDICAL_RECORD',
        'INSURANCE',
        'IDENTIFICATION',
        'FINANCIAL',
        'LEGAL',
        'ASSESSMENT_FORM',
        'EMERGENCY_CONTACT',
        'GENERAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Alter table to use new enum type (with mapping for renamed values)
ALTER TABLE "Document" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" 
    USING (
        CASE "type"::text
            WHEN 'INSURANCE_CARD' THEN 'INSURANCE'::text
            WHEN 'ID_DOCUMENT' THEN 'IDENTIFICATION'::text
            WHEN 'CONTRACT' THEN 'LEGAL'::text
            WHEN 'CARE_PLAN' THEN 'ASSESSMENT_FORM'::text
            WHEN 'OTHER' THEN 'GENERAL'::text
            ELSE "type"::text
        END
    )::"DocumentType_new";

-- Step 3: Drop old enum and rename new one
DROP TYPE IF EXISTS "DocumentType";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";

-- Step 4: Restore default if needed (currently no default)

-- CreateEnum: ValidationStatus
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'NEEDS_REVIEW');

-- CreateEnum: ReviewStatus
CREATE TYPE "ReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_REVIEW', 'REVIEWED');

-- AlterTable: Add new classification and validation columns to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "classificationConfidence" DOUBLE PRECISION;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "classificationReasoning" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "autoClassified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "validationErrors" JSONB;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- CreateIndex: Add indexes for new columns
CREATE INDEX IF NOT EXISTS "Document_validationStatus_idx" ON "Document"("validationStatus");
CREATE INDEX IF NOT EXISTS "Document_reviewStatus_idx" ON "Document"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Document_reviewedById_idx" ON "Document"("reviewedById");
CREATE INDEX IF NOT EXISTS "Document_autoClassified_idx" ON "Document"("autoClassified");

-- AddForeignKey: Add foreign key for reviewedById
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Document_reviewedById_fkey'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedById_fkey" 
            FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
