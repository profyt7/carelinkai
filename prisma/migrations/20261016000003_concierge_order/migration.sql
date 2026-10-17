-- Sprint W5-3 (G1): paid Family Concierge orders + Stripe webhook idempotency +
-- family upsell dismissal. Additive + idempotent.

DO $$ BEGIN
  CREATE TYPE "ConciergeOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'WAITLIST', 'REQUESTED_UNPAID', 'REFUNDED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ConciergeOrder" (
  "id"                      TEXT NOT NULL,
  "placementSearchId"       TEXT,
  "familyUserId"            TEXT,
  "email"                   TEXT NOT NULL,
  "status"                  "ConciergeOrderStatus" NOT NULL DEFAULT 'REQUESTED_UNPAID',
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId"   TEXT,
  "amountCents"             INTEGER NOT NULL DEFAULT 39900,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"                  TIMESTAMP(3),
  "refundedAt"              TIMESTAMP(3),
  CONSTRAINT "ConciergeOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConciergeOrder_stripeCheckoutSessionId_key" ON "ConciergeOrder"("stripeCheckoutSessionId");
CREATE INDEX IF NOT EXISTS "ConciergeOrder_placementSearchId_idx" ON "ConciergeOrder"("placementSearchId");
CREATE INDEX IF NOT EXISTS "ConciergeOrder_familyUserId_idx" ON "ConciergeOrder"("familyUserId");
CREATE INDEX IF NOT EXISTS "ConciergeOrder_email_idx" ON "ConciergeOrder"("email");
CREATE INDEX IF NOT EXISTS "ConciergeOrder_status_createdAt_idx" ON "ConciergeOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ConciergeOrder_stripePaymentIntentId_idx" ON "ConciergeOrder"("stripePaymentIntentId");

DO $$ BEGIN
  ALTER TABLE "ConciergeOrder"
    ADD CONSTRAINT "ConciergeOrder_placementSearchId_fkey"
    FOREIGN KEY ("placementSearchId") REFERENCES "PlacementSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "id"          TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "conciergeUpsellDismissedAt" TIMESTAMP(3);
