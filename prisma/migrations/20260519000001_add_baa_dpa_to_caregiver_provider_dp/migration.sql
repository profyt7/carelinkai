-- HIPAA: Add BAA/DPA acceptance fields to Caregiver, Provider, and DischargePlannerProfile
-- All columns nullable — safe under Render auto-deploy (no NOT NULL on existing rows).

ALTER TABLE "Caregiver"
  ADD COLUMN IF NOT EXISTS "baaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "baaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedUserAgent"  TEXT,
  ADD COLUMN IF NOT EXISTS "dpaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dpaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedUserAgent"  TEXT;

ALTER TABLE "Provider"
  ADD COLUMN IF NOT EXISTS "baaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "baaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedUserAgent"  TEXT,
  ADD COLUMN IF NOT EXISTS "dpaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dpaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedUserAgent"  TEXT;

ALTER TABLE "DischargePlannerProfile"
  ADD COLUMN IF NOT EXISTS "baaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "baaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "baaAcceptedUserAgent"  TEXT,
  ADD COLUMN IF NOT EXISTS "dpaTemplateVersion"    TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dpaAcceptedIp"         TEXT,
  ADD COLUMN IF NOT EXISTS "dpaAcceptedUserAgent"  TEXT;
