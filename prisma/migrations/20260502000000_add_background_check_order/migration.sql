-- Add checkrCandidateId to Caregiver (Checkr integration field)
ALTER TABLE "Caregiver"
  ADD COLUMN IF NOT EXISTS "checkrCandidateId" TEXT;

-- Add unique constraint only if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Caregiver_checkrCandidateId_key'
  ) THEN
    ALTER TABLE "Caregiver" ADD CONSTRAINT "Caregiver_checkrCandidateId_key" UNIQUE ("checkrCandidateId");
  END IF;
END $$;

-- New enums for BackgroundCheckOrder
DO $$ BEGIN
  CREATE TYPE "BackgroundCheckOrderer" AS ENUM ('SELF', 'FAMILY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BackgroundCheckPackage" AS ENUM ('BASIC', 'ENHANCED', 'MVR', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- BackgroundCheckOrder table
CREATE TABLE IF NOT EXISTS "BackgroundCheckOrder" (
  "id"                TEXT NOT NULL,
  "caregiverId"       TEXT NOT NULL,
  "orderedByType"     "BackgroundCheckOrderer" NOT NULL,
  "orderedByUserId"   TEXT,
  "status"            "BackgroundCheckStatus" NOT NULL DEFAULT 'PENDING',
  "packageType"       "BackgroundCheckPackage" NOT NULL DEFAULT 'BASIC',
  "checkrPackageName" TEXT NOT NULL DEFAULT 'basic',
  "checkrReportId"    TEXT,
  "reportUrl"         TEXT,
  "pricePaid"         DECIMAL(10,2),
  "stripePaymentId"   TEXT,
  "completedAt"       TIMESTAMP(3),
  "expiresAt"         TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackgroundCheckOrder_pkey" PRIMARY KEY ("id")
);

-- Foreign key
ALTER TABLE "BackgroundCheckOrder"
  ADD CONSTRAINT "BackgroundCheckOrder_caregiverId_fkey"
  FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint on checkrReportId
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BackgroundCheckOrder_checkrReportId_key'
  ) THEN
    ALTER TABLE "BackgroundCheckOrder" ADD CONSTRAINT "BackgroundCheckOrder_checkrReportId_key" UNIQUE ("checkrReportId");
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "BackgroundCheckOrder_caregiverId_idx" ON "BackgroundCheckOrder"("caregiverId");
CREATE INDEX IF NOT EXISTS "BackgroundCheckOrder_orderedByUserId_idx" ON "BackgroundCheckOrder"("orderedByUserId");
CREATE INDEX IF NOT EXISTS "BackgroundCheckOrder_status_idx" ON "BackgroundCheckOrder"("status");
CREATE INDEX IF NOT EXISTS "BackgroundCheckOrder_packageType_idx" ON "BackgroundCheckOrder"("packageType");
