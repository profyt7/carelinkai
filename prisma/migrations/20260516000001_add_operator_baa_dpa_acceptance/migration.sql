-- Migration: add_operator_baa_dpa_acceptance
-- Additive + nullable: safe under Render auto-deploy (no DROP, no NOT NULL on existing data)
-- See HIPAA Phase 3 PR B — operator BAA/DPA signup gate

-- Add BAA/DPA acceptance fields to Operator
ALTER TABLE "Operator"
  ADD COLUMN IF NOT EXISTS "baaTemplateVersion"   TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "baaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedUserAgent"  TEXT,
  ADD COLUMN IF NOT EXISTS "dpaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dpaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedUserAgent"  TEXT;

-- Add LEGAL_ACCEPTANCE to AuditAction enum
-- PostgreSQL requires ALTER TYPE for enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'LEGAL_ACCEPTANCE'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_ACCEPTANCE';
  END IF;
END$$;
