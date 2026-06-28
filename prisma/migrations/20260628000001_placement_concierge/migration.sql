-- Concierge (Wizard-of-Oz) placement fields on PlacementSearch.
-- Additive + idempotent. Patient data stays in-app (never emailed).
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "isConcierge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeStatus" TEXT;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "patientInfo" JSONB;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "curatedHomes" JSONB;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeNote" TEXT;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeSubmittedAt" TIMESTAMP(3);
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeRespondedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PlacementSearch_conciergeStatus_idx" ON "PlacementSearch" ("conciergeStatus");
