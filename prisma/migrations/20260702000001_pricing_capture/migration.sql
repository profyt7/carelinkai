-- Pricing capture (OL-111): honest source-labeled "starting around $X" ranges +
-- a family-reported quote moat. Slow-changing, commercially sensitive — never an
-- official quote. No PHI (quote + care level only). Additive + fully idempotent.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceSource') THEN
    CREATE TYPE "PriceSource" AS ENUM ('OPERATOR', 'DP_ESTIMATE', 'PUBLIC', 'FAMILY_AVG');
  END IF;
END $$;

ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "startingPriceMonthly" INTEGER,
  ADD COLUMN IF NOT EXISTS "priceRangeLow" INTEGER,
  ADD COLUMN IF NOT EXISTS "priceRangeHigh" INTEGER,
  ADD COLUMN IF NOT EXISTS "priceSource" "PriceSource",
  ADD COLUMN IF NOT EXISTS "priceUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AssistedLivingHome_priceSource_idx"
  ON "AssistedLivingHome" ("priceSource");

CREATE TABLE IF NOT EXISTS "FacilityQuoteReport" (
  "id" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "careLevel" "CareLevel" NOT NULL,
  "quotedMonthlyBase" INTEGER NOT NULL,
  "careAddOn" INTEGER,
  "communityFee" INTEGER,
  "moveInMonth" TEXT,
  "reportedByUserId" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacilityQuoteReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FacilityQuoteReport_homeId_idx" ON "FacilityQuoteReport" ("homeId");
CREATE INDEX IF NOT EXISTS "FacilityQuoteReport_homeId_verified_idx" ON "FacilityQuoteReport" ("homeId", "verified");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FacilityQuoteReport_homeId_fkey') THEN
    ALTER TABLE "FacilityQuoteReport"
      ADD CONSTRAINT "FacilityQuoteReport_homeId_fkey"
      FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
