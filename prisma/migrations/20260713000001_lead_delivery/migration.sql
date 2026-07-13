-- Demand-first North Star (feat/demand-first-admin-metric, 2026-07-13).
-- Append-only record that one lead was routed to one specific facility,
-- decoupled from claims (7/9 demand-first pivot): a facility may be claimed
-- (operatorId set) or unclaimed/manual-concierge (operatorId null). Powers the
-- admin "Qualified leads delivered" headline metric. Additive + idempotent.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadDeliverySource') THEN
    CREATE TYPE "LeadDeliverySource" AS ENUM ('INQUIRY', 'TOUR_REQUEST', 'CONCIERGE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadDeliveryChannel') THEN
    CREATE TYPE "LeadDeliveryChannel" AS ENUM ('AUTOMATED', 'MANUAL_CONCIERGE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LeadDelivery" (
  "id" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "facilityId" TEXT NOT NULL,
  "operatorId" TEXT,
  "source" "LeadDeliverySource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "channel" "LeadDeliveryChannel" NOT NULL,
  "claimed" BOOLEAN NOT NULL,
  "qualified" BOOLEAN NOT NULL,
  "hasContact" BOOLEAN NOT NULL,
  "hasCareNeed" BOOLEAN NOT NULL,
  "hasQualifyingFacts" BOOLEAN NOT NULL,
  "hasConsent" BOOLEAN NOT NULL,
  "leadKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeadDelivery_source_sourceId_facilityId_key"
  ON "LeadDelivery" ("source", "sourceId", "facilityId");
CREATE INDEX IF NOT EXISTS "LeadDelivery_deliveredAt_idx" ON "LeadDelivery" ("deliveredAt");
CREATE INDEX IF NOT EXISTS "LeadDelivery_facilityId_idx" ON "LeadDelivery" ("facilityId");
CREATE INDEX IF NOT EXISTS "LeadDelivery_leadKey_idx" ON "LeadDelivery" ("leadKey");
CREATE INDEX IF NOT EXISTS "LeadDelivery_qualified_idx" ON "LeadDelivery" ("qualified");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'LeadDelivery_facilityId_fkey'
  ) THEN
    ALTER TABLE "LeadDelivery"
      ADD CONSTRAINT "LeadDelivery_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "AssistedLivingHome" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
