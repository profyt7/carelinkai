-- AI-Powered Matching Engine Migration
-- This migration creates tables and enums for the AI matching feature
-- Idempotent design: Can be run multiple times safely

-- Step 1: Create MatchStatus enum
DO $$ BEGIN
    CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create FeedbackType enum
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN', 'PLACEMENT_CONFIRMED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create MatchRequest table
CREATE TABLE IF NOT EXISTS "MatchRequest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    
    -- Budget preferences
    "budgetMin" DECIMAL(10,2) NOT NULL,
    "budgetMax" DECIMAL(10,2) NOT NULL,
    
    -- Medical conditions (array of strings)
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Care level required
    "careLevel" TEXT NOT NULL,
    
    -- Preferences
    "preferredGender" TEXT,
    "religion" TEXT,
    "dietaryNeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "petPreferences" TEXT,
    
    -- Location
    "zipCode" TEXT NOT NULL,
    "maxDistance" INTEGER NOT NULL,
    
    -- Timeline
    "moveInTimeline" TEXT NOT NULL,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "MatchRequest_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create MatchResult table
CREATE TABLE IF NOT EXISTS "MatchResult" (
    "id" TEXT NOT NULL,
    "matchRequestId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "fitScore" DECIMAL(5,2) NOT NULL,
    
    -- Match factors breakdown (stored as JSON)
    "matchFactors" JSONB NOT NULL,
    
    -- AI-generated explanation
    "explanation" TEXT NOT NULL,
    
    -- Ranking
    "rank" INTEGER NOT NULL,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create MatchFeedback table
CREATE TABLE IF NOT EXISTS "MatchFeedback" (
    "id" TEXT NOT NULL,
    "matchRequestId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    
    -- Additional context
    "notes" TEXT,
    
    -- User who provided feedback
    "userId" TEXT NOT NULL,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

-- Step 6: Add foreign key constraints (with idempotent checks)
DO $$ BEGIN
    ALTER TABLE "MatchRequest" ADD CONSTRAINT "MatchRequest_familyId_fkey" 
        FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchRequestId_fkey" 
        FOREIGN KEY ("matchRequestId") REFERENCES "MatchRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_homeId_fkey" 
        FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_matchRequestId_fkey" 
        FOREIGN KEY ("matchRequestId") REFERENCES "MatchRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_homeId_fkey" 
        FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS "MatchRequest_familyId_idx" ON "MatchRequest"("familyId");
CREATE INDEX IF NOT EXISTS "MatchRequest_status_idx" ON "MatchRequest"("status");
CREATE INDEX IF NOT EXISTS "MatchRequest_createdAt_idx" ON "MatchRequest"("createdAt");

CREATE INDEX IF NOT EXISTS "MatchResult_matchRequestId_idx" ON "MatchResult"("matchRequestId");
CREATE INDEX IF NOT EXISTS "MatchResult_homeId_idx" ON "MatchResult"("homeId");
CREATE INDEX IF NOT EXISTS "MatchResult_fitScore_idx" ON "MatchResult"("fitScore");
CREATE INDEX IF NOT EXISTS "MatchResult_rank_idx" ON "MatchResult"("rank");

CREATE INDEX IF NOT EXISTS "MatchFeedback_matchRequestId_idx" ON "MatchFeedback"("matchRequestId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_homeId_idx" ON "MatchFeedback"("homeId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_userId_idx" ON "MatchFeedback"("userId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_feedbackType_idx" ON "MatchFeedback"("feedbackType");

-- Migration complete
