-- Lead consent capture (feat/lead-consent-capture): immutable TCPA/marketing
-- consent evidence for family-facing lead forms. Both consent states recorded;
-- no FKs on purpose (records must survive deletion of the artifact they
-- evidence). Additive + fully idempotent.

CREATE TABLE IF NOT EXISTS "LeadConsent" (
  "id" TEXT NOT NULL,
  "consentGiven" BOOLEAN NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceForm" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "inquiryId" TEXT,
  "tourRequestId" TEXT,
  "leadId" TEXT,
  "demoRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadConsent_sourceForm_idx" ON "LeadConsent" ("sourceForm");
CREATE INDEX IF NOT EXISTS "LeadConsent_consentGiven_idx" ON "LeadConsent" ("consentGiven");
CREATE INDEX IF NOT EXISTS "LeadConsent_contactEmail_idx" ON "LeadConsent" ("contactEmail");
CREATE INDEX IF NOT EXISTS "LeadConsent_inquiryId_idx" ON "LeadConsent" ("inquiryId");
CREATE INDEX IF NOT EXISTS "LeadConsent_consentAt_idx" ON "LeadConsent" ("consentAt");
