-- feat/dp-lead-capture: DP lead-capture + automated follow-up sequence.
-- One row per discharge planner Anita logs via the scoped /lead/new form.
-- NO PHI — planner contact + interest only. Additive + fully idempotent.

CREATE TABLE IF NOT EXISTS "DPLead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "hospital" TEXT NOT NULL,
  "department" TEXT,
  "interestLevel" TEXT NOT NULL DEFAULT 'WARM',
  "consent" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'anita_form',
  "status" TEXT NOT NULL DEFAULT 'active',
  "stoppedReason" TEXT,
  "touchStep" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastTouchAt" TIMESTAMP(3),
  "nextTouchAt" TIMESTAMP(3),
  CONSTRAINT "DPLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DPLead_status_idx" ON "DPLead" ("status");
CREATE INDEX IF NOT EXISTS "DPLead_nextTouchAt_idx" ON "DPLead" ("nextTouchAt");
CREATE INDEX IF NOT EXISTS "DPLead_email_idx" ON "DPLead" ("email");
