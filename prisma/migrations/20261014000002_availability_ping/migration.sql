-- Sprint W4-1: one-tap availability ping (data capture, email transport only).
-- Per-home availability contact (consent flag) + one row per weekly ping.
-- Business contact data only — never PHI. Additive + idempotent.

-- New AvailabilitySource value for ping replies.
ALTER TYPE "AvailabilitySource" ADD VALUE IF NOT EXISTS 'PING';

DO $$ BEGIN
  CREATE TYPE "AvailabilityPingChannel" AS ENUM ('EMAIL', 'SMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AvailabilityPingOutcome" AS ENUM ('UPDATED', 'STOP', 'ADMIN_REVIEW', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AvailabilityContact" (
  "id" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "mobile" TEXT,
  "preferredChannel" "AvailabilityPingChannel" NOT NULL DEFAULT 'EMAIL',
  "optedIn" BOOLEAN NOT NULL DEFAULT false,
  "optedInAt" TIMESTAMP(3),
  "optedInSource" TEXT,
  "optedOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailabilityContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityContact_homeId_key" ON "AvailabilityContact" ("homeId");
CREATE INDEX IF NOT EXISTS "AvailabilityContact_optedIn_idx" ON "AvailabilityContact" ("optedIn");
CREATE INDEX IF NOT EXISTS "AvailabilityContact_email_idx" ON "AvailabilityContact" ("email");

DO $$ BEGIN
  ALTER TABLE "AvailabilityContact"
    ADD CONSTRAINT "AvailabilityContact_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AvailabilityPing" (
  "id" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "channel" "AvailabilityPingChannel" NOT NULL,
  "token" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "delivery" TEXT,
  "repliedAt" TIMESTAMP(3),
  "replyRaw" TEXT,
  "replyVia" TEXT,
  "parsedCount" INTEGER,
  "outcome" "AvailabilityPingOutcome",
  CONSTRAINT "AvailabilityPing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityPing_token_key" ON "AvailabilityPing" ("token");
CREATE INDEX IF NOT EXISTS "AvailabilityPing_homeId_idx" ON "AvailabilityPing" ("homeId");
CREATE INDEX IF NOT EXISTS "AvailabilityPing_contactId_idx" ON "AvailabilityPing" ("contactId");
CREATE INDEX IF NOT EXISTS "AvailabilityPing_outcome_idx" ON "AvailabilityPing" ("outcome");
CREATE INDEX IF NOT EXISTS "AvailabilityPing_sentAt_idx" ON "AvailabilityPing" ("sentAt");
CREATE INDEX IF NOT EXISTS "AvailabilityPing_expiresAt_idx" ON "AvailabilityPing" ("expiresAt");

DO $$ BEGIN
  ALTER TABLE "AvailabilityPing"
    ADD CONSTRAINT "AvailabilityPing_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AvailabilityPing"
    ADD CONSTRAINT "AvailabilityPing_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "AvailabilityContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
