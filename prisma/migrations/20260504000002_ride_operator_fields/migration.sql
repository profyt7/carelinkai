-- AlterTable: add operator support + resident fields to Ride
ALTER TABLE "Ride"
  ADD COLUMN "operatorId" TEXT,
  ADD COLUMN "residentName" TEXT,
  ADD COLUMN "residentId" TEXT,
  ADD COLUMN "bookedByRole" TEXT NOT NULL DEFAULT 'FAMILY';

-- Make familyId nullable (operator-booked rides don't have a family)
ALTER TABLE "Ride" ALTER COLUMN "familyId" DROP NOT NULL;

-- AddForeignKey for operator
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_operatorId_fkey"
  FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Ride_operatorId_idx" ON "Ride"("operatorId");
