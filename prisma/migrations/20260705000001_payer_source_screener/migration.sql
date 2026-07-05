-- Payer-source screener (OL-114, feat/payer-source-screener): structured tag
-- for how a family expects to pay for care, on inquiries + placement searches.
-- TAGS ONLY — no behavior reads it except read-only admin display; the fee
-- lane is derived in code (AKS-sensitive), never persisted.
-- Additive + fully idempotent.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayerSource') THEN
    CREATE TYPE "PayerSource" AS ENUM (
      'PRIVATE_FUNDS',
      'LTC_INSURANCE',
      'MEDICAID_WAIVER',
      'MEDICARE_ADVANTAGE',
      'VA_BENEFITS',
      'NOT_SURE'
    );
  END IF;
END $$;

ALTER TABLE "Inquiry"
  ADD COLUMN IF NOT EXISTS "payerSource" "PayerSource";

ALTER TABLE "PlacementSearch"
  ADD COLUMN IF NOT EXISTS "payerSource" "PayerSource";
