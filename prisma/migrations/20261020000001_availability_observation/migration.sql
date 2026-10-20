-- OL-163 (a): AI availability-call observations + do-not-call on the home.
-- Additive + idempotent. (AI_CALL enum values: previous migration.)

DO $$ BEGIN
  CREATE TYPE "CallOutcome" AS ENUM ('ANSWERED', 'DECLINED', 'NO_ANSWER', 'WANTS_HUMAN', 'WRONG_NUMBER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CallWaiverStatus" AS ENUM ('ACCEPTING_NEW', 'CURRENT_ONLY', 'NO', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "MedicaidPendingAnswer" AS ENUM ('YES', 'NO', 'CASE_BY_CASE', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ObservationQaStatus" AS ENUM ('PENDING', 'APPROVED', 'CORRECTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "doNotCall" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "doNotCallAt" TIMESTAMP(3);
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "doNotCallSource" TEXT;

CREATE TABLE IF NOT EXISTS "AvailabilityObservation" (
  "id"               TEXT NOT NULL,
  "homeId"           TEXT NOT NULL,
  "source"           "AvailabilitySource" NOT NULL DEFAULT 'AI_CALL',
  "conversationId"   TEXT NOT NULL,
  "agentId"          TEXT,
  "calledAt"         TIMESTAMP(3) NOT NULL,
  "durationSecs"     INTEGER,
  "outcome"          "CallOutcome" NOT NULL,
  "bedsAL"           INTEGER,
  "bedsMC"           INTEGER,
  "priceFromMonthly" INTEGER,
  "priceUndisclosed" BOOLEAN,
  "waiverStatus"     "CallWaiverStatus",
  "medicaidPending"  "MedicaidPendingAnswer",
  "doNotCall"        BOOLEAN NOT NULL DEFAULT false,
  "contactRole"      TEXT,
  "notes"            TEXT,
  "transcriptUrl"    TEXT,
  "recordingUrl"     TEXT,
  "transcript"       JSONB,
  "confidence"       DOUBLE PRECISION,
  "qaStatus"         "ObservationQaStatus" NOT NULL DEFAULT 'PENDING',
  "qaByUserId"       TEXT,
  "qaAt"             TIMESTAMP(3),
  "qaNote"           TEXT,
  "corrections"      JSONB,
  "appliedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailabilityObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityObservation_conversationId_key" ON "AvailabilityObservation"("conversationId");
CREATE INDEX IF NOT EXISTS "AvailabilityObservation_homeId_calledAt_idx" ON "AvailabilityObservation"("homeId", "calledAt");
CREATE INDEX IF NOT EXISTS "AvailabilityObservation_qaStatus_calledAt_idx" ON "AvailabilityObservation"("qaStatus", "calledAt");
CREATE INDEX IF NOT EXISTS "AvailabilityObservation_outcome_calledAt_idx" ON "AvailabilityObservation"("outcome", "calledAt");

DO $$ BEGIN
  ALTER TABLE "AvailabilityObservation"
    ADD CONSTRAINT "AvailabilityObservation_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
