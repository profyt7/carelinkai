-- Feature expansion migration
-- Adds: isFeatured/featuredUntil on homes, reliabilityScore on caregivers,
--       new PaymentType values, DischargePlannerProfile, WaitlistEntry, ComplianceKitPurchase

-- New PaymentType enum values
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_HIRE_FEE';
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'FEATURED_LISTING_FEE';
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'COMPLIANCE_KIT';

-- AssistedLivingHome: featured listing fields
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AssistedLivingHome_isFeatured_idx" ON "AssistedLivingHome"("isFeatured");

-- Caregiver: reliability score
ALTER TABLE "Caregiver" ADD COLUMN IF NOT EXISTS "reliabilityScore" DOUBLE PRECISION;

-- DischargePlannerProfile
CREATE TABLE IF NOT EXISTS "DischargePlannerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT,
    "title" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus",
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DischargePlannerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DischargePlannerProfile_userId_key" ON "DischargePlannerProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "DischargePlannerProfile_stripeCustomerId_key" ON "DischargePlannerProfile"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "DischargePlannerProfile_stripeSubscriptionId_key" ON "DischargePlannerProfile"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "DischargePlannerProfile_userId_idx" ON "DischargePlannerProfile"("userId");
CREATE INDEX IF NOT EXISTS "DischargePlannerProfile_stripeCustomerId_idx" ON "DischargePlannerProfile"("stripeCustomerId");
ALTER TABLE "DischargePlannerProfile" ADD CONSTRAINT "DischargePlannerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WaitlistEntry
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "familyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WaitlistEntry_homeId_idx" ON "WaitlistEntry"("homeId");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_familyId_idx" ON "WaitlistEntry"("familyId");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ComplianceKitPurchase
CREATE TABLE IF NOT EXISTS "ComplianceKitPurchase" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "kitType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceKitPurchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ComplianceKitPurchase_operatorId_idx" ON "ComplianceKitPurchase"("operatorId");
ALTER TABLE "ComplianceKitPurchase" ADD CONSTRAINT "ComplianceKitPurchase_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
