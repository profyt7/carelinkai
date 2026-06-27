-- Google Places aggregate rating for the "See reviews on Google" trust badge.
-- Additive + idempotent. Stores rating + review count + place id ONLY — never
-- review text (Google Maps Platform ToS). Populated by backfill-google-ratings.ts.
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "googleRating" DOUBLE PRECISION;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "googleRatingCount" INTEGER;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "googleRatingUpdatedAt" TIMESTAMP(3);
