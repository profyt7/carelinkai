-- Sprint W5-2 (G3 + G4): Medicaid Assisted Living Waiver status + acceptance
-- facts from calls on AssistedLivingHome. Additive + idempotent; no backfill.

DO $$ BEGIN
  CREATE TYPE "MedicaidWaiverStatus" AS ENUM ('ACCEPTING_NEW', 'CURRENT_RESIDENTS_ONLY', 'NOT_ACCEPTING_REFERRALS', 'NOT_ON_LIST', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidWaiverStatus" "MedicaidWaiverStatus" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidWaiverSource" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidWaiverVerifiedAt" TIMESTAMP(3);

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidPendingAccepted" BOOLEAN;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidPendingAcceptedSource" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "medicaidPendingAcceptedVerifiedAt" TIMESTAMP(3);

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "acuityCeiling" JSONB;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "acuityCeilingSource" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "acuityCeilingVerifiedAt" TIMESTAMP(3);

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "admissionsCrm" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "admissionsCrmSource" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "admissionsCrmVerifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AssistedLivingHome_medicaidWaiverStatus_idx" ON "AssistedLivingHome"("medicaidWaiverStatus");
