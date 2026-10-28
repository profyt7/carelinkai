-- OL-092: CAN-SPAM suppression list for cold-outreach (claim-nudge) email.
-- Persists unsubscribes (and optionally bounces); the batch sender skips any
-- suppressed address on every future run. Additive + idempotent.
CREATE TABLE IF NOT EXISTS "EmailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSuppression_email_key" ON "EmailSuppression"("email");
CREATE INDEX IF NOT EXISTS "EmailSuppression_email_idx" ON "EmailSuppression"("email");
