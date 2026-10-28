-- Trip verification timestamps (anti-fraud proof of presence)
ALTER TABLE "Ride" ADD COLUMN "actualPickupAt"  TIMESTAMP(3);
ALTER TABLE "Ride" ADD COLUMN "actualDropoffAt" TIMESTAMP(3);

-- No-show accountability
ALTER TABLE "Ride" ADD COLUMN "noShowCausedBy"  TEXT;

-- Recurring series tracking
ALTER TABLE "Ride" ADD COLUMN "recurringRootId" TEXT;

CREATE INDEX "Ride_recurringRootId_idx" ON "Ride"("recurringRootId");
