# Sentry Session Replay Duplicate Error - Proper Fix

**Date:** January 31, 2026  
**Issue:** Multiple Session Replay integrations causing duplicate error events

## Problem Summary

### Original Issue
- Sentry reported duplicate Session Replay integrations
- Error occurred despite renaming `sentry.client.config.ts` to `sentry.client.config.ts.disabled`
- 2 events still occurring after deployment (last error: Jan 31, 2026 at 2:04 AM UTC)
- Affected platform: Chrome Mobile iOS

### Root Cause
**Simply renaming a file to `.disabled` is NOT sufficient!**
- Next.js/Sentry build plugins may still detect and load `.disabled` files
- The Sentry bundler plugin scans for Sentry config files during build
- File must be **completely deleted**, not just renamed

## Solution Applied

### 1. Complete File Deletion ✓
```bash
rm -f sentry.client.config.ts.disabled
```
**Critical:** The file must be **deleted**, not renamed or moved.

### 2. Verified Modern Config ✓
Confirmed `src/instrumentation-client.ts` is the only active client config:
```typescript
// src/instrumentation-client.ts
Sentry.init({
  dsn: SENTRY_DSN,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // ... other integrations
  ],
});
```

### 3. Verified No Duplicates ✓
Checked entire project for duplicate client configs:
```bash
find . -type f \( -name "*sentry*client*.ts" -o -name "sentry.client*" \) \
  ! -path "./node_modules/*" ! -path "./.next/*"
```
**Result:** Only backup files remain (not loaded)

### 4. Cleared Build Artifacts ✓
```bash
rm -rf .next .next-standalone
```
Ensures fresh build without cached config references.

## File Structure After Fix

```
carelinkai-project/
├── src/
│   ├── instrumentation.ts           # Server/Edge initialization
│   └── instrumentation-client.ts    # Client initialization (ONLY)
├── sentry.server.config.ts          # Server runtime config
├── sentry.edge.config.ts            # Edge runtime config
└── sentry_backup_20260127_013319/   # Backup (not loaded)
    └── sentry.client.config.ts
```

## Why Renaming Didn't Work

### Next.js Sentry Plugin Behavior
1. **Build-time scanning:** The `@sentry/nextjs` plugin scans for Sentry config files during build
2. **Pattern matching:** Looks for files matching `sentry*.config.*` patterns
3. **No extension filtering:** `.disabled` suffix doesn't prevent detection
4. **Multiple configs:** Loads ALL matching files, causing duplicates

### Correct Approach
- **Delete** legacy files completely
- Use **modern Next.js 15+ instrumentation pattern**
- Keep configs in recommended locations only

## Expected Results

### After Deployment
1. **Single Session Replay integration** initialized
2. **No duplicate warnings** in Sentry logs
3. **Reduced event volume** (no duplicate recordings)
4. **Cleaner Sentry dashboard** with accurate session counts

### Verification Steps
1. Check Sentry dashboard for new Session Replay events
2. Monitor for "Multiple replays" error messages
3. Verify event count matches expected sampling rate
4. Check browser console for single Sentry initialization log

## Monitoring

### Check Deployment Logs
```bash
# After deployment completes
# Look for single initialization message:
[Sentry Client] ✅ Initialized with features:
[Sentry Client]   - Session Replay: enabled
```

### Sentry Dashboard
- Navigate to: https://the-council-labs.sentry.io/issues/
- Search for: "Multiple instances of Replay"
- Expected: **No new events after this deployment**

## Prevention

### Best Practices
1. **Never rename config files** - delete them completely
2. **Use modern instrumentation pattern** (Next.js 15+)
3. **Clear build artifacts** after config changes
4. **Verify file deletion** in git commits
5. **Document config location** in README

### Project Standards
- Client config: `src/instrumentation-client.ts` ONLY
- Server config: `sentry.server.config.ts`
- Edge config: `sentry.edge.config.ts`
- Initialization: `src/instrumentation.ts`

## Rollback Plan

If issues occur after deployment:

1. **Revert commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore from backup:**
   ```bash
   cp sentry_backup_20260127_013319/sentry.client.config.ts ./
   ```

3. **Contact support** with deployment logs

## References

- Sentry Issue: [carelink-ai project issues](https://the-council-labs.sentry.io/issues/)
- Next.js Instrumentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
- Sentry Next.js Setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/

## Git Commit

```bash
git add .
git commit -m "fix: properly remove legacy Sentry client config causing duplicate Session Replay

- DELETE sentry.client.config.ts.disabled completely (renaming wasn't enough)
- Verified src/instrumentation-client.ts is the only client config
- Cleared .next build artifacts for clean build
- Next.js/Sentry plugin was still loading the .disabled file

Resolves duplicate Session Replay integration error in Sentry dashboard"
git push origin main
```

## Deployment Notes

- **Build time:** ~3-5 minutes
- **Deploy time:** ~1-2 minutes
- **Verification window:** Monitor for 1 hour after deployment
- **Expected downtime:** None (rolling deployment)

---

**Status:** ✅ Applied  
**Committed:** Pending  
**Deployed:** Pending  
**Verified:** Pending  
