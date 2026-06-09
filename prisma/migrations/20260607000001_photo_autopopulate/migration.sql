-- Photo auto-population (scraped operator marketing photos) + image-rights acknowledgment

-- Provenance fields on HomePhoto so the UI can distinguish auto-populated photos
-- from operator-uploaded ones and show "remove" affordances.
ALTER TABLE "HomePhoto"
  ADD COLUMN IF NOT EXISTS "autoPopulated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sourceUrl"     TEXT;

-- Operator acknowledgment that they have rights to use website photos/content.
-- Recorded when a seeded listing is claimed.
ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "imageRightsAcknowledgedAt" TIMESTAMP(3);
