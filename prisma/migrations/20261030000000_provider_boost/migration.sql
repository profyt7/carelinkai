-- Provider Boost ($39/mo) + founding-provider offer (10/29 provider pricing change).
-- Additive only: nullable columns and indexes; no existing data changes.
ALTER TABLE "Provider" ADD COLUMN "boostStatus" "SubscriptionStatus";
ALTER TABLE "Provider" ADD COLUMN "boostStripeSubscriptionId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "boostPeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN "founderBoostStartedAt" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN "founderBoostEndsAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Provider_boostStripeSubscriptionId_key" ON "Provider"("boostStripeSubscriptionId");
CREATE INDEX "Provider_boostStatus_idx" ON "Provider"("boostStatus");
CREATE INDEX "Provider_founderBoostStartedAt_idx" ON "Provider"("founderBoostStartedAt");
