-- CreateEnum for Feature #4: AI-Powered Inquiry Response System
DO $$ BEGIN
  CREATE TYPE "InquiryUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InquirySource" AS ENUM ('WEBSITE', 'PHONE', 'EMAIL', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'ANY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResponseType" AS ENUM ('AI_GENERATED', 'MANUAL', 'AUTOMATED', 'TEMPLATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResponseChannel" AS ENUM ('EMAIL', 'SMS', 'PHONE', 'IN_APP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResponseStatus" AS ENUM ('DRAFT', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpType" AS ENUM ('EMAIL', 'SMS', 'PHONE_CALL', 'TASK', 'REMINDER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'CANCELLED', 'OVERDUE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add new columns to Inquiry table
ALTER TABLE "Inquiry" 
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "careRecipientName" TEXT,
  ADD COLUMN IF NOT EXISTS "careRecipientAge" INTEGER,
  ADD COLUMN IF NOT EXISTS "careNeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "additionalInfo" TEXT,
  ADD COLUMN IF NOT EXISTS "urgency" "InquiryUrgency" DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "source" "InquirySource" DEFAULT 'WEBSITE',
  ADD COLUMN IF NOT EXISTS "preferredContactMethod" "ContactMethod" DEFAULT 'EMAIL',
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

-- CreateTable: InquiryResponse
CREATE TABLE IF NOT EXISTS "InquiryResponse" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ResponseType" NOT NULL DEFAULT 'AI_GENERATED',
    "channel" "ResponseChannel" NOT NULL DEFAULT 'EMAIL',
    "sentBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "status" "ResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "subject" TEXT,
    "toAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FollowUp
CREATE TABLE IF NOT EXISTS "FollowUp" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "type" "FollowUpType" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "content" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Inquiry table indexes
CREATE INDEX IF NOT EXISTS "Inquiry_assignedToId_idx" ON "Inquiry"("assignedToId");
CREATE INDEX IF NOT EXISTS "Inquiry_urgency_idx" ON "Inquiry"("urgency");
CREATE INDEX IF NOT EXISTS "Inquiry_source_idx" ON "Inquiry"("source");
CREATE INDEX IF NOT EXISTS "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex: InquiryResponse indexes
CREATE INDEX IF NOT EXISTS "InquiryResponse_inquiryId_idx" ON "InquiryResponse"("inquiryId");
CREATE INDEX IF NOT EXISTS "InquiryResponse_type_idx" ON "InquiryResponse"("type");
CREATE INDEX IF NOT EXISTS "InquiryResponse_channel_idx" ON "InquiryResponse"("channel");
CREATE INDEX IF NOT EXISTS "InquiryResponse_status_idx" ON "InquiryResponse"("status");
CREATE INDEX IF NOT EXISTS "InquiryResponse_sentAt_idx" ON "InquiryResponse"("sentAt");
CREATE INDEX IF NOT EXISTS "InquiryResponse_createdAt_idx" ON "InquiryResponse"("createdAt");

-- CreateIndex: FollowUp indexes
CREATE INDEX IF NOT EXISTS "FollowUp_inquiryId_idx" ON "FollowUp"("inquiryId");
CREATE INDEX IF NOT EXISTS "FollowUp_scheduledFor_idx" ON "FollowUp"("scheduledFor");
CREATE INDEX IF NOT EXISTS "FollowUp_status_idx" ON "FollowUp"("status");
CREATE INDEX IF NOT EXISTS "FollowUp_type_idx" ON "FollowUp"("type");
CREATE INDEX IF NOT EXISTS "FollowUp_createdAt_idx" ON "FollowUp"("createdAt");

-- AddForeignKey: InquiryResponse -> Inquiry
ALTER TABLE "InquiryResponse" ADD CONSTRAINT "InquiryResponse_inquiryId_fkey" 
  FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: FollowUp -> Inquiry
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_inquiryId_fkey" 
  FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Inquiry -> User (assignedTo)
DO $$ BEGIN
  ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedToId_fkey" 
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
