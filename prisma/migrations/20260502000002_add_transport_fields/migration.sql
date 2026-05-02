-- Add transport-specific fields to Provider
ALTER TABLE "Provider"
  ADD COLUMN IF NOT EXISTS "rideTypes"            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "acceptsMedicaid"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "serviceRadius"         INTEGER,
  ADD COLUMN IF NOT EXISTS "allowsRecurring"       BOOLEAN NOT NULL DEFAULT false;

-- Add transport details to Lead (JSON blob for trip purpose, mobility needs, recurring schedule)
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "transportDetails" JSONB;

-- Index for transport filter queries
CREATE INDEX IF NOT EXISTS "Provider_wheelchairAccessible_idx" ON "Provider"("wheelchairAccessible");
CREATE INDEX IF NOT EXISTS "Provider_acceptsMedicaid_idx" ON "Provider"("acceptsMedicaid");
