-- Provider listing subscription fields ($99/mo)
ALTER TABLE "Provider"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "listingStatus"        "SubscriptionStatus",
  ADD COLUMN IF NOT EXISTS "listingPeriodEndsAt"  TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Provider_stripeCustomerId_key"     ON "Provider"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Provider_stripeSubscriptionId_key" ON "Provider"("stripeSubscriptionId");
CREATE INDEX        IF NOT EXISTS "Provider_listingStatus_idx"        ON "Provider"("listingStatus");

-- Pro Caregiver tier fields ($19/mo)
ALTER TABLE "Caregiver"
  ADD COLUMN IF NOT EXISTS "isPro"                   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "proStripeCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "proStripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "proStatus"               "SubscriptionStatus",
  ADD COLUMN IF NOT EXISTS "proPeriodEndsAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "applicationCount"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "applicationCountResetAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Caregiver_proStripeCustomerId_key"     ON "Caregiver"("proStripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Caregiver_proStripeSubscriptionId_key" ON "Caregiver"("proStripeSubscriptionId");
CREATE INDEX        IF NOT EXISTS "Caregiver_isPro_idx"                   ON "Caregiver"("isPro");
