-- OL-080: persist public listing contact + marketing fields the enrich pipeline
-- already extracts (phone / contactEmail / tagline) but previously discarded.
-- Additive + idempotent. Distinct from outreachEmail/outreachPhone (nudge channel).
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
