-- AlterTable
ALTER TABLE "Caregiver" ADD COLUMN     "careTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "settings" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "FavoriteCaregiver" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FavoriteCaregiver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteCaregiver_familyId_idx" ON "FavoriteCaregiver"("familyId");

-- CreateIndex
CREATE INDEX "FavoriteCaregiver_caregiverId_idx" ON "FavoriteCaregiver"("caregiverId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCaregiver_familyId_caregiverId_key" ON "FavoriteCaregiver"("familyId", "caregiverId");

-- CreateIndex
CREATE INDEX "Caregiver_hourlyRate_idx" ON "Caregiver"("hourlyRate");

-- CreateIndex
CREATE INDEX "Caregiver_yearsExperience_idx" ON "Caregiver"("yearsExperience");

-- CreateIndex
CREATE INDEX "Caregiver_createdAt_idx" ON "Caregiver"("createdAt");

-- CreateIndex
CREATE INDEX "User_firstName_idx" ON "User"("firstName");

-- CreateIndex
CREATE INDEX "User_lastName_idx" ON "User"("lastName");

-- AddForeignKey
ALTER TABLE "FavoriteCaregiver" ADD CONSTRAINT "FavoriteCaregiver_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCaregiver" ADD CONSTRAINT "FavoriteCaregiver_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
