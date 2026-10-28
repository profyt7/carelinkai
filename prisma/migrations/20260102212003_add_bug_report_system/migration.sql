-- CreateEnum: BugSeverity
DO $$ BEGIN
    CREATE TYPE "BugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: BugStatus
DO $$ BEGIN
    CREATE TYPE "BugStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: BugReport
CREATE TABLE IF NOT EXISTS "BugReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userType" "UserRole",
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stepsToReproduce" TEXT,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "pageUrl" TEXT NOT NULL,
    "browserInfo" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "screenshotUrl" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add indexes for BugReport table
CREATE INDEX IF NOT EXISTS "BugReport_status_idx" ON "BugReport"("status");
CREATE INDEX IF NOT EXISTS "BugReport_severity_idx" ON "BugReport"("severity");
CREATE INDEX IF NOT EXISTS "BugReport_userEmail_idx" ON "BugReport"("userEmail");
CREATE INDEX IF NOT EXISTS "BugReport_createdAt_idx" ON "BugReport"("createdAt");
CREATE INDEX IF NOT EXISTS "BugReport_assignedTo_idx" ON "BugReport"("assignedTo");
