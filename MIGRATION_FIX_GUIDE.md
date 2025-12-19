# Migration Fix Guide
**Issue:** Failed migration `20251218162945_update_homes_to_active` blocking deployments  
**Error:** `invalid input value for enum "HomeStatus": ""`  
**Date:** December 19, 2025

---

## 🔍 Problem Analysis

### Root Cause
The migration attempts to update `AssistedLivingHome.status` to 'ACTIVE', but:
1. Some records have **empty string `""`** (not NULL) as status
2. PostgreSQL enum types do NOT accept empty strings
3. Migration SQL only handles `DRAFT` and `NULL`, missing empty strings
4. Migration failed and is now marked as FAILED in `_prisma_migrations` table
5. Prisma refuses to apply new migrations until this is resolved

### Current Migration SQL
```sql
UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE status = 'DRAFT' OR status IS NULL;
```

### Why It Fails
- Database has records with `status = ''` (empty string)
- Empty string is NOT a valid enum value
- Migration needs to handle empty strings too

---

## 🛠️ SOLUTION OPTIONS

### OPTION A: Fix via Render Shell (Recommended)
**Best for:** Quick fix without code changes

**Steps:**

1. **Open Render Shell:**
   - Go to Render Dashboard
   - Select your service (carelinkai)
   - Click "Shell" tab at the top
   - Wait for shell to connect

2. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```
   
   **Expected output:**
   ```
   ❌ Following migration have failed:
   20251218162945_update_homes_to_active
   ```

3. **Mark failed migration as rolled back:**
   ```bash
   npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active
   ```
   
   **Expected output:**
   ```
   ✅ Migration marked as rolled back
   ```

4. **Fix the data manually (THE KEY STEP):**
   ```bash
   # Connect to database
   psql $DATABASE_URL -c "UPDATE \"AssistedLivingHome\" SET status = 'ACTIVE' WHERE status = '' OR status IS NULL OR status = 'DRAFT';"
   ```
   
   **Expected output:**
   ```
   UPDATE 3
   ```
   (or however many records were updated)

5. **Deploy all pending migrations:**
   ```bash
   npx prisma migrate deploy
   ```
   
   **Expected output:**
   ```
   ✅ Migrations applied successfully
   ```

6. **Verify migration status:**
   ```bash
   npx prisma migrate status
   ```
   
   **Expected output:**
   ```
   ✅ Database schema is up to date!
   ```

7. **Restart the service:**
   - Go back to Render Dashboard
   - Click "Manual Deploy" → "Deploy latest commit"
   - OR just push new code to trigger auto-deploy

---

### OPTION B: Create New Idempotent Migration
**Best for:** Clean solution with proper migration history

**Steps:**

1. **Mark failed migration as rolled back** (same as Option A, step 3)

2. **Create new migration locally:**
   ```bash
   cd /home/ubuntu/carelinkai-project
   
   # Create migration directory
   mkdir -p prisma/migrations/20251219000000_fix_home_status
   
   # Create migration SQL
   cat > prisma/migrations/20251219000000_fix_home_status/migration.sql << 'EOF'
   -- Fix AssistedLivingHome status to handle empty strings
   -- This migration is idempotent and safe to run multiple times
   
   UPDATE "AssistedLivingHome"
   SET status = 'ACTIVE'
   WHERE status = 'DRAFT' 
      OR status IS NULL 
      OR status = ''
      OR status NOT IN ('ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED');
   EOF
   ```

3. **Commit and push:**
   ```bash
   git add prisma/migrations/20251219000000_fix_home_status/
   git commit -m "fix: Add idempotent migration to fix home status enum issue"
   git push origin main
   ```

4. **Deploy via Render:**
   - Render will auto-deploy
   - Pre-deploy hook will run:
     1. Mark old migration as rolled back
     2. Apply new migration
     3. Success!

---

### OPTION C: Delete Failed Migration
**Best for:** Nuclear option if nothing else works

**⚠️ WARNING:** Only use if Options A and B fail!

**Steps:**

1. **Connect to production database** (via Render Shell or local psql):
   ```bash
   psql $DATABASE_URL
   ```

2. **Delete the failed migration record:**
   ```sql
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name = '20251218162945_update_homes_to_active';
   ```

3. **Fix the data:**
   ```sql
   UPDATE "AssistedLivingHome" 
   SET status = 'ACTIVE' 
   WHERE status = '' OR status IS NULL OR status = 'DRAFT';
   ```

4. **Exit psql:**
   ```sql
   \q
   ```

5. **Deploy migrations:**
   ```bash
   npx prisma migrate deploy
   ```

---

## ✅ VERIFICATION CHECKLIST

After applying the fix, verify:

### 1. Migration Status
```bash
npx prisma migrate status
```
**Expected:** ✅ Database schema is up to date!

### 2. Data Status
```bash
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM \"AssistedLivingHome\" GROUP BY status;"
```
**Expected:**
```
 status | count 
