-- Fix Home Status Migration
-- Updates Sunshine Care Home status to ACTIVE
-- This migration is idempotent and can be run multiple times safely

-- Update homes with slug 'home_1' or name containing 'Sunshine Care'
UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE 
  (slug = 'home_1' OR name LIKE '%Sunshine Care%')
  AND status != 'ACTIVE';

-- Display affected rows for verification
SELECT id, slug, name, status 
FROM "AssistedLivingHome"
WHERE slug = 'home_1' OR name LIKE '%Sunshine Care%';
