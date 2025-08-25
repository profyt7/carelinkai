-- CreateEnum
CREATE TYPE "ShiftApplicationStatus" AS ENUM ('APPLIED', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "CaregiverShift" ADD COLUMN     "appointmentId" TEXT;

-- CreateTable
CREATE TABLE "ShiftApplication" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "status" "ShiftApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "offeredAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftApplication_shiftId_idx" ON "ShiftApplication"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftApplication_caregiverId_idx" ON "ShiftApplication"("caregiverId");

-- CreateIndex
CREATE INDEX "ShiftApplication_status_idx" ON "ShiftApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftApplication_shiftId_caregiverId_key" ON "ShiftApplication"("shiftId", "caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverShift_appointmentId_idx" ON "CaregiverShift"("appointmentId");

-- AddForeignKey
ALTER TABLE "ShiftApplication" ADD CONSTRAINT "ShiftApplication_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CaregiverShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftApplication" ADD CONSTRAINT "ShiftApplication_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
