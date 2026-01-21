# Registration API Debug Logging - January 20, 2026

## What Was Added

Comprehensive logging was added to `/src/app/api/auth/register/route.ts` at the following points:

### 1. Request Entry Point
- Request timestamp
- Request method and URL
- Raw request body (with password redacted)

### 2. Validation
- Before and after validation
- Validation errors if any

### 3. Database Operations
- Checking for existing user
- Creating user record
- Creating role-specific profile (FAMILY, OPERATOR, CAREGIVER, AFFILIATE, PROVIDER)
- Creating audit log

### 4. Transaction Flow
- Transaction start/commit
- Each step within the transaction

### 5. Error Handling
- Full error object with all properties
- Error name, code, message
- Prisma meta information
- Stack trace

## Log Format

All logs use the prefix `[REGISTER API]` for easy filtering in Render logs.

Example log pattern:
```
============================================================
[REGISTER API] Request received at: 2026-01-20T12:00:00.000Z
[REGISTER API] Raw request body keys: ["email", "password", "firstName", ...]
[REGISTER API] Validation PASSED
[REGISTER API] Starting database transaction...
[REGISTER API] Creating user with data: {...}
[REGISTER API] User created successfully, id: cuid123...
[REGISTER API] Creating FAMILY profile...
[REGISTER API] Family profile created successfully
[REGISTER API] Transaction committed, user id: cuid123...
```

## How to Use

1. **Trigger the error**: Try to register a new user at https://getcarelinkai.com/auth/register
2. **Check Render logs**: Go to Render dashboard → carelink-ai service → Logs
3. **Search for**: `[REGISTER API]` to find relevant logs
4. **Look for**: The last successful log before the error to identify the failure point

## Possible Issues Identified

Based on code review, potential issues could be:

1. **Database Connection**: Prisma client connection issues
2. **Schema Mismatch**: Fields in code that don't exist in database (migration not applied)
3. **Validation Errors**: Input not matching schema requirements
4. **Transaction Timeout**: Long-running transaction timing out

## Next Steps After Checking Logs

1. Identify the exact error from the logs
2. Fix the root cause
3. Remove excessive logging (keep essential logs)
4. Deploy and verify fix

## Files Modified

- `/src/app/api/auth/register/route.ts` - Added comprehensive logging
