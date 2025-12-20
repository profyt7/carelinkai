-- Feature #6: Smart Document Processing & Compliance
-- This migration adds Document and DocumentTemplate models

-- Create enums for document processing
CREATE TYPE "DocumentType" AS ENUM (
  'MEDICAL_RECORD',
  'INSURANCE_CARD',
  'ID_DOCUMENT',
  'CONTRACT',
  'FINANCIAL',
  'CARE_PLAN',
  'EMERGENCY_CONTACT',
  'OTHER'
);

CREATE TYPE "ExtractionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "ComplianceStatus" AS ENUM (
  'PENDING',
  'COMPLIANT',
  'MISSING',
  'EXPIRED',
  'EXPIRING_SOON'
);

-- Create Document table
CREATE TABLE "Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" "DocumentType" NOT NULL,
  "category" TEXT,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  
  -- OCR & AI Extraction
  "extractedText" TEXT,
  "extractedData" JSONB,
  "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "extractionError" TEXT,
  
  -- Compliance Tracking
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "expirationDate" TIMESTAMP(3),
  "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
  
  -- Relationships
  "residentId" TEXT,
  "inquiryId" TEXT,
  "uploadedById" TEXT NOT NULL,
  
  -- Metadata & Organization
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT "Document_residentId_fkey" FOREIGN KEY ("residentId") 
    REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Document_inquiryId_fkey" FOREIGN KEY ("inquiryId") 
    REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") 
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create DocumentTemplate table
CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "DocumentType" NOT NULL,
  "template" JSONB NOT NULL,
  "fields" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for Document table
CREATE INDEX "Document_residentId_idx" ON "Document"("residentId");
CREATE INDEX "Document_inquiryId_idx" ON "Document"("inquiryId");
CREATE INDEX "Document_type_idx" ON "Document"("type");
CREATE INDEX "Document_complianceStatus_idx" ON "Document"("complianceStatus");
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
CREATE INDEX "Document_expirationDate_idx" ON "Document"("expirationDate");

-- Create indexes for DocumentTemplate table
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- Note: The User.documentsUploaded relation doesn't require a separate migration
-- as it's just the inverse side of the Document.uploadedBy relation
