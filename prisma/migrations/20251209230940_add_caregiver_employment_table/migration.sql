-- Add missing CaregiverEmployment table
-- Idempotent migration

-- Create CaregiverEmployment table if it doesn't exist
CREATE TABLE IF NOT EXISTS "CaregiverEmployment" (
  "id" TEXT NOT NULL,
  "caregiverId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "position" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaregiverEmployment_pkey" PRIMARY KEY ("id")
);

-- Create indexes for CaregiverEmployment table
CREATE INDEX IF NOT EXISTS "CaregiverEmployment_caregiverId_idx" ON "CaregiverEmployment"("caregiverId");
CREATE INDEX IF NOT EXISTS "CaregiverEmployment_operatorId_idx" ON "CaregiverEmployment"("operatorId");
CREATE INDEX IF NOT EXISTS "CaregiverEmployment_isActive_idx" ON "CaregiverEmployment"("isActive");

-- Add foreign key constraints
DO $$ BEGIN
  -- CaregiverEmployment -> Caregiver
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverEmployment_caregiverId_fkey') THEN
    ALTER TABLE "CaregiverEmployment" ADD CONSTRAINT "CaregiverEmployment_caregiverId_fkey" 
      FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- CaregiverEmployment -> Operator
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaregiverEmployment_operatorId_fkey') THEN
    ALTER TABLE "CaregiverEmployment" ADD CONSTRAINT "CaregiverEmployment_operatorId_fkey" 
      FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
