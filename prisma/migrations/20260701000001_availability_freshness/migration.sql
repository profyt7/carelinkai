-- Live-ish AVAILABILITY freshness (OL-110): verify-on-request + honest freshness
-- stamp, never store stale "live". Adds the freshness cascade fields to
-- AssistedLivingHome + the AvailabilitySource enum. Business data only (no PHI).
--
-- Additive + fully idempotent: guarded CREATE TYPE, ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS. No-op where already present.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AvailabilitySource') THEN
    CREATE TYPE "AvailabilitySource" AS ENUM ('OPERATOR', 'SMS', 'EMAIL', 'VOICE', 'CONCIERGE');
  END IF;
END $$;

ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "availabilityCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "availabilityVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "availabilitySource" "AvailabilitySource",
  ADD COLUMN IF NOT EXISTS "contactMobile" TEXT,
  ADD COLUMN IF NOT EXISTS "availabilityOptIn" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "AssistedLivingHome_availabilityVerifiedAt_idx"
  ON "AssistedLivingHome" ("availabilityVerifiedAt");
