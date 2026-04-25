-- Aide Reliability: CallOff, CaregiverPoints, PointTransaction, ShiftBid
-- Migration: 20260425200000_aide_reliability

-- New enums
DO $$ BEGIN
  CREATE TYPE "CallOffType" AS ENUM ('NO_SHOW', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'CALLED_OFF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PointsTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PointsEventType" AS ENUM (
    'ON_TIME_SHIFT', 'STREAK_5_SHIFTS', 'NO_CALLOFF_30_DAYS',
    'POSITIVE_REVIEW', 'SHIFT_COMPLETED', 'REDEMPTION', 'BONUS', 'CALL_OFF_PENALTY'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CallOff table
CREATE TABLE IF NOT EXISTS "CallOff" (
  "id"          TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "shiftId"     TEXT,
  "type"        "CallOffType" NOT NULL,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallOff_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CallOff" ADD CONSTRAINT "CallOff_caregiverId_fkey"
  FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallOff" ADD CONSTRAINT "CallOff_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CaregiverShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CallOff_caregiverId_idx" ON "CallOff"("caregiverId");
CREATE INDEX IF NOT EXISTS "CallOff_shiftId_idx" ON "CallOff"("shiftId");
CREATE INDEX IF NOT EXISTS "CallOff_createdAt_idx" ON "CallOff"("createdAt");

-- CaregiverPoints table
CREATE TABLE IF NOT EXISTS "CaregiverPoints" (
  "id"             TEXT NOT NULL,
  "caregiverId"    TEXT NOT NULL,
  "totalPoints"    INTEGER NOT NULL DEFAULT 0,
  "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
  "tier"           "PointsTier" NOT NULL DEFAULT 'BRONZE',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaregiverPoints_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CaregiverPoints" ADD CONSTRAINT "CaregiverPoints_caregiverId_fkey"
  FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaregiverPoints" DROP CONSTRAINT IF EXISTS "CaregiverPoints_caregiverId_key";
ALTER TABLE "CaregiverPoints" ADD CONSTRAINT "CaregiverPoints_caregiverId_key" UNIQUE ("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverPoints_caregiverId_idx" ON "CaregiverPoints"("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverPoints_tier_idx" ON "CaregiverPoints"("tier");

-- PointTransaction table
CREATE TABLE IF NOT EXISTS "PointTransaction" (
  "id"          TEXT NOT NULL,
  "accountId"   TEXT NOT NULL,
  "points"      INTEGER NOT NULL,
  "type"        "PointsEventType" NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "CaregiverPoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PointTransaction_accountId_idx" ON "PointTransaction"("accountId");
CREATE INDEX IF NOT EXISTS "PointTransaction_createdAt_idx" ON "PointTransaction"("createdAt");

-- ShiftBid table
CREATE TABLE IF NOT EXISTS "ShiftBid" (
  "id"          TEXT NOT NULL,
  "shiftId"     TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "message"     TEXT,
  "status"      "BidStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftBid_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ShiftBid" ADD CONSTRAINT "ShiftBid_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CaregiverShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftBid" ADD CONSTRAINT "ShiftBid_caregiverId_fkey"
  FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftBid" DROP CONSTRAINT IF EXISTS "ShiftBid_shiftId_caregiverId_key";
ALTER TABLE "ShiftBid" ADD CONSTRAINT "ShiftBid_shiftId_caregiverId_key" UNIQUE ("shiftId", "caregiverId");
CREATE INDEX IF NOT EXISTS "ShiftBid_shiftId_idx" ON "ShiftBid"("shiftId");
CREATE INDEX IF NOT EXISTS "ShiftBid_caregiverId_idx" ON "ShiftBid"("caregiverId");
CREATE INDEX IF NOT EXISTS "ShiftBid_status_idx" ON "ShiftBid"("status");
