# Migration Fix Guide: Phase 2 Assessments & Incidents Fields

## Issue Summary

**Failed Migration**: `20251208170953_add_assessments_incidents_fields`  
**Database**: PostgreSQL (`carelinkai_db`) on Render  
**Error Code**: P3009 - Migration failed in the target database  
**Root Cause**: The migration started but didn't complete successfully, leaving it in a "failed" state in the `_prisma_migrations` table

## Impact

- New migrations cannot be applied until the failed migration is resolved
- Phase 2 features (Assessments and Incidents tabs) may have incomplete database schema
- Production deployments are blocked

## Solution Overview

This fix includes:
1. **Migration Resolution Script**: Marks the failed migration as "rolled back"
2. **New Idempotent Migration**: Safely adds all required fields (can run multiple times)
3. **Comprehensive Testing**: Verification steps to ensure success

---

## Step-by-Step Fix Process

### Prerequisites

- Access to Render dashboard or production database
- Environment variable `DATABASE_URL` configured
- Node.js and npm installed
- Prisma CLI available (`npx prisma`)

---

### Option 1: Automated Fix (Recommended)

This uses the provided script to automate the resolution process.

#### 1. Set Database URL

If running locally, ensure your `DATABASE_URL` points to the production database:

```bash
export DATABASE_URL="postgresql://carelinkai_db_user:password@dpg-xxxx.oregon-postgres.render.com/carelinkai_db"
```

**⚠️ WARNING**: Be extremely careful when setting this. You are working with the production database!

#### 2. Run the Resolution Script

```bash
npm run migrate:resolve
```

This script will:
- Check if `DATABASE_URL` is set
- Show current migration status
- Ask for confirmation
- Mark the failed migration as "rolled back"
- Show updated migration status

**Expected Output:**
```
✅ DATABASE_URL is set

📋 Current migration status:
----------------------------
[Shows migration status including failed migration]

⚠️  This script will mark the failed migration as rolled back:
   Migration: 20251208170953_add_assessments_incidents_fields

Do you want to proceed? (yes/no): yes

🔄 Marking failed migration as rolled back...

✅ Migration marked as rolled back successfully
```

#### 3. Deploy the New Migration

```bash
npm run migrate:deploy
```

This will apply the new idempotent migration: `20251208181611_add_assessments_incidents_fields_safe`

**Expected Output:**
```
Applying migration `20251208181611_add_assessments_incidents_fields_safe`
The following migration(s) have been applied:

migrations/
  └─ 20251208181611_add_assessments_incidents_fields_safe/
    └─ migration.sql

✅ All migrations have been applied successfully
```

#### 4. Verify the Fix

Check migration status:
```bash
npx prisma migrate status
```

**Expected Output:**
```
Database schema is up to date!
```

---

### Option 2: Manual Fix

If you prefer manual control or the automated script fails:

#### 1. Connect to Production Database

Using Render Shell or your preferred SQL client.

#### 2. Check Migration Status

```bash
npx prisma migrate status
```

You should see the failed migration listed.

#### 3. Mark Migration as Rolled Back

```bash
npm run migrate:resolve-manual
```

Or directly:
```bash
npx prisma migrate resolve --rolled-back "20251208170953_add_assessments_incidents_fields"
```

#### 4. Deploy New Migration

```bash
npm run migrate:deploy
```

#### 5. Verify Success

```bash
npx prisma migrate status
```

---

### Option 3: Render Dashboard (No SSH Access)

If you're deploying via Render and don't have direct database access:

#### 1. Add Resolution Command to Render Deploy

In your Render service settings, update the **Build Command**:

```bash
npm install && npm run migrate:resolve-manual && npm run migrate:deploy && npm run build
```

**⚠️ Note**: This approach runs the resolution on every deploy. After the first successful deployment, you should remove `npm run migrate:resolve-manual` from the build command.

#### 2. Trigger a Manual Deploy

Go to your Render dashboard and trigger a manual deploy.

#### 3. Monitor Logs

Watch the deployment logs to ensure:
- Migration resolution succeeds
- New migration applies successfully
- Build completes without errors

#### 4. Verify Application

