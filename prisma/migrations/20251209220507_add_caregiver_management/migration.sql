-- Phase 6: Core Caregiver Management
-- Idempotent migration for adding caregiver management features

-- Create enums if they don't exist
DO $$ BEGIN
  -- CertificationType enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationType') THEN
    CREATE TYPE "CertificationType" AS ENUM ('CNA', 'HHA', 'CPR', 'FIRST_AID', 'MEDICATION_ADMINISTRATION', 'DEMENTIA_CARE', 'ALZHEIMERS_CARE', 'HOSPICE_CARE', 'WOUND_CARE', 'IV_THERAPY', 'OTHER');
  END IF;

  -- CertificationStatus enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationStatus') THEN
    CREATE TYPE "CertificationStatus" AS ENUM ('CURRENT', 'EXPIRING_SOON', 'EXPIRED');
  END IF;

  -- EmploymentType enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentType') THEN
    CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'PER_DIEM', 'CONTRACT');
  END IF;

  -- EmploymentStatus enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentStatus') THEN
    CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');
  END IF;

  -- CaregiverDocumentType enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaregiverDocumentType') THEN
    CREATE TYPE "CaregiverDocumentType" AS ENUM ('CERTIFICATION', 'BACKGROUND_CHECK', 'TRAINING', 'CONTRACT', 'IDENTIFICATION', 'REFERENCE', 'OTHER');
  END IF;
END $$;

-- Add new fields to Caregiver table
DO $$ BEGIN
  -- languages field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Caregiver' AND column_name = 'languages') THEN
    ALTER TABLE "Caregiver" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- employmentType field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Caregiver' AND column_name = 'employmentType') THEN
    ALTER TABLE "Caregiver" ADD COLUMN "employmentType" "EmploymentType";
  END IF;

  -- employmentStatus field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Caregiver' AND column_name = 'employmentStatus') THEN
    ALTER TABLE "Caregiver" ADD COLUMN "employmentStatus" "EmploymentStatus" DEFAULT 'ACTIVE';
  END IF;

  -- hireDate field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Caregiver' AND column_name = 'hireDate') THEN
    ALTER TABLE "Caregiver" ADD COLUMN "hireDate" TIMESTAMP(3);
  END IF;

  -- photoUrl field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Caregiver' AND column_name = 'photoUrl') THEN
    ALTER TABLE "Caregiver" ADD COLUMN "photoUrl" TEXT;
  END IF;
END $$;

-- Create CaregiverCertification table
CREATE TABLE IF NOT EXISTS "CaregiverCertification" (
  "id" TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "certificationType" "CertificationType" NOT NULL,
  "certificationName" TEXT,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "certificationNumber" TEXT,
  "issuingOrganization" TEXT,
  "documentUrl" TEXT,
  "status" "CertificationStatus" NOT NULL DEFAULT 'CURRENT',
  "notes" TEXT,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaregiverCertification_pkey" PRIMARY KEY ("id")
);

-- Create CaregiverAssignment table
CREATE TABLE IF NOT EXISTS "CaregiverAssignment" (
  "id" TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "notes" TEXT,
  "assignedBy" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaregiverAssignment_pkey" PRIMARY KEY ("id")
);

-- Create CaregiverDocument table
CREATE TABLE IF NOT EXISTS "CaregiverDocument" (
  "id" TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "documentType" "CaregiverDocumentType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "documentUrl" TEXT NOT NULL,
  "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP(3),
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaregiverDocument_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Caregiver table
CREATE INDEX IF NOT EXISTS "Caregiver_employmentStatus_idx" ON "Caregiver"("employmentStatus");
CREATE INDEX IF NOT EXISTS "Caregiver_employmentType_idx" ON "Caregiver"("employmentType");

-- Create indexes for CaregiverCertification table
CREATE INDEX IF NOT EXISTS "CaregiverCertification_caregiverId_idx" ON "CaregiverCertification"("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverCertification_status_idx" ON "CaregiverCertification"("status");
CREATE INDEX IF NOT EXISTS "CaregiverCertification_expiryDate_idx" ON "CaregiverCertification"("expiryDate");
CREATE INDEX IF NOT EXISTS "CaregiverCertification_certificationType_idx" ON "CaregiverCertification"("certificationType");

-- Create indexes for CaregiverAssignment table
CREATE INDEX IF NOT EXISTS "CaregiverAssignment_caregiverId_idx" ON "CaregiverAssignment"("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverAssignment_residentId_idx" ON "CaregiverAssignment"("residentId");
CREATE INDEX IF NOT EXISTS "CaregiverAssignment_isPrimary_idx" ON "CaregiverAssignment"("isPrimary");
CREATE INDEX IF NOT EXISTS "CaregiverAssignment_startDate_idx" ON "CaregiverAssignment"("startDate");
CREATE INDEX IF NOT EXISTS "CaregiverAssignment_endDate_idx" ON "CaregiverAssignment"("endDate");

-- Create indexes for CaregiverDocument table
CREATE INDEX IF NOT EXISTS "CaregiverDocument_caregiverId_idx" ON "CaregiverDocument"("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverDocument_documentType_idx" ON "CaregiverDocument"("documentType");
CREATE INDEX IF NOT EXISTS "CaregiverDocument_expiryDate_idx" ON "CaregiverDocument"("expiryDate");
CREATE INDEX IF NOT EXISTS "CaregiverDocument_uploadDate_idx" ON "CaregiverDocument"("uploadDate");

-- Add foreign key constraints
DO $$ BEGIN
  -- CaregiverCertification -> Caregiver
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverCertification_caregiverId_fkey') THEN
    ALTER TABLE "CaregiverCertification" ADD CONSTRAINT "CaregiverCertification_caregiverId_fkey" 
      FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- CaregiverAssignment -> Caregiver
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverAssignment_caregiverId_fkey') THEN
    ALTER TABLE "CaregiverAssignment" ADD CONSTRAINT "CaregiverAssignment_caregiverId_fkey" 
      FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- CaregiverAssignment -> Resident
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverAssignment_residentId_fkey') THEN
    ALTER TABLE "CaregiverAssignment" ADD CONSTRAINT "CaregiverAssignment_residentId_fkey" 
      FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- CaregiverDocument -> Caregiver
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverDocument_caregiverId_fkey') THEN
    ALTER TABLE "CaregiverDocument" ADD CONSTRAINT "CaregiverDocument_caregiverId_fkey" 
      FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
