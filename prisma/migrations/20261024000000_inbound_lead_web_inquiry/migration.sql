-- OL-177: inquiries on UNCLAIMED homes land in the same admin inbound queue as
-- inbound calls. Additive only: a source enum (default CALL, so every existing
-- row reads as a call), the family's email, the home and the inquiry it came
-- from, and a nullable callback phone (the web form's phone field is optional).
DO $$ BEGIN CREATE TYPE "InboundLeadSource" AS ENUM ('CALL', 'WEB_INQUIRY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "source" "InboundLeadSource" NOT NULL DEFAULT 'CALL';
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "homeId" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "inquiryId" TEXT;
ALTER TABLE "InboundLead" ALTER COLUMN "callbackPhone" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "InboundLead_inquiryId_key" ON "InboundLead"("inquiryId");
CREATE INDEX IF NOT EXISTS "InboundLead_source_receivedAt_idx" ON "InboundLead"("source", "receivedAt");
