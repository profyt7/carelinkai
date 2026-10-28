-- Add Communications System: Broadcast model, Message enhancements, Notification updates

-- Create Broadcast table if not exists
CREATE TABLE IF NOT EXISTS "Broadcast" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetRole" "UserRole",
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- Add columns to Message table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'subject') THEN
        ALTER TABLE "Message" ADD COLUMN "subject" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'broadcastId') THEN
        ALTER TABLE "Message" ADD COLUMN "broadcastId" TEXT;
    END IF;
END $$;

-- Add link column to Notification table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'link') THEN
        ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
    END IF;
END $$;

-- Add new NotificationType values if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BROADCAST' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'BROADCAST';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ALERT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ALERT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANNOUNCEMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT';
    END IF;
END $$;

-- Create indexes for Broadcast table
CREATE INDEX IF NOT EXISTS "Broadcast_senderId_idx" ON "Broadcast"("senderId");
CREATE INDEX IF NOT EXISTS "Broadcast_targetRole_idx" ON "Broadcast"("targetRole");
CREATE INDEX IF NOT EXISTS "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

-- Create index for Message.broadcastId
CREATE INDEX IF NOT EXISTS "Message_broadcastId_idx" ON "Message"("broadcastId");

-- Create index for Notification.createdAt
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Add foreign key constraint for Message.broadcastId if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Message_broadcastId_fkey') THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
