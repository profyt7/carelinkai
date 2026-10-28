-- Sprint W4-2: facility accept / decline inside the DP concierge flow.
-- One FacilityResponse per shortlisted home per concierge request; decline
-- reasons roll up to AssistedLivingHome.observedAcceptanceCriteria (a separate
-- column — operator-entered fields are never touched). Additive + idempotent.

DO $$ BEGIN
  CREATE TYPE "FacilityResponseStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'ACCEPTED', 'DECLINED', 'ADMITTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FacilityDeclineReason" AS ENUM (
    'NO_BED', 'ACUITY_TWO_PERSON_ASSIST', 'ACUITY_WANDERING', 'ACUITY_OXYGEN', 'ACUITY_INSULIN',
    'ACUITY_BARIATRIC', 'ACUITY_BEHAVIORAL', 'ACUITY_HOSPICE', 'PAYER_NOT_ACCEPTED',
    'MEDICAID_PENDING_NOT_ACCEPTED', 'OUTSIDE_AREA', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "observedAcceptanceCriteria" JSONB;

CREATE TABLE IF NOT EXISTS "FacilityResponse" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "status" "FacilityResponseStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "contactEmail" TEXT,
  "delivery" TEXT,
  "summary" JSONB NOT NULL,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "admittedAt" TIMESTAMP(3),
  "declineReason" "FacilityDeclineReason",
  "declineText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacilityResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityResponse_token_key" ON "FacilityResponse" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "FacilityResponse_searchId_homeId_key" ON "FacilityResponse" ("searchId", "homeId");
CREATE INDEX IF NOT EXISTS "FacilityResponse_homeId_idx" ON "FacilityResponse" ("homeId");
CREATE INDEX IF NOT EXISTS "FacilityResponse_status_idx" ON "FacilityResponse" ("status");
CREATE INDEX IF NOT EXISTS "FacilityResponse_createdAt_idx" ON "FacilityResponse" ("createdAt");

DO $$ BEGIN
  ALTER TABLE "FacilityResponse"
    ADD CONSTRAINT "FacilityResponse_searchId_fkey"
    FOREIGN KEY ("searchId") REFERENCES "PlacementSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FacilityResponse"
    ADD CONSTRAINT "FacilityResponse_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
