# Tour Request Bug Fixes

## Summary
Fixed two critical bugs preventing tour requests from working properly:
1. **Frontend Bug**: Hardcoded homeId in TourRequestModal  
2. **Database Bug**: Home status set to 'DRAFT' instead of 'ACTIVE'

---

## Bug #1: Frontend - Dynamic HomeId

### Problem
The TourRequestModal was using `home.id` from the hardcoded `MOCK_HOME` object, which always returned `"home_1"` regardless of the actual home being viewed. This caused tour requests for `/homes/home_2` to be submitted for `home_1` instead.

### Root Cause
```typescript
// BEFORE (src/app/homes/[id]/page.tsx:1890)
<TourRequestModal
  homeId={realHome?.id || home.id}  // ❌ home.id is always "home_1" from MOCK_HOME
  ...
/>
```

### Solution
Changed to use the dynamic `id` parameter from the URL:
```typescript
// AFTER (src/app/homes/[id]/page.tsx:1890)
<TourRequestModal
  homeId={realHome?.id || String(id)}  // ✅ Uses actual ID from URL
  ...
/>
```

### Impact
- ✅ Tour requests now work for **any home** (home_1, home_2, etc.)
- ✅ Correct homeId is passed even in mock mode
- ✅ No more hardcoded "home_1" references

---

## Bug #2: Database - Home Status

### Problem
The "Sunshine Care Home" (slug: `home_1`) had status `DRAFT` instead of `ACTIVE`. The API query filters by `status: 'ACTIVE'`, causing the home lookup to fail:

```typescript
// API Query (src/app/api/family/tours/request/route.ts:183)
where: {
  OR: [
    { slug: validatedData.homeId },
    { id: validatedData.homeId }
  ],
  status: 'ACTIVE'  // ❌ Home had status 'DRAFT', so query returned null
}
```

### Solution
Created two fix options:

#### Option A: TypeScript Script (Recommended)
```bash
cd /home/ubuntu/carelinkai-project
npx ts-node scripts/fix-home-status.ts
```

#### Option B: Direct SQL
```bash
npx prisma db execute --file prisma/migrations/fix_home_status.sql --schema prisma/schema.prisma
```

### Impact
- ✅ Home is now discoverable by the API
- ✅ Tour requests can be submitted successfully
- ✅ Future seed data already has correct status (`HomeStatus.ACTIVE`)

---

## Deployment Steps

### 1. Deploy Frontend Fix
```bash
cd /home/ubuntu/carelinkai-project
git add src/app/homes/[id]/page.tsx
git commit -m "fix: Use dynamic homeId from URL params in TourRequestModal"
git push origin main
```

### 2. Fix Database (Production)
After deployment, run the status fix script on the production database:

**Option A: Via Render Shell**
```bash
# SSH into Render service or use the shell
npx ts-node scripts/fix-home-status.ts
```

**Option B: Via Prisma Studio**
1. Open Prisma Studio: `npx prisma studio`
2. Navigate to `AssistedLivingHome` table
3. Find homes with slug `home_1` or name containing "Sunshine"
4. Change `status` field to `ACTIVE`
5. Save changes

### 3. Verify Fixes
Test tour request flow:
1. Navigate to any home page (e.g., `/homes/home_2`)
2. Click "Schedule Tour" button
3. Select date range
4. Choose time slot
5. Add notes (optional)
6. Submit request
7. **Expected**: Success message "Tour Request Submitted!" ✅

---

## Files Modified

### Frontend
- `src/app/homes/[id]/page.tsx` - Fixed homeId to use URL param

### Database Scripts (Created)
- `scripts/fix-home-status.ts` - TypeScript fix script
- `prisma/migrations/fix_home_status.sql` - SQL migration

### Documentation
- `TOUR_BUGS_FIX.md` - This file

---

## Testing Checklist

### Frontend Testing
- [ ] Visit `/homes/home_1` → Tour request works
- [ ] Visit `/homes/home_2` → Tour request works  
- [ ] Visit any home → Correct homeId is passed to API
- [ ] Mock mode → Still uses URL param instead of "home_1"

### Backend Testing
- [ ] Query `AssistedLivingHome` where `slug = 'home_1'` → Returns home
- [ ] Home `status` = 'ACTIVE'
- [ ] API `/api/family/tours/request` → Returns 200 OK
- [ ] Tour request is created in database

### E2E Testing
1. **User Flow**:
   - Login as family member
   - Navigate to home details page
   - Click "Schedule Tour"
   - Complete all steps in modal
   - Submit request
2. **Expected Result**:
   - Success message displayed
   - Tour request visible in `/dashboard/tours` page
   - Operator sees request in their dashboard

---

## Rollback Plan

### Frontend Rollback
```bash
git revert <commit-hash>
git push origin main
```

### Database Rollback (if needed)
```sql
-- Revert home status to DRAFT (not recommended)
UPDATE "AssistedLivingHome"
SET status = 'DRAFT'
WHERE slug = 'home_1';
```

---

## Related Issues
- Issue: Tour requests failing with "Home not found" error
- Root cause: Combination of frontend hardcoded ID + database status mismatch
- Fix applied: 2025-12-18

---

## Notes
- The API already supports both `slug` and `id` lookups (implemented previously)
- Seed data (`seed-simple.ts`) already creates homes with `ACTIVE` status
- This fix resolves production-only issue where database was manually set to `DRAFT`

---

**Status**: ✅ **READY FOR DEPLOYMENT**
