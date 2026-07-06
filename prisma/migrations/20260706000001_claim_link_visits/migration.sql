-- OL-117: claim-link visit tracking. One append-only row per valid-token
-- render of /claim or the register page, so "was the link opened?" is a
-- query instead of Render-log forensics. Additive + fully idempotent.

CREATE TABLE IF NOT EXISTS "ClaimLinkVisit" (
  "id" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "operatorEmail" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimLinkVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimLinkVisit_homeId_idx" ON "ClaimLinkVisit" ("homeId");
CREATE INDEX IF NOT EXISTS "ClaimLinkVisit_operatorEmail_idx" ON "ClaimLinkVisit" ("operatorEmail");
CREATE INDEX IF NOT EXISTS "ClaimLinkVisit_visitedAt_idx" ON "ClaimLinkVisit" ("visitedAt");
