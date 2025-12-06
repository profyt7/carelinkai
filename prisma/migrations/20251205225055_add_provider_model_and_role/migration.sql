-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PROVIDER';

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "logoUrl" TEXT,
    "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverageCity" TEXT,
    "coverageState" TEXT,
    "coverageRadius" INTEGER,
    "isVisibleInMarketplace" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_key" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_coverageCity_coverageState_idx" ON "Provider"("coverageCity", "coverageState");

-- CreateIndex
CREATE INDEX "Provider_isVisibleInMarketplace_idx" ON "Provider"("isVisibleInMarketplace");

-- CreateIndex
CREATE INDEX "Provider_isVerified_idx" ON "Provider"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

