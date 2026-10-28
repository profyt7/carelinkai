-- First-party reviews: operator public reply to a HomeReview (available after claim).
-- Additive + idempotent.
ALTER TABLE "HomeReview" ADD COLUMN IF NOT EXISTS "operatorResponse" TEXT;
ALTER TABLE "HomeReview" ADD COLUMN IF NOT EXISTS "operatorRespondedAt" TIMESTAMP(3);
