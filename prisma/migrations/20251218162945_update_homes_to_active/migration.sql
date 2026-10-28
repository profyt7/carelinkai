-- Update all AssistedLivingHome records to ACTIVE status
-- This migration is idempotent and safe to run multiple times
-- Fixed: Removed invalid empty string comparison for enum type

UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE status = 'DRAFT' OR status IS NULL;
