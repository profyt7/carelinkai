-- Idempotent migration to add AI-generated profile fields to AssistedLivingHome table
-- This migration can be run multiple times safely (Feature #2)

-- ==================== AssistedLivingHome Table ====================

-- Add aiGeneratedDescription column to AssistedLivingHome
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssistedLivingHome' AND column_name='aiGeneratedDescription') THEN
        ALTER TABLE "AssistedLivingHome" ADD COLUMN "aiGeneratedDescription" TEXT;
    END IF;
END $$;

-- Add highlights column to AssistedLivingHome (array of strings)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssistedLivingHome' AND column_name='highlights') THEN
        ALTER TABLE "AssistedLivingHome" ADD COLUMN "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- Add lastProfileGenerated column to AssistedLivingHome
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssistedLivingHome' AND column_name='lastProfileGenerated') THEN
        ALTER TABLE "AssistedLivingHome" ADD COLUMN "lastProfileGenerated" TIMESTAMP(3);
    END IF;
END $$;

-- ==================== Create Indexes (Idempotent) ====================

-- Create index for lastProfileGenerated if it doesn't exist
CREATE INDEX IF NOT EXISTS "AssistedLivingHome_lastProfileGenerated_idx" ON "AssistedLivingHome"("lastProfileGenerated");