- Check that the application starts successfully
- Test the Assessments and Incidents tabs in the Operator Residents module
- Verify data persistence

---

## Verification Steps

After applying the fix, verify everything is working:

### 1. Check Database Schema

```bash
npx prisma db pull
```

This should match your `schema.prisma` file.

### 2. Check Migration History

```bash
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!
```

### 3. Test Phase 2 Features

1. Log in as an Operator
2. Navigate to a Resident detail page
3. Go to the "Assessments" tab
4. Create a new assessment
5. Go to the "Incidents" tab
6. Create a new incident
7. Verify data saves correctly

### 4. Check Application Logs

Monitor for any database errors or migration-related issues:
```bash
# On Render
# Go to your service → Logs
```

---

## Technical Details

### What the New Migration Does

The new idempotent migration (`20251208181611_add_assessments_incidents_fields_safe`) safely adds the following fields:

#### AssessmentResult Table
- `status` (TEXT) - Assessment status (COMPLETED, IN_PROGRESS, etc.)
- `conductedBy` (TEXT) - Staff member who conducted the assessment
- `conductedAt` (TIMESTAMP) - When assessment was conducted
- `notes` (TEXT) - Observations and notes
- `recommendations` (TEXT) - Recommendations based on results

#### ResidentIncident Table
- `status` (TEXT) - Incident status (REPORTED, UNDER_REVIEW, RESOLVED, etc.)
- `location` (TEXT) - Where incident occurred
- `reportedBy` (TEXT) - Staff member who reported
- `reportedAt` (TIMESTAMP) - When incident was reported
- `witnessedBy` (TEXT) - Witnesses
- `actionsTaken` (TEXT) - Immediate actions taken
- `followUpRequired` (BOOLEAN) - Whether follow-up is needed
- `resolutionNotes` (TEXT) - How incident was resolved
- `resolvedAt` (TIMESTAMP) - When incident was resolved
- `resolvedBy` (TEXT) - Staff member who resolved

#### Indexes Created
- `AssessmentResult`: conductedAt, type, status
- `ResidentIncident`: type, severity, status, reportedAt

### Why It's Idempotent

The migration uses PostgreSQL's `DO` blocks with `IF NOT EXISTS` checks:

```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='AssessmentResult' AND column_name='status') THEN
        ALTER TABLE "AssessmentResult" ADD COLUMN "status" TEXT;
    END IF;
END $$;
```

This means:
- ✅ Safe to run multiple times
- ✅ Won't fail if columns already exist
- ✅ Won't duplicate existing data
- ✅ Handles partial application gracefully

---

## Troubleshooting

### Issue: "Migration already applied"

**Cause**: The migration was already applied successfully  
**Solution**: Check `npx prisma migrate status`. If schema is up to date, no action needed.

### Issue: "Cannot connect to database"

**Cause**: `DATABASE_URL` is incorrect or database is unreachable  
**Solution**: 
1. Verify `DATABASE_URL` environment variable
2. Check database connection from Render dashboard
3. Ensure database is not paused or suspended

### Issue: "Migration fails with column already exists"

**Cause**: Partial migration was applied  
**Solution**: The new idempotent migration should handle this. If it still fails:
1. Check which columns exist: 
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name IN ('AssessmentResult', 'ResidentIncident');
   ```
2. Manually add missing columns or contact support

### Issue: "Permission denied"

**Cause**: Database user lacks ALTER TABLE permissions  
**Solution**: Ensure the database user has full permissions on the schema

### Issue: Script permission denied

**Cause**: Script file is not executable  
**Solution**: 
```bash
chmod +x scripts/resolve-failed-migration.sh
```

---

## Rollback Plan

If the fix causes issues, you can rollback:

### 1. Identify Last Good Migration

```bash
npx prisma migrate status
```

### 2. Manually Rollback (if needed)

Since Prisma doesn't have automatic rollback, you would need to:

1. Drop the new columns manually:
```sql
-- AssessmentResult
ALTER TABLE "AssessmentResult" DROP COLUMN IF EXISTS "status";
ALTER TABLE "AssessmentResult" DROP COLUMN IF EXISTS "conductedBy";
ALTER TABLE "AssessmentResult" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "AssessmentResult" DROP COLUMN IF EXISTS "recommendations";

