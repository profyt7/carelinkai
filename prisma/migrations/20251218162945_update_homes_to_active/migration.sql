-- Update all AssistedLivingHome records to ACTIVE status
-- This migration is idempotent and safe to run multiple times

UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE status = 'DRAFT' OR status IS NULL OR status = '';
