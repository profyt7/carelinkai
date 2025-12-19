# Database Fix Execution Guide

## Issue
Home status is set to `DRAFT` instead of `ACTIVE`, preventing tour requests from working.

## Solution
Update `AssistedLivingHome` status to `ACTIVE` for Sunshine Care Home (home_1).

---

## ✅ RECOMMENDED: Execute via Render Shell

### Step 1: Access Render Shell

1. Go to your Render dashboard: https://dashboard.render.com/
2. Navigate to your **CareLinks** web service
3. Click on the **"Shell"** tab in the left sidebar
4. Wait for the shell to connect

### Step 2: Execute the Fix Script

In the Render shell, run:

```bash
# Navigate to your app directory (usually /opt/render/project/src)
cd /opt/render/project/src

# Run the database fix using Prisma
npx prisma db execute --stdin <<'EOF'
UPDATE "AssistedLivingHome"
SET status = 'ACTIVE'
WHERE 
  (slug = 'home_1' OR name LIKE '%Sunshine Care%')
  AND status != 'ACTIVE';

SELECT id, slug, name, status 
FROM "AssistedLivingHome"
WHERE slug = 'home_1' OR name LIKE '%Sunshine Care%';
EOF
```

### Step 3: Verify the Update

Run this verification query:

```bash
npx prisma db execute --stdin <<'EOF'
SELECT 
  id,
  slug,
  name,
  status,
  "createdAt",
  "updatedAt"
FROM "AssistedLivingHome"
WHERE slug = 'home_1';
EOF
```

**Expected Output:**
```
id | slug   | name                | status | createdAt | updatedAt
---|--------|---------------------|--------|-----------|----------
... | home_1 | Sunshine Care Home | ACTIVE | ...       | ...
```

---

## 🔄 ALTERNATIVE: Execute via TypeScript Script (If Render has ts-node)

### Option A: Deploy and Run Script

1. **Commit the fix script** (if not already done):
```bash
git add scripts/fix-home-status.ts
git commit -m "Add database fix script for home status"
git push origin main
```

2. **Wait for deployment** to complete on Render

3. **Access Render Shell** and run:
```bash
cd /opt/render/project/src
node -r esbuild-register scripts/fix-home-status.ts
# OR if ts-node is available:
npx ts-node scripts/fix-home-status.ts
```

---

## 🗄️ ALTERNATIVE: Use Prisma Studio (GUI Method)

### Step 1: Connect Prisma Studio to Production

1. **Get your production DATABASE_URL** from Render:
   - Go to Render Dashboard → Your Service → Environment
   - Copy the `DATABASE_URL` value

2. **Set it locally**:
```bash
export DATABASE_URL="your_production_database_url_here"
```

3. **Open Prisma Studio**:
```bash
cd /home/ubuntu/carelinkai-project
npx prisma studio
```

4. **Update the record**:
   - Navigate to `AssistedLivingHome` model
   - Find the home with `slug = 'home_1'` or name containing "Sunshine Care"
   - Change `status` from `DRAFT` to `ACTIVE`
   - Click Save

⚠️ **Security Warning**: Be careful when connecting to production databases. Use read-only access if possible.

---

## 📊 Verification Checklist

After executing the fix, verify:

- [ ] Home status is `ACTIVE` in database
- [ ] Tour request form loads without "internal server error"
- [ ] Tour requests can be submitted successfully
- [ ] No console errors related to home status

### Test Tour Request Flow

1. Go to: `https://carelinkai.onrender.com/dashboard/find-care`
2. Click on "Sunshine Care Home" or the home with slug `home_1`
3. Click "Schedule Tour" button
4. Fill out the tour request form
5. Submit the form
6. **Expected**: Success message, no "internal server error"

---

## 🚨 Troubleshooting

### Error: "Can't reach database server"
- Check that `DATABASE_URL` environment variable is set correctly in Render
- Verify database is running and accessible

### Error: "Permission denied"
- Ensure the database user has `UPDATE` permissions on `AssistedLivingHome` table

### Error: "Column 'status' does not exist"
- Check that migrations have been applied correctly
- Run: `npx prisma migrate deploy` on Render

### No Rows Updated
- Check if home exists: `SELECT * FROM "AssistedLivingHome" WHERE slug = 'home_1';`
- Verify the home's current status: it might already be `ACTIVE`

---

## 📝 Post-Execution Documentation

After successful execution, document:

1. **Date/Time** of fix execution
2. **Number of rows** updated
3. **Verification** results
4. **Before/After** status values

Create a log file:
```bash
cat > DATABASE_FIX_LOG.md << 'EOF'
# Database Fix Log

## Date: $(date)

## Issue
Home status was DRAFT, preventing tour requests.

## Fix Applied
Executed SQL update via Render Shell:
- Updated AssistedLivingHome status to ACTIVE
- Home: Sunshine Care Home (slug: home_1)

## Result
✅ Successfully updated [X] home(s)
✅ Tour requests now working

## Verification
- Database query confirmed status = ACTIVE
- Tour request form tested successfully
- No console errors observed
EOF
```

---

## 🎯 Quick Reference

**Fastest Method**: Render Shell + Prisma CLI
**Safest Method**: Prisma Studio (with production DATABASE_URL)
**Most Reliable**: TypeScript script (already tested locally)

**Recommended Order**:
1. Try Render Shell (quickest)
2. If that fails, use Prisma Studio
3. If both fail, deploy TypeScript script

---

## 📞 Need Help?

If you encounter issues:
1. Check Render logs for database connection errors
2. Verify `DATABASE_URL` is correctly set in environment
3. Ensure migrations are up to date: `npx prisma migrate deploy`
4. Check database permissions for the user

---

**Status**: Ready for execution ✅
**Risk Level**: Low (idempotent SQL, safe to re-run)
**Estimated Time**: 2-5 minutes
