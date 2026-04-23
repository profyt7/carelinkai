-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED');

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "stripeCustomerId"     TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan"     "SubscriptionPlan",
ADD COLUMN     "subscriptionStatus"   "SubscriptionStatus",
ADD COLUMN     "trialEndsAt"          TIMESTAMP(3),
ADD COLUMN     "currentPeriodEndsAt"  TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_stripeCustomerId_key" ON "Operator"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_stripeSubscriptionId_key" ON "Operator"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Operator_stripeCustomerId_idx" ON "Operator"("stripeCustomerId");
