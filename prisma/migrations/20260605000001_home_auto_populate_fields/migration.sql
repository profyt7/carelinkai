-- Add AI auto-population tracking fields to AssistedLivingHome
ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "websiteUrl"             TEXT,
  ADD COLUMN IF NOT EXISTS "autoPopulatedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoPopulatedFromUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "autoPopulatedVersion"   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "preFilledFields"        JSONB,
  ADD COLUMN IF NOT EXISTS "aiPopulationConfidence" TEXT;
