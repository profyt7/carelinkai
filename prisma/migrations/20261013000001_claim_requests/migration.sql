-- Sprint W3 item 2: cohort claim requests (home-care agencies first).
-- One append-only row per "Claim your agency listing" submission, from the
-- cohort landing page or a cohort claim link. Business contact + interest
-- only — never PHI. Additive + fully idempotent.

CREATE TABLE IF NOT EXISTS "ClaimRequest" (
  "id" TEXT NOT NULL,
  "cohort" TEXT NOT NULL,
  "orgName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "city" TEXT,
  "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "message" TEXT,
  "source" TEXT NOT NULL,
  "tokenEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimRequest_cohort_createdAt_idx" ON "ClaimRequest" ("cohort", "createdAt");
CREATE INDEX IF NOT EXISTS "ClaimRequest_contactEmail_idx" ON "ClaimRequest" ("contactEmail");
