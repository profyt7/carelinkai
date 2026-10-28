-- Phase 1A Part 2: Add Columns and Tables
-- This migration adds columns and tables after enum values are committed

-- ========== STEP 1: Add new columns to Document table ==========

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extractedText" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extractedData" JSONB;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extractionStatus" "ExtractionStatus" DEFAULT 'PENDING'::"ExtractionStatus";
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "extractionError" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN DEFAULT false;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "expirationDate" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "complianceStatus" "ComplianceStatus" DEFAULT 'PENDING'::"ComplianceStatus";
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "inquiryId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;

-- ========== STEP 2: Populate required fields from existing data ==========

UPDATE "Document" SET 
  "fileName" = COALESCE("title", 'Untitled Document'),
  "mimeType" = COALESCE("fileType", 'application/octet-stream'),
  "extractionStatus" = COALESCE("extractionStatus", 'PENDING'::"ExtractionStatus"),
  "complianceStatus" = COALESCE("complianceStatus", 'PENDING'::"ComplianceStatus")
WHERE "fileName" IS NULL 
   OR "mimeType" IS NULL 
   OR "extractionStatus" IS NULL 
   OR "complianceStatus" IS NULL;

-- ========== STEP 3: Make enum columns non-nullable ==========

ALTER TABLE "Document" ALTER COLUMN "extractionStatus" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "complianceStatus" SET NOT NULL;

-- ========== STEP 4: Create DocumentTemplate table ==========

CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "DocumentType" NOT NULL,
  "template" JSONB NOT NULL,
  "fields" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- ========== STEP 5: Add foreign key constraints ==========

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Document_inquiryId_fkey'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_inquiryId_fkey" 
          FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Document_uploadedById_fkey'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" 
          FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ========== STEP 6: Create indexes ==========

CREATE INDEX IF NOT EXISTS "Document_inquiryId_idx" ON "Document"("inquiryId");
CREATE INDEX IF NOT EXISTS "Document_complianceStatus_idx" ON "Document"("complianceStatus");
CREATE INDEX IF NOT EXISTS "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX IF NOT EXISTS "Document_expirationDate_idx" ON "Document"("expirationDate");
CREATE INDEX IF NOT EXISTS "Document_extractionStatus_idx" ON "Document"("extractionStatus");

CREATE INDEX IF NOT EXISTS "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");
