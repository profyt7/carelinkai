-- AlterEnum
-- Add new status values to InquiryStatus enum
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'QUALIFIED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CONVERTING';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

-- AlterTable
-- Add conversion tracking fields to Inquiry table
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "convertedToResidentId" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "conversionDate" TIMESTAMP(3);
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "convertedByUserId" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "conversionNotes" TEXT;

-- CreateIndex
-- Add unique constraint on convertedToResidentId (one-to-one relationship)
CREATE UNIQUE INDEX IF NOT EXISTS "Inquiry_convertedToResidentId_key" ON "Inquiry"("convertedToResidentId");

-- CreateIndex
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "Inquiry_convertedToResidentId_idx" ON "Inquiry"("convertedToResidentId");
CREATE INDEX IF NOT EXISTS "Inquiry_convertedByUserId_idx" ON "Inquiry"("convertedByUserId");
CREATE INDEX IF NOT EXISTS "Inquiry_conversionDate_idx" ON "Inquiry"("conversionDate");

-- AddForeignKey
-- Add foreign key constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Inquiry_convertedToResidentId_fkey'
  ) THEN
    ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_convertedToResidentId_fkey" 
    FOREIGN KEY ("convertedToResidentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Inquiry_convertedByUserId_fkey'
  ) THEN
    ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_convertedByUserId_fkey" 
    FOREIGN KEY ("convertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
