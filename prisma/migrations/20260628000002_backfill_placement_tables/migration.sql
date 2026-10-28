-- Backfill the PlacementSearch / PlacementRequest tables + their enums.
--
-- These models exist in schema.prisma but were created via `prisma db push`
-- historically — there is no CREATE TABLE for them in the migration history
-- (OL-105). A fresh `prisma migrate deploy` (e2e CI DB, disaster recovery, any
-- new env) therefore lacked them, which (a) broke the DP search + concierge
-- features there and (b) made the concierge migration (20260628000001) a no-op.
--
-- This migration is fully idempotent: CREATE TYPE is guarded, tables use
-- CREATE TABLE IF NOT EXISTS, indexes use IF NOT EXISTS. In production (where the
-- tables already exist from db push) every statement is a no-op; on a fresh DB it
-- creates the complete current-schema tables (incl. the concierge columns added
-- by 20260628000001). Ordered AFTER the concierge migration so prod — which has
-- already applied 20260628000001 — simply no-ops this one.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlacementStatus') THEN
    CREATE TYPE "PlacementStatus" AS ENUM ('SEARCHING', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'RESPONDED', 'ACCEPTED', 'DECLINED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlacementSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "queryText" TEXT NOT NULL,
  "parsedCriteria" JSONB NOT NULL,
  "searchResults" JSONB NOT NULL,
  "status" "PlacementStatus" NOT NULL DEFAULT 'SEARCHING',
  "isConcierge" BOOLEAN NOT NULL DEFAULT false,
  "conciergeStatus" TEXT,
  "patientInfo" JSONB,
  "curatedHomes" JSONB,
  "conciergeNote" TEXT,
  "conciergeSubmittedAt" TIMESTAMP(3),
  "conciergeRespondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementSearch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlacementSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlacementRequest" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "patientInfo" JSONB NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "emailSentAt" TIMESTAMP(3),
  "emailDeliveryStatus" TEXT,
  "homeResponse" TEXT,
  "homeResponseAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlacementRequest_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "PlacementSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlacementRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlacementSearch_userId_idx" ON "PlacementSearch" ("userId");
CREATE INDEX IF NOT EXISTS "PlacementSearch_status_idx" ON "PlacementSearch" ("status");
CREATE INDEX IF NOT EXISTS "PlacementSearch_createdAt_idx" ON "PlacementSearch" ("createdAt");
CREATE INDEX IF NOT EXISTS "PlacementSearch_conciergeStatus_idx" ON "PlacementSearch" ("conciergeStatus");
CREATE INDEX IF NOT EXISTS "PlacementRequest_searchId_idx" ON "PlacementRequest" ("searchId");
CREATE INDEX IF NOT EXISTS "PlacementRequest_homeId_idx" ON "PlacementRequest" ("homeId");
CREATE INDEX IF NOT EXISTS "PlacementRequest_status_idx" ON "PlacementRequest" ("status");
CREATE INDEX IF NOT EXISTS "PlacementRequest_createdAt_idx" ON "PlacementRequest" ("createdAt");
