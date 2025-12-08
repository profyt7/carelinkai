-- AlterTable: Add medical fields to Resident model
ALTER TABLE "Resident" ADD COLUMN "allergies" TEXT,
ADD COLUMN "dietaryRestrictions" TEXT;

-- Note: medicalConditions, medications, and careNeeds already exist
-- These fields store encrypted medical information for HIPAA compliance
