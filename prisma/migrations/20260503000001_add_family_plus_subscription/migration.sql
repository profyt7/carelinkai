-- AlterTable: Add CareLinkAI Plus subscription fields to Family
ALTER TABLE "Family"
  ADD COLUMN "stripeCustomerId"     TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "plusStatus"           "SubscriptionStatus",
  ADD COLUMN "plusPeriodEndsAt"     TIMESTAMP(3),
  ADD COLUMN "isPlus"               BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: unique constraints for Stripe IDs
CREATE UNIQUE INDEX "Family_stripeCustomerId_key" ON "Family"("stripeCustomerId");
CREATE UNIQUE INDEX "Family_stripeSubscriptionId_key" ON "Family"("stripeSubscriptionId");
