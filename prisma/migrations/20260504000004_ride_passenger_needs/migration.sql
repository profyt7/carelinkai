-- Replace single wheelchairRequired flag with full passenger needs fields
ALTER TABLE "Ride" DROP COLUMN IF EXISTS "wheelchairRequired";

ALTER TABLE "Ride" ADD COLUMN "mobilityLevel"   TEXT;
ALTER TABLE "Ride" ADD COLUMN "doorToDoorLevel" TEXT;
ALTER TABLE "Ride" ADD COLUMN "needsOxygen"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "hasCompanion"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "cognitionNote"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "hasServiceAnimal" BOOLEAN NOT NULL DEFAULT false;
