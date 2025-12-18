# Migration Deployment Notes

## Migration: Update Homes to ACTIVE Status

### What This Does
- Updates all AssistedLivingHome records from DRAFT to ACTIVE
- Enables tour submissions for all homes
- Runs automatically on Render deployment

### Deployment Process
1. Code pushed to GitHub ✅
2. Render detects new commit
3. Render runs `npm install`
4. Render runs `npx prisma migrate deploy` (applies migration)
5. Render runs `npm run build`
6. Render deploys new version

### Expected Timeline
- Deployment starts: Immediately after push
- Migration runs: During deployment (1-2 minutes)
- Deployment completes: 5-10 minutes total

### Verification
After deployment completes:
1. Navigate to any home page
2. Click "Schedule Tour"
3. Complete the form
4. Submit tour request
5. Should see: "Tour Request Submitted!" ✅

### Rollback (if needed)
If issues occur, the migration can be reverted:
```sql
UPDATE "AssistedLivingHome" SET status = 'DRAFT';
```

### Migration Safety
- ✅ Idempotent (safe to run multiple times)
- ✅ Only updates DRAFT homes
- ✅ Does not affect ACTIVE homes
- ✅ No data loss
- ✅ Reversible

### Migration Details
**Migration Name:** `20251218162945_update_homes_to_active`
**Location:** `prisma/migrations/20251218162945_update_homes_to_active/migration.sql`
**Type:** Data migration (UPDATE statement)
**Scope:** All AssistedLivingHome records

### Expected Results
- **Before Migration:** Homes have status = 'DRAFT'
- **After Migration:** All homes have status = 'ACTIVE'
- **Tour Submissions:** Now enabled for all homes

### Monitoring
Watch Render deployment logs for:
```
Running prisma migrate deploy...
Applying migration `20251218162945_update_homes_to_active`
Migration applied successfully ✅
```

### Contact
If issues arise during deployment:
- Check Render logs for migration errors
- Verify database connection status
- Review migration SQL for syntax errors
