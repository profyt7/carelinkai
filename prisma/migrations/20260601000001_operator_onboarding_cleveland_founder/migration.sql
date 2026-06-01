-- AddColumn: onboarding & Cleveland founder gating fields on Operator
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "clevelandFounder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "freeAccessUntil" TIMESTAMP(3);

-- CreateEnum: AccessTier
DO $$ BEGIN
  CREATE TYPE "AccessTier" AS ENUM ('FULL', 'READ_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "accessTier" "AccessTier" NOT NULL DEFAULT 'FULL';

-- Grandfather all existing operators as fully onboarded so they are not redirected to the wizard
UPDATE "Operator" SET "onboardingCompletedAt" = NOW() WHERE "onboardingCompletedAt" IS NULL;
