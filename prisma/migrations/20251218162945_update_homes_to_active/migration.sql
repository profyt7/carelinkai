-- Update all AssistedLivingHome records to ACTIVE status
-- This migration is idempotent and safe to run multiple times

UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE status = 'DRAFT' OR status IS NULL OR status = '';

-- Verify the update
-- This will show how many homes were updated
SELECT 
  COUNT(*) as total_homes,
  SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_homes,
  SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_homes
FROM "AssistedLivingHome";
