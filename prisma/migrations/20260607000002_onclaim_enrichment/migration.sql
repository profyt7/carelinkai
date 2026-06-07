-- On-claim website enrichment lifecycle

-- Enum for enrichment lifecycle (guard against re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrichmentStatus') THEN
    CREATE TYPE "EnrichmentStatus" AS ENUM ('NONE', 'RUNNING', 'READY', 'FAILED');
  END IF;
END$$;

ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "enrichmentStatus"    "EnrichmentStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "enrichmentStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "enrichmentError"     TEXT;
