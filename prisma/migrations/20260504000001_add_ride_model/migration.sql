-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "leadId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "tripPurpose" TEXT,
    "mobilityNeeds" TEXT,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "specialRequests" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "baseFare" DECIMAL(10,2),
    "platformFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "platformFee" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "canceledBy" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ride_familyId_idx" ON "Ride"("familyId");
CREATE INDEX "Ride_providerId_idx" ON "Ride"("providerId");
CREATE INDEX "Ride_status_idx" ON "Ride"("status");
CREATE INDEX "Ride_scheduledAt_idx" ON "Ride"("scheduledAt");
CREATE INDEX "Ride_leadId_idx" ON "Ride"("leadId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
