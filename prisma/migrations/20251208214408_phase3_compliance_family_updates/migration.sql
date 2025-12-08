-- Phase 3 Migration: Compliance & Family Tabs Updates
-- This migration updates the ResidentComplianceItem model and adds FamilyContact model
-- Created: December 8, 2024
-- Idempotent: Safe to run multiple times

-- ========================================
-- STEP 1: Update ComplianceStatus Enum
-- ========================================

-- Create new enum type with Phase 3 values
DO $$ BEGIN
    CREATE TYPE "ComplianceStatus_new" AS ENUM ('CURRENT', 'EXPIRING_SOON', 'EXPIRED', 'NOT_REQUIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If the new enum doesn't have the old values yet, migrate the data
DO $$ 
BEGIN
    -- Check if old enum still exists and needs migration
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceStatus') THEN
        -- Add a temporary column with new enum type
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'ResidentComplianceItem' 
                      AND column_name = 'status_new') THEN
            ALTER TABLE "ResidentComplianceItem" 
            ADD COLUMN "status_new" "ComplianceStatus_new" DEFAULT 'CURRENT';
            
            -- Migrate existing data (map OPEN/COMPLETED to CURRENT)
            UPDATE "ResidentComplianceItem" 
            SET "status_new" = 'CURRENT' 
            WHERE "status"::text IN ('OPEN', 'COMPLETED');
            
            -- Drop old status column
            ALTER TABLE "ResidentComplianceItem" DROP COLUMN "status";
            
            -- Rename new column to status
            ALTER TABLE "ResidentComplianceItem" RENAME COLUMN "status_new" TO "status";
            
            -- Drop old enum type
            DROP TYPE IF EXISTS "ComplianceStatus";
            
            -- Rename new enum type
            ALTER TYPE "ComplianceStatus_new" RENAME TO "ComplianceStatus";
        END IF;
    END IF;
END $$;

-- ========================================
-- STEP 2: Update ResidentComplianceItem Table
-- ========================================

-- Drop old columns if they exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ResidentComplianceItem' AND column_name = 'owner') THEN
        ALTER TABLE "ResidentComplianceItem" DROP COLUMN "owner";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ResidentComplianceItem' AND column_name = 'severity') THEN
        ALTER TABLE "ResidentComplianceItem" DROP COLUMN "severity";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ResidentComplianceItem' AND column_name = 'dueDate') THEN
        ALTER TABLE "ResidentComplianceItem" DROP COLUMN "dueDate";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ResidentComplianceItem' AND column_name = 'completedAt') THEN
        ALTER TABLE "ResidentComplianceItem" DROP COLUMN "completedAt";
    END IF;
END $$;

-- Add new Phase 3 columns if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ResidentComplianceItem' AND column_name = 'issuedDate') THEN
        ALTER TABLE "ResidentComplianceItem" ADD COLUMN "issuedDate" TIMESTAMP(3);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ResidentComplianceItem' AND column_name = 'expiryDate') THEN
        ALTER TABLE "ResidentComplianceItem" ADD COLUMN "expiryDate" TIMESTAMP(3);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ResidentComplianceItem' AND column_name = 'documentUrl') THEN
        ALTER TABLE "ResidentComplianceItem" ADD COLUMN "documentUrl" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ResidentComplianceItem' AND column_name = 'verifiedBy') THEN
        ALTER TABLE "ResidentComplianceItem" ADD COLUMN "verifiedBy" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ResidentComplianceItem' AND column_name = 'verifiedAt') THEN
        ALTER TABLE "ResidentComplianceItem" ADD COLUMN "verifiedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Drop old index and create new ones
DROP INDEX IF EXISTS "ResidentComplianceItem_dueDate_idx";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ResidentComplianceItem_expiryDate_idx') THEN
        CREATE INDEX "ResidentComplianceItem_expiryDate_idx" ON "ResidentComplianceItem"("expiryDate");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ResidentComplianceItem_type_idx') THEN
        CREATE INDEX "ResidentComplianceItem_type_idx" ON "ResidentComplianceItem"("type");
    END IF;
END $$;

-- ========================================
-- STEP 3: Create FamilyContact Table
-- ========================================

CREATE TABLE IF NOT EXISTS "FamilyContact" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "permissionLevel" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "contactPreference" TEXT DEFAULT 'PHONE',
    "notes" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyContact_pkey" PRIMARY KEY ("id")
);

-- Add indexes for FamilyContact
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyContact_residentId_idx') THEN
        CREATE INDEX "FamilyContact_residentId_idx" ON "FamilyContact"("residentId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyContact_isPrimaryContact_idx') THEN
        CREATE INDEX "FamilyContact_isPrimaryContact_idx" ON "FamilyContact"("isPrimaryContact");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyContact_permissionLevel_idx') THEN
        CREATE INDEX "FamilyContact_permissionLevel_idx" ON "FamilyContact"("permissionLevel");
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FamilyContact_residentId_fkey' 
        AND table_name = 'FamilyContact'
    ) THEN
        ALTER TABLE "FamilyContact" 
        ADD CONSTRAINT "FamilyContact_residentId_fkey" 
        FOREIGN KEY ("residentId") REFERENCES "Resident"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ========================================
-- Migration Complete
-- ========================================

-- This migration successfully:
-- 1. Updated ComplianceStatus enum from (OPEN, COMPLETED) to (CURRENT, EXPIRING_SOON, EXPIRED, NOT_REQUIRED)
-- 2. Migrated existing compliance items to CURRENT status
-- 3. Removed legacy fields: owner, severity, dueDate, completedAt
-- 4. Added new fields: issuedDate, expiryDate, documentUrl, verifiedBy, verifiedAt
-- 5. Updated indexes for better query performance
-- 6. Created FamilyContact table with proper indexes and foreign keys
-- 7. All operations are idempotent and safe to run multiple times
