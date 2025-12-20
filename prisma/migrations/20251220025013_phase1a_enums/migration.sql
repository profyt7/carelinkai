-- Phase 1A Part 1: Add Enum Types and Values
-- This migration ONLY adds enum types and values to avoid PostgreSQL transaction issues

-- Create ExtractionStatus enum
DO $$ BEGIN
    CREATE TYPE "ExtractionStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new values to ComplianceStatus enum
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'ComplianceStatus' AND e.enumlabel = 'PENDING'
    ) THEN
        ALTER TYPE "ComplianceStatus" ADD VALUE 'PENDING';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'ComplianceStatus' AND e.enumlabel = 'COMPLIANT'
    ) THEN
        ALTER TYPE "ComplianceStatus" ADD VALUE 'COMPLIANT';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'ComplianceStatus' AND e.enumlabel = 'MISSING'
    ) THEN
        ALTER TYPE "ComplianceStatus" ADD VALUE 'MISSING';
    END IF;
END $$;

-- Add new values to DocumentType enum
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'INSURANCE_CARD'
    ) THEN
        ALTER TYPE "DocumentType" ADD VALUE 'INSURANCE_CARD';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'ID_DOCUMENT'
    ) THEN
        ALTER TYPE "DocumentType" ADD VALUE 'ID_DOCUMENT';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'FINANCIAL'
    ) THEN
        ALTER TYPE "DocumentType" ADD VALUE 'FINANCIAL';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'CARE_PLAN'
    ) THEN
        ALTER TYPE "DocumentType" ADD VALUE 'CARE_PLAN';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'EMERGENCY_CONTACT'
    ) THEN
        ALTER TYPE "DocumentType" ADD VALUE 'EMERGENCY_CONTACT';
    END IF;
END $$;
