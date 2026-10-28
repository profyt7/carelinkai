-- Add seededHomeId to Operator for tracking which admin-seeded home was assigned
-- via a Cleveland founder claim token. Cleared after the operator claims the home.
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "seededHomeId" TEXT;
