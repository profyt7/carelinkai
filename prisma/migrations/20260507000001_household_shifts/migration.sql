-- CreateTable: HouseholdShift
-- Lightweight shift scheduling for FAMILY users who hire caregivers directly
CREATE TABLE IF NOT EXISTS "HouseholdShift" (
    "id"             TEXT NOT NULL,
    "familyUserId"   TEXT NOT NULL,
    "hireId"         TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd"   TIMESTAMP(3) NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdShift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HouseholdShift_familyUserId_idx" ON "HouseholdShift"("familyUserId");
CREATE INDEX IF NOT EXISTS "HouseholdShift_hireId_idx"       ON "HouseholdShift"("hireId");
CREATE INDEX IF NOT EXISTS "HouseholdShift_scheduledStart_idx" ON "HouseholdShift"("scheduledStart");

ALTER TABLE "HouseholdShift"
    ADD CONSTRAINT "HouseholdShift_familyUserId_fkey"
    FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdShift"
    ADD CONSTRAINT "HouseholdShift_hireId_fkey"
    FOREIGN KEY ("hireId") REFERENCES "MarketplaceHire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
