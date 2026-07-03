-- State Inspection History (OL-113): ODH RCF survey/citation records matched to
-- directory listings, + the ODH license number on the home for stable matching.
-- Factual public-records data only. Additive + fully idempotent.

ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "odhLicenseNumber" TEXT;

CREATE TABLE IF NOT EXISTS "FacilityInspection" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "odhLicenseNumber" TEXT,
  "surveyDate" TIMESTAMP(3) NOT NULL,
  "surveyType" TEXT,
  "citationCount" INTEGER NOT NULL DEFAULT 0,
  "citations" JSONB,
  "sourceUrl" TEXT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacilityInspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityInspection_facilityId_surveyDate_surveyType_key"
  ON "FacilityInspection" ("facilityId", "surveyDate", "surveyType");
CREATE INDEX IF NOT EXISTS "FacilityInspection_facilityId_idx" ON "FacilityInspection" ("facilityId");
CREATE INDEX IF NOT EXISTS "FacilityInspection_surveyDate_idx" ON "FacilityInspection" ("surveyDate");
CREATE INDEX IF NOT EXISTS "FacilityInspection_odhLicenseNumber_idx" ON "FacilityInspection" ("odhLicenseNumber");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FacilityInspection_facilityId_fkey') THEN
    ALTER TABLE "FacilityInspection"
      ADD CONSTRAINT "FacilityInspection_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
