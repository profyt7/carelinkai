-- On-Call AI: ShiftNeed + CoverageAttempt models
-- Migration: 20260425100000_oncall_ai

-- New enums
DO $$ BEGIN
  CREATE TYPE "ShiftNeedStatus" AS ENUM ('OPEN', 'FILLING', 'FILLED', 'UNFILLED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CoverageChannel" AS ENUM ('SMS', 'VOICE', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CoverageOutcome" AS ENUM ('SENT', 'CONFIRMED', 'DECLINED', 'ERROR', 'NO_RESPONSE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Caregiver: add home coordinates for proximity ranking
ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "homeLat" DOUBLE PRECISION;
ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "homeLng" DOUBLE PRECISION;

-- ShiftNeed table
CREATE TABLE IF NOT EXISTS "ShiftNeed" (
  "id"                   TEXT NOT NULL,
  "homeId"               TEXT NOT NULL,
  "shiftId"              TEXT,
  "requiredCerts"        TEXT[] NOT NULL DEFAULT '{}',
  "requiredSkills"       TEXT[] NOT NULL DEFAULT '{}',
  "minExperienceMonths"  INTEGER,
  "notes"                TEXT,
  "status"               "ShiftNeedStatus" NOT NULL DEFAULT 'OPEN',
  "filledByCaregiverId"  TEXT,
  "filledAt"             TIMESTAMP(3),
  "currentWave"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftNeed_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShiftNeed" ADD CONSTRAINT "ShiftNeed_homeId_fkey"
  FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftNeed" ADD CONSTRAINT "ShiftNeed_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CaregiverShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftNeed" ADD CONSTRAINT "ShiftNeed_filledByCaregiverId_fkey"
  FOREIGN KEY ("filledByCaregiverId") REFERENCES "Caregiver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftNeed" DROP CONSTRAINT IF EXISTS "ShiftNeed_shiftId_key";
ALTER TABLE "ShiftNeed" ADD CONSTRAINT "ShiftNeed_shiftId_key" UNIQUE ("shiftId");

CREATE INDEX IF NOT EXISTS "ShiftNeed_homeId_idx" ON "ShiftNeed"("homeId");
CREATE INDEX IF NOT EXISTS "ShiftNeed_status_idx" ON "ShiftNeed"("status");
CREATE INDEX IF NOT EXISTS "ShiftNeed_createdAt_idx" ON "ShiftNeed"("createdAt");

-- CoverageAttempt table
CREATE TABLE IF NOT EXISTS "CoverageAttempt" (
  "id"          TEXT NOT NULL,
  "shiftNeedId" TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "channel"     "CoverageChannel" NOT NULL DEFAULT 'SMS',
  "outcome"     "CoverageOutcome" NOT NULL DEFAULT 'SENT',
  "messageSid"  TEXT,
  "notes"       TEXT,
  "wave"        INTEGER NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoverageAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CoverageAttempt" ADD CONSTRAINT "CoverageAttempt_shiftNeedId_fkey"
  FOREIGN KEY ("shiftNeedId") REFERENCES "ShiftNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoverageAttempt" ADD CONSTRAINT "CoverageAttempt_caregiverId_fkey"
  FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CoverageAttempt_shiftNeedId_idx" ON "CoverageAttempt"("shiftNeedId");
CREATE INDEX IF NOT EXISTS "CoverageAttempt_caregiverId_idx" ON "CoverageAttempt"("caregiverId");
CREATE INDEX IF NOT EXISTS "CoverageAttempt_messageSid_idx" ON "CoverageAttempt"("messageSid");
CREATE INDEX IF NOT EXISTS "CoverageAttempt_outcome_idx" ON "CoverageAttempt"("outcome");
