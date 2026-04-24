-- Add affiliateCode to Inquiry for referral tracking
ALTER TABLE "Inquiry" ADD COLUMN "affiliateCode" TEXT;
CREATE INDEX "Inquiry_affiliateCode_idx" ON "Inquiry"("affiliateCode");
