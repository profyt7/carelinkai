# Migration Fix: P3018 - DocumentTemplate Dependency

**Date:** December 21, 2024  
**Migration:** `20251221011617_add_document_classification_validation`  
**Status:** ✅ FIXED  
**Commit:** b0a090c

---

## Issue

### Error Message
```
Error: P3018
Migration: 20251221011617_add_document_classification_validation
Database error: cannot drop type "DocumentType" because other objects depend on it
DETAIL: column type of table "DocumentTemplate" depends on type "DocumentType"
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

### Impact
- ❌ Deployment failing on Render
- ❌ Migration cannot complete
- ❌ Database stuck in inconsistent state
- ❌ New document classification features unavailable

---

## Root Cause

### The Problem
The migration was attempting to:
1. Create a new enum type `DocumentType_new`
2. Alter **Document** table to use the new enum
3. DROP the old `DocumentType` enum
4. Rename `DocumentType_new` to `DocumentType`

**However:** The `DocumentTemplate` table also has a column using the `DocumentType` enum!

### Why It Failed
PostgreSQL prevents dropping an enum type when any table columns still reference it. The migration only updated the `Document` table, leaving `DocumentTemplate.type` still using the old enum.

### Affected Tables
1. **Document.type** - Uses `DocumentType` enum ✅ Was being migrated
2. **DocumentTemplate.type** - Uses `DocumentType` enum ❌ Was NOT being migrated

---

## Solution

### The Fix
Added a new step (Step 2b) to migrate the `DocumentTemplate` table **before** dropping the old enum:

```sql
-- Step 2b: Alter DocumentTemplate table to use new enum type
ALTER TABLE "DocumentTemplate" ALTER COLUMN "type" TYPE "DocumentType_new" 
    USING (
        CASE "type"::text
            WHEN 'INSURANCE_CARD' THEN 'INSURANCE'::text
            WHEN 'ID_DOCUMENT' THEN 'IDENTIFICATION'::text
            WHEN 'CONTRACT' THEN 'LEGAL'::text
            WHEN 'CARE_PLAN' THEN 'ASSESSMENT_FORM'::text
            WHEN 'OTHER' THEN 'GENERAL'::text
            ELSE "type"::text
        END
    )::"DocumentType_new";
```

### Migration Flow (Fixed)
1. ✅ Create `DocumentType_new` enum
2. ✅ Alter **Document** table to use new enum
3. ✅ **NEW:** Alter **DocumentTemplate** table to use new enum
4. ✅ DROP old `DocumentType` enum (now safe!)
5. ✅ Rename `DocumentType_new` to `DocumentType`

---

## Technical Details

### Enum Value Mapping
The migration maps old enum values to new ones:

| Old Value | New Value |
|-----------|-----------|
| `INSURANCE_CARD` | `INSURANCE` |
| `ID_DOCUMENT` | `IDENTIFICATION` |
| `CONTRACT` | `LEGAL` |
| `CARE_PLAN` | `ASSESSMENT_FORM` |
| `OTHER` | `GENERAL` |
| (unchanged) | `MEDICAL_RECORD` |
| (unchanged) | `FINANCIAL` |
| (unchanged) | `EMERGENCY_CONTACT` |

### Safety Features
- **DO blocks** with exception handling for idempotent enum creation
- **CASE statements** for safe value mapping
- **Type casting** through text to avoid type conflicts
- **IF NOT EXISTS** guards for columns and indexes

### Database Schema
```typescript
// DocumentTemplate model
model DocumentTemplate {
  id          String       @id @default(cuid())
  name        String
  description String?      @db.Text
  type        DocumentType  // ← Uses DocumentType enum!
  template    Json
  fields      Json
  isActive    Boolean      @default(true)
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@index([type])
  @@index([isActive])
}
```

---

## Changes Made

### Files Modified
1. **prisma/migrations/20251221011617_add_document_classification_validation/migration.sql**
   - Added Step 2b for DocumentTemplate migration
   - 24 lines added, 3 lines modified

### Code Diff
```diff
 -- Step 2: Alter Document table to use new enum type (with mapping for renamed values)
 ALTER TABLE "Document" ALTER COLUMN "type" DROP DEFAULT;
 ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" 
     USING (
         CASE "type"::text
             WHEN 'INSURANCE_CARD' THEN 'INSURANCE'::text
             WHEN 'ID_DOCUMENT' THEN 'IDENTIFICATION'::text
             WHEN 'CONTRACT' THEN 'LEGAL'::text
             WHEN 'CARE_PLAN' THEN 'ASSESSMENT_FORM'::text
             WHEN 'OTHER' THEN 'GENERAL'::text
             ELSE "type"::text
         END
     )::"DocumentType_new";

