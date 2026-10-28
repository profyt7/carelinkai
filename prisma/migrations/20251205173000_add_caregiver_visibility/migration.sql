-- Add isVisibleInMarketplace column to Caregiver and index
ALTER TABLE "Caregiver"
ADD COLUMN IF NOT EXISTS "isVisibleInMarketplace" BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster filtering in marketplace queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'Caregiver_isVisibleInMarketplace_idx'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "Caregiver_isVisibleInMarketplace_idx" ON "Caregiver"("isVisibleInMarketplace");
  END IF;
END $$;
