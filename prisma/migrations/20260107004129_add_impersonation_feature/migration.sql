-- Idempotent CreateTable (only creates if it doesn't exist)
CREATE TABLE IF NOT EXISTS "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- Idempotent CreateIndex (only creates if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ImpersonationSession_adminId_idx') THEN
        CREATE INDEX "ImpersonationSession_adminId_idx" ON "ImpersonationSession"("adminId");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ImpersonationSession_targetUserId_idx') THEN
        CREATE INDEX "ImpersonationSession_targetUserId_idx" ON "ImpersonationSession"("targetUserId");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ImpersonationSession_expiresAt_idx') THEN
        CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");
    END IF;
END $$;

-- Idempotent AddForeignKey (only creates if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ImpersonationSession_adminId_fkey'
    ) THEN
        ALTER TABLE "ImpersonationSession" 
        ADD CONSTRAINT "ImpersonationSession_adminId_fkey" 
        FOREIGN KEY ("adminId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ImpersonationSession_targetUserId_fkey'
    ) THEN
        ALTER TABLE "ImpersonationSession" 
        ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey" 
        FOREIGN KEY ("targetUserId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterEnum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IMPERSONATION_STARTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'IMPERSONATION_STARTED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IMPERSONATION_STOPPED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')) THEN
        ALTER TYPE "AuditAction" ADD VALUE 'IMPERSONATION_STOPPED';
    END IF;
END $$;