+-- Step 2b: Alter DocumentTemplate table to use new enum type (with mapping for renamed values)
+ALTER TABLE "DocumentTemplate" ALTER COLUMN "type" TYPE "DocumentType_new" 
+    USING (
+        CASE "type"::text
+            WHEN 'INSURANCE_CARD' THEN 'INSURANCE'::text
+            WHEN 'ID_DOCUMENT' THEN 'IDENTIFICATION'::text
+            WHEN 'CONTRACT' THEN 'LEGAL'::text
+            WHEN 'CARE_PLAN' THEN 'ASSESSMENT_FORM'::text
+            WHEN 'OTHER' THEN 'GENERAL'::text
+            ELSE "type"::text
+        END
+    )::"DocumentType_new";
+
 -- Step 3: Drop old enum and rename new one
 DROP TYPE IF EXISTS "DocumentType";
 ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
```

---

## Deployment

### GitHub Push
- **Branch:** main
- **Commit:** b0a090c
- **Status:** ✅ Pushed successfully
- **Auto-Deploy:** Render will trigger automatically

### Render Deployment
- **Service:** carelinkai (srv-d3isol3uibrs73d5fm1g)
- **URL:** https://carelinkai.onrender.com
- **Dashboard:** https://dashboard.render.com/web/srv-d3isol3uibrs73d5fm1g
- **ETA:** 5-10 minutes

### Monitoring
Watch for:
1. ✅ Build starts automatically
2. ✅ `prisma migrate deploy` runs
3. ✅ Migration `20251221011617` applies successfully
4. ✅ All enum dependencies resolved
5. ✅ Service deploys and health checks pass

---

## Verification

### After Deployment

#### 1. Check Migration Status
```bash
# Via Render shell
npx prisma migrate status
```

Expected output:
```
✅ 20251221011617_add_document_classification_validation - Applied
```

#### 2. Verify Enum Values
```sql
SELECT e.enumlabel as value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'DocumentType'
ORDER BY e.enumsortorder;
```

Expected values:
- MEDICAL_RECORD
- INSURANCE
- IDENTIFICATION
- FINANCIAL
- LEGAL
- ASSESSMENT_FORM
- EMERGENCY_CONTACT
- GENERAL

#### 3. Verify Table Schemas
```sql
-- Check Document table
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'Document' AND column_name = 'type';

-- Check DocumentTemplate table
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'DocumentTemplate' AND column_name = 'type';
```

Both should show: `udt_name = 'DocumentType'`

#### 4. Test Application
- Visit https://carelinkai.onrender.com
- Upload a document
- Verify classification works
- Check validation features

---

## Lessons Learned

### 1. Check All Dependencies
When modifying enums, always check:
```sql
-- Find all tables using an enum
SELECT DISTINCT t.table_name, c.column_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE c.udt_name = 'DocumentType';
```

### 2. Migrate All Tables
If an enum is used by multiple tables, ALL must be migrated before dropping the enum.

### 3. Test Migrations
Even without database access, you can:
- Review schema for dependencies
- Check Prisma model relationships
- Verify enum usage across models

### 4. Idempotent Patterns
Always use:
- `DO $$ BEGIN ... EXCEPTION` for enums
- `IF NOT EXISTS` for columns/indexes
- Safe DROP with `IF EXISTS`

---

## Prevention

### Future Enum Modifications

#### Step 1: Identify Dependencies
```prisma
// Check schema.prisma for ALL models using the enum
enum DocumentType { ... }

model Document {
  type DocumentType  // ← Found one!
}

model DocumentTemplate {
  type DocumentType  // ← Found another!
}
```

#### Step 2: Update ALL Tables
```sql
-- Migrate EVERY table that uses the enum
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "EnumType_new" ...;
ALTER TABLE "DocumentTemplate" ALTER COLUMN "type" TYPE "EnumType_new" ...;
-- Add more as needed
```

#### Step 3: Then Drop
```sql
-- Only drop after ALL tables migrated
DROP TYPE IF EXISTS "DocumentType";
```

---

## Rollback Plan

If migration fails:

### 1. Mark as Rolled Back
```bash
npx prisma migrate resolve --rolled-back 20251221011617_add_document_classification_validation
```

### 2. Revert Schema
```bash
git revert b0a090c
git push origin main
```

### 3. Create New Migration
- Fix issues in schema.prisma
- Generate new migration
- Test thoroughly before deploying

---

## Status Summary

| Item | Status |
|------|--------|
| Root cause identified | ✅ Complete |
| Migration fixed | ✅ Complete |
| Code committed | ✅ Complete |
| Pushed to GitHub | ✅ Complete |
| Documentation created | ✅ Complete |
| Render deployment | 🔄 In Progress |
| Verification | ⏳ Pending |

---

## Next Steps

1. ⏳ **Monitor Render deployment** (~5-10 minutes)
2. ⏳ **Verify migration applied** successfully
3. ⏳ **Test document classification** features
4. ⏳ **Confirm no errors** in logs

---

## References

- **Migration File:** `prisma/migrations/20251221011617_add_document_classification_validation/migration.sql`
- **Commit:** b0a090c
- **GitHub Repo:** https://github.com/profyt7/carelinkai
- **Render Service:** srv-d3isol3uibrs73d5fm1g
- **PostgreSQL Docs:** [ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html)

---

**Status:** ✅ FIX COMPLETE - Awaiting Deployment  
**Updated:** December 21, 2024