-- ResidentIncident
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "status";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "location";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "reportedBy";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "reportedAt";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "witnessedBy";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "actionsTaken";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "followUpRequired";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "resolutionNotes";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "resolvedAt";
ALTER TABLE "ResidentIncident" DROP COLUMN IF EXISTS "resolvedBy";
```

2. Mark the new migration as rolled back:
```bash
npx prisma migrate resolve --rolled-back "20251208181611_add_assessments_incidents_fields_safe"
```

**⚠️ Note**: Only perform rollback if absolutely necessary and Phase 2 data is not critical.

---

## Post-Fix Actions

After successfully applying the fix:

1. ✅ **Remove resolution script from Render build command** (if added)
2. ✅ **Update team** about the fix
3. ✅ **Monitor application logs** for 24 hours
4. ✅ **Test Phase 2 features** thoroughly
5. ✅ **Document any additional issues** found

---

## Prevention for Future Migrations

To avoid similar issues in the future:

### 1. Always Test Migrations Locally First

```bash
# Test on local database
npm run prisma:migrate
```

### 2. Use Staging Environment

Apply migrations to staging before production:
```bash
# Set staging DATABASE_URL
export DATABASE_URL="<staging-database-url>"
npm run migrate:deploy
```

### 3. Make Migrations Idempotent

Always use `IF NOT EXISTS` or `DO` blocks for schema changes that might be partially applied.

### 4. Backup Before Major Migrations

```bash
# On Render, use their backup feature
# Or manually backup:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 5. Monitor Deployment Logs

Always watch logs during deployment to catch migration failures early.

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs on Render
2. Review Prisma documentation: https://www.prisma.io/docs/guides/migrate
3. Check the `_prisma_migrations` table directly for migration status
4. Contact the development team with:
   - Error messages
   - Migration status output
   - Database logs

---

## Quick Reference

### Common Commands

```bash
# Check migration status
npx prisma migrate status

# Resolve failed migration (automated)
npm run migrate:resolve

# Resolve failed migration (manual)
npm run migrate:resolve-manual

# Deploy migrations
npm run migrate:deploy

# Generate Prisma Client
npm run prisma:generate

# View database in Prisma Studio
npm run prisma:studio
```

### Files Modified

- `prisma/migrations/20251208181611_add_assessments_incidents_fields_safe/migration.sql` - New idempotent migration
- `scripts/resolve-failed-migration.sh` - Automated resolution script
- `package.json` - Added `migrate:resolve` and `migrate:resolve-manual` scripts
- `MIGRATION_FIX_GUIDE.md` - This documentation

### Files Renamed/Moved

- ~~`prisma/migrations/20251208170953_add_assessments_incidents_fields/` → `20251208170953_add_assessments_incidents_fields.failed_backup/`~~ (Initial rename - still in migrations directory)
- **UPDATE (Dec 8, 2025)**: `prisma/migrations/20251208170953_add_assessments_incidents_fields.failed_backup/` → `backup/failed_migrations/20251208170953_add_assessments_incidents_fields.failed_backup/`

### Why the Backup Was Moved

**Issue Discovered**: Even with the `.failed_backup` suffix, Prisma was still attempting to apply the migration because it remained in the `prisma/migrations/` directory. Prisma treats ANY folder in the migrations directory as a valid migration, regardless of naming.

**Solution**: The failed migration backup was moved out of the migrations directory entirely to `/backup/failed_migrations/` to ensure Prisma does not attempt to apply it during deployments.

**Commit**: `f231e94` - "fix: Remove failed migration backup from migrations directory"

---

## Summary

✅ **Problem**: Failed migration blocking deployments  
✅ **Solution**: Resolve failed migration + apply new idempotent migration  
✅ **Safety**: New migration can run multiple times safely  
✅ **Verification**: Multiple verification steps provided  
✅ **Support**: Comprehensive troubleshooting included  

**Estimated Time**: 5-10 minutes for resolution and deployment

---

**Last Updated**: December 8, 2025  
**Version**: 1.0  
**Status**: Ready for Production Deployment
