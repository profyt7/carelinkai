-- Revenue model expansion migration
-- 1. Add AGENCY to SubscriptionPlan enum
-- 2. Add commissionTier (CommissionTier enum) to Affiliate
-- 3. Add referralType (AffiliateReferralType enum) to AffiliateReferral
-- 4. Add referredByCode to Family
-- 5. Add licenseType (DischargePlannerLicenseType enum) + seatCount to DischargePlannerProfile

-- SubscriptionPlan: add AGENCY value
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'AGENCY';

-- CommissionTier enum
DO $$ BEGIN
  CREATE TYPE "CommissionTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AffiliateReferralType enum
DO $$ BEGIN
  CREATE TYPE "AffiliateReferralType" AS ENUM ('OPERATOR', 'FAMILY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DischargePlannerLicenseType enum
DO $$ BEGIN
  CREATE TYPE "DischargePlannerLicenseType" AS ENUM ('INDIVIDUAL', 'DEPARTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Affiliate: add commissionTier column
ALTER TABLE "Affiliate"
  ADD COLUMN IF NOT EXISTS "commissionTier" "CommissionTier" NOT NULL DEFAULT 'STANDARD';

-- AffiliateReferral: add referralType column
ALTER TABLE "AffiliateReferral"
  ADD COLUMN IF NOT EXISTS "referralType" "AffiliateReferralType" NOT NULL DEFAULT 'OPERATOR';

-- Family: add referredByCode column
ALTER TABLE "Family"
  ADD COLUMN IF NOT EXISTS "referredByCode" TEXT;

-- DischargePlannerProfile: add licenseType + seatCount columns
ALTER TABLE "DischargePlannerProfile"
  ADD COLUMN IF NOT EXISTS "licenseType" "DischargePlannerLicenseType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS "seatCount" INTEGER NOT NULL DEFAULT 1;
