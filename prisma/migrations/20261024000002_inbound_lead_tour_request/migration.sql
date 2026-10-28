-- OL-179: a logged-in family's tour request (TourRequest) on an UNCLAIMED home
-- lands in the inbound queue too; one queue row per tour request.
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "tourRequestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "InboundLead_tourRequestId_key" ON "InboundLead"("tourRequestId");
