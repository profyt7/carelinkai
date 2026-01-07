-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS "ImpersonationSession" CASCADE;

-- CreateTable
CREATE TABLE "ImpersonationSession" (
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

-- CreateIndex
CREATE INDEX "ImpersonationSession_adminId_idx" ON "ImpersonationSession"("adminId");

-- CreateIndex
CREATE INDEX "ImpersonationSession_targetUserId_idx" ON "ImpersonationSession"("targetUserId");

-- CreateIndex
CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
