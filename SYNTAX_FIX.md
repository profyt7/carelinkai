# Syntax Error Fix - extraction.ts

## Issue

Build failing with syntax error:

```
./src/lib/documents/extraction.ts
Error: Expected ',', got ':'
Line 23: where: { id: documentId },
```

## Root Cause

Missing opening brace in `prisma.document.findUnique` call.

**Incorrect Syntax:**
```typescript
const document = await prisma.document.findUnique(
  where: { id: documentId },  // ❌ Missing opening brace
);
```

**Correct Syntax:**
```typescript
const document = await prisma.document.findUnique({  // ✅ Opening brace added
  where: { id: documentId },
});
```

## Solution

Added the missing opening brace `{` before the `where` clause.

## Files Changed

1. `src/lib/documents/extraction.ts` - Fixed syntax error

## Why This Happened

When creating the extraction.ts file with dynamic imports, the opening brace was accidentally omitted in the Prisma query.

## Testing

✅ Syntax error fixed
✅ Opening brace added
✅ Prisma query correct
✅ Build compiled successfully

## Build Output

```
Creating an optimized production build ...
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Build completed successfully
```

## Expected Result

Render deployment should now succeed with clean build.

---

**Status:** ✅ Fixed
**Date:** December 20, 2025