--------+-------
 ACTIVE |     5
```
(No empty strings, no NULLs, no DRAFT)

### 3. Deployment Works
```bash
# Trigger a new deployment
git commit --allow-empty -m "test: Verify deployment works"
git push origin main
```
**Expected:** ✅ Build succeeds, pre-deploy succeeds, deployment completes

### 4. Service Health
```bash
curl https://carelinkai.onrender.com/api/health
```
**Expected:**
```json
{"ok":true,"db":"ok","uptimeSec":10,"durationMs":2,"env":"production"}
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Migration not found"
**Cause:** Migration directory was deleted or renamed  
**Solution:** 
- Check `prisma/migrations/` directory
- If migration is missing, use Option C (delete from database)

### Issue: "Cannot mark as rolled back"
**Cause:** Migration is not in FAILED state  
**Solution:**
```bash
# Check current state
npx prisma migrate status

# If needed, manually update
psql $DATABASE_URL -c "UPDATE \"_prisma_migrations\" SET rolled_back_at = NOW() WHERE migration_name = '20251218162945_update_homes_to_active';"
```

### Issue: "Still seeing enum errors"
**Cause:** Not all empty strings were fixed  
**Solution:**
```bash
# Find remaining empty strings
psql $DATABASE_URL -c "SELECT id, name, status FROM \"AssistedLivingHome\" WHERE status = '';"

# Fix them
psql $DATABASE_URL -c "UPDATE \"AssistedLivingHome\" SET status = 'ACTIVE' WHERE status = '';"
```

### Issue: "New migrations still blocked"
**Cause:** `_prisma_migrations` table still shows failed  
**Solution:**
```bash
# Check migration table
psql $DATABASE_URL -c "SELECT migration_name, finished_at, rolled_back_at, logs FROM \"_prisma_migrations\" WHERE migration_name LIKE '%20251218162945%';"

# If still failed, delete it
psql $DATABASE_URL -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20251218162945_update_homes_to_active';"
```

---

## 📋 STEP-BY-STEP EXECUTION (Recommended Path)

### Phase 1: Immediate Fix (5 minutes)
1. Open Render Shell
2. Run: `npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active`
3. Run: `psql $DATABASE_URL -c "UPDATE \"AssistedLivingHome\" SET status = 'ACTIVE' WHERE status = '' OR status IS NULL OR status = 'DRAFT';"`
4. Run: `npx prisma migrate deploy`
5. Verify: `npx prisma migrate status`

### Phase 2: Fix OpenAI Issue (5 minutes)
1. Add `OPENAI_API_KEY` to Render environment variables
2. OR modify code to make OpenAI lazy-loaded (see OPENAI_FIX_GUIDE.md)
3. Commit and push changes
4. Wait for auto-deploy

### Phase 3: Test Deployment (10 minutes)
1. Wait for deployment to complete
2. Run: `curl https://carelinkai.onrender.com/api/health`
3. Access: https://carelinkai.onrender.com/operator/inquiries/pipeline
4. Verify everything works

### Phase 4: Comprehensive Testing (30 minutes)
1. Follow TESTING_GUIDE.md
2. Document findings
3. Mark Feature #4 as complete (or identify remaining issues)

**Total time:** ~50 minutes from start to finish

---

## 📊 SUCCESS CRITERIA

The migration fix is successful when:

- [ ] `npx prisma migrate status` shows ✅ Database schema is up to date
- [ ] No records in `AssistedLivingHome` have empty string or NULL status
- [ ] New deployments complete successfully
- [ ] Pre-deploy hook passes without errors
- [ ] Service is running and accessible
- [ ] Pipeline Dashboard loads without errors

---

## 🚀 AFTER THE FIX

Once migration is fixed:

1. **Update deployment documentation** with lessons learned
2. **Add validation** to prevent empty strings in future:
   ```prisma
   model AssistedLivingHome {
     status HomeStatus @default(ACTIVE)  // Add default!
   }
   ```
3. **Add database constraints** to enforce valid statuses
4. **Test locally** before deploying to production
5. **Create rollback plan** for future migrations

---

**Ready to fix? Let's do this! 💪**
