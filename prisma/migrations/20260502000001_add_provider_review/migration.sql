-- CreateTable: ProviderReview
CREATE TABLE IF NOT EXISTS "ProviderReview" (
  "id"         TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "rating"     INTEGER NOT NULL,
  "title"      TEXT,
  "content"    TEXT,
  "isPublic"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderReview_pkey" PRIMARY KEY ("id")
);

-- Foreign key to Provider
ALTER TABLE "ProviderReview"
  ADD CONSTRAINT "ProviderReview_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "ProviderReview_providerId_idx" ON "ProviderReview"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderReview_rating_idx" ON "ProviderReview"("rating");
