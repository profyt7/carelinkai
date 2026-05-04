-- Add shared ride grouping fields and provider vehicle capacity
ALTER TABLE "Ride" ADD COLUMN "isSharedRide"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "sharedRideGroupId" TEXT;

ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "vehicleCapacity" INTEGER NOT NULL DEFAULT 4;

CREATE INDEX IF NOT EXISTS "Ride_sharedRideGroupId_idx" ON "Ride"("sharedRideGroupId");
