-- AddHomeSlugField: Add optional slug field for friendly URLs
-- This allows querying homes by either UUID or slug (e.g., "home_1")

-- Add slug column (nullable to allow existing records)
ALTER TABLE "AssistedLivingHome" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Create unique index on slug (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS "AssistedLivingHome_slug_key" ON "AssistedLivingHome"("slug");

-- Optional: Populate slug for existing homes (format: home_<row_number>)
-- This can be uncommented if you want to auto-generate slugs for existing data
-- WITH numbered_homes AS (
--   SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
--   FROM "AssistedLivingHome"
--   WHERE slug IS NULL
-- )
-- UPDATE "AssistedLivingHome" h
-- SET slug = 'home_' || n.rn
-- FROM numbered_homes n
-- WHERE h.id = n.id;
