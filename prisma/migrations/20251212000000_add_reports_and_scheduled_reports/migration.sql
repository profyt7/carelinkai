-- CreateEnum: ReportType
DO $$ BEGIN
  CREATE TYPE "ReportType" AS ENUM ('OCCUPANCY', 'FINANCIAL', 'INCIDENT', 'CAREGIVER', 'COMPLIANCE', 'INQUIRY', 'RESIDENT', 'FACILITY_COMPARISON', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ReportFormat
DO $$ BEGIN
  CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ReportSchedule
DO $$ BEGIN
  CREATE TYPE "ReportSchedule" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum: Add report actions to AuditAction
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REPORT_GENERATED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'REPORT_GENERATED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REPORT_SCHEDULED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REPORT_DOWNLOADED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'REPORT_DOWNLOADED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Report
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "fileUrl" TEXT,
    "config" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScheduledReport
CREATE TABLE IF NOT EXISTS "ScheduledReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "schedule" "ReportSchedule" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "recipients" TEXT[],
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_generatedBy_idx" ON "Report"("generatedBy");
CREATE INDEX IF NOT EXISTS "Report_type_idx" ON "Report"("type");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledReport_createdBy_idx" ON "ScheduledReport"("createdBy");
CREATE INDEX IF NOT EXISTS "ScheduledReport_enabled_idx" ON "ScheduledReport"("enabled");
CREATE INDEX IF NOT EXISTS "ScheduledReport_nextRun_idx" ON "ScheduledReport"("nextRun");
CREATE INDEX IF NOT EXISTS "ScheduledReport_type_idx" ON "ScheduledReport"("type");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_generatedBy_fkey'
  ) THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedBy_fkey" 
    FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledReport_createdBy_fkey'
  ) THEN
    ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
