-- OL-083 inquiry→claim "pull" engine: best-effort operator outreach contact on
-- unclaimed/directory listings + a throttle stamp for claim nudges. Additive.
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "outreachEmail" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "outreachPhone" TEXT;
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "claimNudgeLastSentAt" TIMESTAMP(3);
