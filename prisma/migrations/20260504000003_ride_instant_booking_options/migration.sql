-- Provider pricing fields for instant booking
ALTER TABLE "Provider" ADD COLUMN "rateBaseFare" DECIMAL(10,2);
ALTER TABLE "Provider" ADD COLUMN "ratePerMile" DECIMAL(10,2);
ALTER TABLE "Provider" ADD COLUMN "rateWaitPerHour" DECIMAL(10,2);
ALTER TABLE "Provider" ADD COLUMN "instantBook" BOOLEAN NOT NULL DEFAULT false;

-- Ride: instant pricing fields
ALTER TABLE "Ride" ADD COLUMN "estimatedMiles" DECIMAL(8,2);
ALTER TABLE "Ride" ADD COLUMN "estimatedFare" DECIMAL(10,2);

-- Ride: options
ALTER TABLE "Ride" ADD COLUMN "wheelchairRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "waitTimeMinutes" INTEGER;
ALTER TABLE "Ride" ADD COLUMN "waitFare" DECIMAL(10,2);

-- Ride: return trip
ALTER TABLE "Ride" ADD COLUMN "needsReturn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "returnScheduledAt" TIMESTAMP(3);
ALTER TABLE "Ride" ADD COLUMN "returnRideId" TEXT;
ALTER TABLE "Ride" ADD COLUMN "parentRideId" TEXT;

-- Ride: recurring
ALTER TABLE "Ride" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ride" ADD COLUMN "recurringFrequency" TEXT;
ALTER TABLE "Ride" ADD COLUMN "recurringEndDate" TIMESTAMP(3);

-- Indexes
CREATE UNIQUE INDEX "Ride_returnRideId_key" ON "Ride"("returnRideId");
CREATE INDEX "Ride_parentRideId_idx" ON "Ride"("parentRideId");
