-- AlterEnum
-- Add PROVIDER to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'PROVIDER';

-- CreateEnum
-- Create CredentialStatus enum for provider credentials
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateTable
-- Create Provider table
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "insuranceInfo" TEXT,
    "licenseNumber" TEXT,
    "yearsInBusiness" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serviceTypes" TEXT[],
    "coverageArea" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Create ProviderCredential table
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_key" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_businessName_idx" ON "Provider"("businessName");

-- CreateIndex
CREATE INDEX "Provider_isVerified_idx" ON "Provider"("isVerified");

-- CreateIndex
CREATE INDEX "Provider_isActive_idx" ON "Provider"("isActive");

-- CreateIndex
CREATE INDEX "Provider_serviceTypes_idx" ON "Provider"("serviceTypes");

-- CreateIndex
CREATE INDEX "Provider_createdAt_idx" ON "Provider"("createdAt");

-- CreateIndex
CREATE INDEX "ProviderCredential_providerId_idx" ON "ProviderCredential"("providerId");

-- CreateIndex
CREATE INDEX "ProviderCredential_type_idx" ON "ProviderCredential"("type");

-- CreateIndex
CREATE INDEX "ProviderCredential_status_idx" ON "ProviderCredential"("status");

-- CreateIndex
CREATE INDEX "ProviderCredential_expiresAt_idx" ON "ProviderCredential"("expiresAt");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
