-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TourOutcome" AS ENUM ('SHOWED_UP', 'NO_SHOW', 'CONVERTED', 'NOT_CONVERTED');

-- CreateTable
CREATE TABLE "TourRequest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "requestedTimes" JSONB NOT NULL,
    "aiSuggestedTimes" JSONB,
    "confirmedTime" TIMESTAMP(3),
    "status" "TourStatus" NOT NULL DEFAULT 'PENDING',
    "outcome" "TourOutcome",
    "familyNotes" TEXT,
    "operatorNotes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourSlot" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TourRequest_familyId_idx" ON "TourRequest"("familyId");

-- CreateIndex
CREATE INDEX "TourRequest_homeId_idx" ON "TourRequest"("homeId");

-- CreateIndex
CREATE INDEX "TourRequest_operatorId_idx" ON "TourRequest"("operatorId");

-- CreateIndex
CREATE INDEX "TourRequest_status_idx" ON "TourRequest"("status");

-- CreateIndex
CREATE INDEX "TourRequest_confirmedTime_idx" ON "TourRequest"("confirmedTime");

-- CreateIndex
CREATE INDEX "TourRequest_createdAt_idx" ON "TourRequest"("createdAt");

-- CreateIndex
CREATE INDEX "TourSlot_homeId_idx" ON "TourSlot"("homeId");

-- CreateIndex
CREATE INDEX "TourSlot_dayOfWeek_idx" ON "TourSlot"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TourSlot_isActive_idx" ON "TourSlot"("isActive");

-- AddForeignKey
ALTER TABLE "TourRequest" ADD CONSTRAINT "TourRequest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourRequest" ADD CONSTRAINT "TourRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourRequest" ADD CONSTRAINT "TourRequest_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourSlot" ADD CONSTRAINT "TourSlot_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
