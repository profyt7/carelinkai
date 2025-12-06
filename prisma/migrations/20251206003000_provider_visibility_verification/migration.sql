-- Provider visibility & verification fields
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "isVisibleInMarketplace" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;

-- Indexes to accelerate common queries
CREATE INDEX IF NOT EXISTS "Provider_isVisibleInMarketplace_idx" ON "Provider"("isVisibleInMarketplace");
CREATE INDEX IF NOT EXISTS "Provider_isVerified_idx" ON "Provider"("isVerified");
