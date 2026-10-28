-- Drop unique constraint on preferredContactMethod if it exists
-- This fixes the P2002 error where multiple users couldn't have the same contact preference

-- Drop any unique index on preferredContactMethod (try multiple possible names)
DROP INDEX IF EXISTS "User_preferredContactMethod_key";
DROP INDEX IF EXISTS "User_preferredContactMethod_idx";

-- Add the column if it doesn't exist (as non-unique)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredContactMethod" TEXT;
