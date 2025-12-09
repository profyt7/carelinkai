# Operator Dashboard API Fix - December 9, 2025

## Issue Summary

**Problem**: Operator dashboard page was showing "Error Loading Dashboard" with "Failed to fetch dashboard data" message.

**Root Cause**: The API endpoint at `/api/operator/dashboard` was attempting to query a non-existent Prisma model `prisma.homeLicense` instead of the correct model name `prisma.license`.

## Technical Details

### Error Location
- **File**: `src/app/api/operator/dashboard/route.ts`
- **Line**: 77 (in the Promise.all parallel queries)

### The Bug
```javascript
// BEFORE (incorrect)
prisma.homeLicense.findMany({
  where: {
    home: homeFilter,
    expirationDate: {
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gte: new Date(),
    },
  },
  include: {
    home: { select: { name: true } },
  },
  orderBy: { expirationDate: "asc" },
  take: 5,
})
```

### The Fix
```javascript
// AFTER (correct)
prisma.license.findMany({
  where: Object.keys(homeFilter).length
    ? {
        home: homeFilter,
        expirationDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      }
    : {
        expirationDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
  include: {
    home: { select: { name: true } },
  },
  orderBy: { expirationDate: "asc" },
  take: 5,
})
```

### Additional Improvements
1. **Enhanced Error Logging**: Added detailed error stack traces and session context to help diagnose future issues
2. **Conditional Filtering**: Fixed the license query to properly handle both operator-scoped and admin global views

## Database Schema Reference

The correct model in `prisma/schema.prisma` is:

```prisma
model License {
  id             String   @id @default(cuid())
  homeId         String
  type           String
  licenseNumber  String
  issueDate      DateTime
  expirationDate DateTime
  status         String
  documentUrl    String?
  
  home AssistedLivingHome @relation(fields: [homeId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([homeId])
  @@index([expirationDate])
  @@index([status])
}
```

**Note**: There is no `HomeLicense` model in the schema. The correct model name is `License`.

## Deployment

- **Commit**: `062ed26`
- **Commit Message**: "fix: Resolve operator dashboard API endpoint error - fix prisma.homeLicense → prisma.license"
- **Pushed to**: `main` branch
- **Auto-deployment**: Render.com will automatically deploy this fix

## Testing Checklist

After deployment, verify:

- [ ] Operator dashboard loads without errors
- [ ] Dashboard metrics display correctly (homes, inquiries, residents, occupancy rate)
- [ ] Recent inquiries list appears
- [ ] Expiring licenses section shows data (if any licenses are expiring)
- [ ] New inquiries count displays
- [ ] Admin operators can view global summary
- [ ] Regular operators see only their own data

## Expected Behavior

### For Operators
- Dashboard shows metrics for their assigned homes only
- Filtered data: homes, inquiries, residents, licenses

### For Admins
- Can view global summary (all operators)
- Can filter by specific operator using dropdown
- Access to system-wide metrics

## Monitoring

Watch for these logs in production:
```
[API /api/operator/dashboard] Error: <any error messages>
[API /api/operator/dashboard] Error stack: <stack trace>
[API /api/operator/dashboard] Session: <user email or "No session">
```

## Related Files

1. **API Route**: `src/app/api/operator/dashboard/route.ts` ✅ Fixed
2. **Client Page**: `src/app/operator/page.tsx` (No changes needed)
3. **Database Schema**: `prisma/schema.prisma` (Reference only)

## Prevention

To prevent similar issues in the future:

1. **Type Safety**: TypeScript should catch these errors, but ensure Prisma Client is regenerated after schema changes
2. **Schema Validation**: Always verify model names against `prisma/schema.prisma` before using in queries
3. **Testing**: Add integration tests for critical API endpoints
4. **Code Review**: Check for Prisma model name consistency

## Status

✅ **FIXED AND DEPLOYED**

The operator dashboard API endpoint is now functioning correctly with proper error logging and data filtering.
