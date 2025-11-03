/*
  Warnings:

  - You are about to drop the `AdmissionFitScore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComplianceRecord` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `ResidentNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('OPEN', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "AdmissionFitScore" DROP CONSTRAINT "AdmissionFitScore_residentId_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceRecord" DROP CONSTRAINT "ComplianceRecord_residentId_fkey";

-- AlterTable
ALTER TABLE "ResidentNote" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "AdmissionFitScore";

-- DropTable
DROP TABLE "ComplianceRecord";

-- CreateTable
CREATE TABLE "ResidentContact" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentComplianceItem" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "owner" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentContact_residentId_idx" ON "ResidentContact"("residentId");

-- CreateIndex
CREATE INDEX "ResidentContact_isPrimary_idx" ON "ResidentContact"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentContact_residentId_email_key" ON "ResidentContact"("residentId", "email");

-- CreateIndex
CREATE INDEX "ResidentComplianceItem_residentId_idx" ON "ResidentComplianceItem"("residentId");

-- CreateIndex
CREATE INDEX "ResidentComplianceItem_status_idx" ON "ResidentComplianceItem"("status");

-- CreateIndex
CREATE INDEX "ResidentComplianceItem_dueDate_idx" ON "ResidentComplianceItem"("dueDate");

-- AddForeignKey
ALTER TABLE "ResidentContact" ADD CONSTRAINT "ResidentContact_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentComplianceItem" ADD CONSTRAINT "ResidentComplianceItem_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
