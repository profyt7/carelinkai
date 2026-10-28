-- CreateTable
CREATE TABLE "FavoriteHome" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FavoriteHome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteHome_familyId_homeId_key" ON "FavoriteHome"("familyId", "homeId");

-- CreateIndex
CREATE INDEX "FavoriteHome_familyId_idx" ON "FavoriteHome"("familyId");

-- CreateIndex
CREATE INDEX "FavoriteHome_homeId_idx" ON "FavoriteHome"("homeId");

-- CreateIndex
CREATE INDEX "FavoriteHome_createdAt_idx" ON "FavoriteHome"("createdAt");

-- AddForeignKey
ALTER TABLE "FavoriteHome" ADD CONSTRAINT "FavoriteHome_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteHome" ADD CONSTRAINT "FavoriteHome_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
