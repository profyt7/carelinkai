-- CreateTable
-- Create FavoriteProvider table for families to favorite/shortlist providers
CREATE TABLE "FavoriteProvider" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FavoriteProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteProvider_familyId_providerId_key" ON "FavoriteProvider"("familyId", "providerId");

-- CreateIndex
CREATE INDEX "FavoriteProvider_familyId_idx" ON "FavoriteProvider"("familyId");

-- CreateIndex
CREATE INDEX "FavoriteProvider_providerId_idx" ON "FavoriteProvider"("providerId");

-- AddForeignKey
ALTER TABLE "FavoriteProvider" ADD CONSTRAINT "FavoriteProvider_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteProvider" ADD CONSTRAINT "FavoriteProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
