-- Add checkrCandidateId to Provider
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "checkrCandidateId" TEXT;

-- Create ProviderBackgroundCheckOrder table
CREATE TABLE IF NOT EXISTS "ProviderBackgroundCheckOrder" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "orderedByType" "BackgroundCheckOrderer" NOT NULL,
    "orderedByUserId" TEXT,
    "status" "BackgroundCheckStatus" NOT NULL DEFAULT 'PENDING',
    "packageType" "BackgroundCheckPackage" NOT NULL DEFAULT 'BASIC',
    "checkrPackageName" TEXT NOT NULL DEFAULT 'basic',
    "checkrReportId" TEXT,
    "reportUrl" TEXT,
    "pricePaid" DECIMAL(10,2),
    "stripePaymentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderBackgroundCheckOrder_pkey" PRIMARY KEY ("id")
);

-- Unique and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderBackgroundCheckOrder_checkrReportId_key" ON "ProviderBackgroundCheckOrder"("checkrReportId");
CREATE INDEX IF NOT EXISTS "ProviderBackgroundCheckOrder_providerId_idx" ON "ProviderBackgroundCheckOrder"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderBackgroundCheckOrder_orderedByUserId_idx" ON "ProviderBackgroundCheckOrder"("orderedByUserId");
CREATE INDEX IF NOT EXISTS "ProviderBackgroundCheckOrder_status_idx" ON "ProviderBackgroundCheckOrder"("status");

-- Foreign key
ALTER TABLE "ProviderBackgroundCheckOrder"
    ADD CONSTRAINT "ProviderBackgroundCheckOrder_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
