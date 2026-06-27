-- Per-facility claim drip (email-only). Additive + idempotent.
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "claimDripStartedAt" TIMESTAMP(3);
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "claimDripStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "claimDripNextAt" TIMESTAMP(3);
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "claimDripStoppedReason" TEXT;
-- Cron scans for due drips: index the scheduling columns.
CREATE INDEX IF NOT EXISTS "AssistedLivingHome_claimDripNextAt_idx" ON "AssistedLivingHome" ("claimDripNextAt");
