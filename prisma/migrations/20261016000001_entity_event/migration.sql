-- Sprint W5-1 (Δ14 / G2): append-only EntityEvent history + first-class intake
-- columns on PlacementSearch. Additive + idempotent.

DO $$ BEGIN
  CREATE TYPE "EntityType" AS ENUM ('HOME', 'AVAILABILITY', 'LISTING_CLAIM', 'PLACEMENT_SEARCH', 'FACILITY_RESPONSE', 'AVAILABILITY_PING', 'OPERATOR_PROFILE', 'CONCIERGE_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EventSource" AS ENUM ('OPERATOR', 'ADMIN', 'DP', 'FAMILY', 'PING', 'VA_CALL', 'IMPORT', 'SYSTEM', 'STRIPE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "EntityEvent" (
  "id"          TEXT NOT NULL,
  "entityType"  "EntityType" NOT NULL,
  "entityId"    TEXT NOT NULL,
  "eventType"   TEXT NOT NULL,
  "field"       TEXT,
  "oldValue"    JSONB,
  "newValue"    JSONB,
  "source"      "EventSource" NOT NULL,
  "actorUserId" TEXT,
  "actorRole"   TEXT,
  "occurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EntityEvent_entityType_entityId_occurredAt_idx" ON "EntityEvent"("entityType", "entityId", "occurredAt");
CREATE INDEX IF NOT EXISTS "EntityEvent_occurredAt_idx" ON "EntityEvent"("occurredAt");

ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "payerLane" TEXT;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "intakeZip" TEXT;
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "careLevel" TEXT;
