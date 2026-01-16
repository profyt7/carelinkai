# Export History 500 Error Investigation Report

**Date:** January 16, 2026  
**Endpoint:** `/api/admin/exports/history`  
**Error:** 500 Internal Server Error  

---

## Root Cause Identified ✅

**The `ExportHistory` database table does not exist in production.**

### Evidence:

1. **Prisma Schema** (`prisma/schema.prisma`):
   - `ExportHistory` model is defined ✅
   - `ExportStatus` enum is defined ✅

2. **Database Migrations** (`prisma/migrations/`):
   - **NO migration exists** for the `ExportHistory` table ❌
   - Searched all migration files - none contain `ExportHistory` or `ExportStatus`

3. **API Route** (`src/app/api/admin/exports/history/route.ts`):
   - Line 17: `await prisma.exportHistory.findMany({...})`
   - This query fails because the table doesn't exist

---

## Technical Details

### What Happens:
1. User visits Data Exports page or triggers export
2. Frontend calls `/api/admin/exports/history`
3. API attempts `prisma.exportHistory.findMany()`
4. Prisma throws error: **table "ExportHistory" does not exist**
5. Returns 500 Internal Server Error

### Affected Functionality:
- `/api/admin/exports/history` - GET export history ❌
- `saveExportHistory()` in `src/lib/export-utils.ts` - Saving exports ❌
- Data Exports page - Shows "No exports yet" (catches error silently)

---

## Fix Required

### Create Migration for ExportHistory Table

Create a new migration file: `prisma/migrations/20260116_add_export_history/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "downloadUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedById" TEXT NOT NULL,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportHistory_exportedById_idx" ON "ExportHistory"("exportedById");

-- CreateIndex
CREATE INDEX "ExportHistory_exportType_idx" ON "ExportHistory"("exportType");

-- CreateIndex
CREATE INDEX "ExportHistory_createdAt_idx" ON "ExportHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## Recommended Actions

1. **Create Migration**: Run `npx prisma migrate dev --name add_export_history`
2. **Test Locally**: Verify the migration applies successfully
3. **Deploy**: Push to GitHub to trigger Render deployment
4. **Verify**: Check `/api/admin/exports/history` returns 200 after deployment

---

## Notes

- Export functionality itself works (files download correctly)
- History tracking silently fails (error is caught in `saveExportHistory`)
- This explains why "No exports yet" shows despite successful exports
