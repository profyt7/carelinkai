-- Add email verification token fields to User table
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationTokenExpiry" TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX "User_verificationToken_idx" ON "User"("verificationToken");

-- Add comment explaining the fields
COMMENT ON COLUMN "User"."verificationToken" IS 'Token sent in verification emails';
COMMENT ON COLUMN "User"."verificationTokenExpiry" IS 'Expiration timestamp for the verification token';
