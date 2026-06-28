-- Concierge (Wizard-of-Oz) placement fields on PlacementSearch.
-- Additive + idempotent. Patient data stays in-app (never emailed).
--
-- NOTE: "PlacementSearch" has no creating migration in this repo (it was created
-- via `prisma db push` historically), so a fresh `prisma migrate deploy` (e.g. the
-- e2e CI database) has no such table. Guard on its existence so this migration
-- applies cleanly where the table exists (prod) and is a safe no-op where it does
-- not — instead of aborting the whole migrate-deploy step.
DO $$
BEGIN
  IF to_regclass('"PlacementSearch"') IS NOT NULL THEN
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "isConcierge" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeStatus" TEXT;
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "patientInfo" JSONB;
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "curatedHomes" JSONB;
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeNote" TEXT;
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeSubmittedAt" TIMESTAMP(3);
    ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "conciergeRespondedAt" TIMESTAMP(3);
    CREATE INDEX IF NOT EXISTS "PlacementSearch_conciergeStatus_idx" ON "PlacementSearch" ("conciergeStatus");
  END IF;
END $$;
