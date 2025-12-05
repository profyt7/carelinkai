-- AlterTable
ALTER TABLE "Caregiver" ADD COLUMN     "isVisibleInMarketplace" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

