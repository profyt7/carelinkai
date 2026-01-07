# Deployment Fix: Duplicate Hooks & Failed Migration

**Date**: January 6, 2026  
**Issue**: Build failure and duplicate deployments on Render

## Problems Identified

### 1. Duplicate Deploy Hooks ❌
Found **4 GitHub Actions workflows** all triggering on `push` to `main`:
- `.github/workflows/deploy-on-merge.yml`
- `.github/workflows/deploy-render-fixed.yml`
- `.github/workflows/deploy-render-min.yml`
- `.github/workflows/deploy-render.yml`

**Impact**: Combined with Render's auto-deploy feature, this caused **5 simultaneous deployments** for every push:
- 4 from GitHub Actions workflows
- 1 from Render's auto-deploy

### 2. Failed Migration ❌
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20260107004129_add_impersonation_feature` migration started at 2026-01-07 00:54:28.928254 UTC failed
```

**Impact**: Build process exits with status 1, preventing successful deployment.

## Solutions Implemented

### Fix 1: Disabled Duplicate Deploy Hooks ✅

**Action**: Moved all 4 deploy workflows to `.github/workflows-disabled/` directory

**Files moved**:
```bash
.github/workflows/deploy-on-merge.yml → .github/workflows-disabled/
.github/workflows/deploy-render-fixed.yml → .github/workflows-disabled/
.github/workflows/deploy-render-min.yml → .github/workflows-disabled/
.github/workflows/deploy-render.yml → .github/workflows-disabled/
```

**Result**: Only Render's auto-deploy will trigger now (single deployment per push)

### Fix 2: Resolved Failed Migration ✅

**Action**: Updated `migrate:deploy` script in `package.json` to mark the failed migration as rolled back

**Before**:
```json
"migrate:deploy": "npx prisma migrate resolve --rolled-back draft_add_document_processing || true && npx prisma migrate resolve --rolled-back 20251220024025_phase1a_document_processing || true && npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active || true && npx prisma migrate resolve --rolled-back 20251221011617_add_document_classification_validation || true && npx prisma migrate deploy"
```

**After**:
```json
"migrate:deploy": "npx prisma migrate resolve --rolled-back draft_add_document_processing || true && npx prisma migrate resolve --rolled-back 20251220024025_phase1a_document_processing || true && npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active || true && npx prisma migrate resolve --rolled-back 20251221011617_add_document_classification_validation || true && npx prisma migrate resolve --rolled-back 20260107004129_add_impersonation_feature || true && npx prisma migrate deploy"
```

**Result**: The `start` script will automatically resolve the failed migration on the next deployment

## Files Changed

1. `.github/workflows/deploy-on-merge.yml` - **DELETED** (moved to workflows-disabled)
2. `.github/workflows/deploy-render-fixed.yml` - **DELETED** (moved to workflows-disabled)
3. `.github/workflows/deploy-render-min.yml` - **DELETED** (moved to workflows-disabled)
4. `.github/workflows/deploy-render.yml` - **DELETED** (moved to workflows-disabled)
5. `package.json` - **MODIFIED** (updated migrate:deploy script)
6. `.github/workflows-disabled/` - **NEW DIRECTORY** (contains disabled workflows)

## Deployment Process

### Current State:
- ✅ Render auto-deploy is enabled
- ✅ GitHub Actions deploy hooks are disabled
- ✅ Migration resolution is automated in start script

### Next Steps:
1. Commit and push changes to GitHub
2. Single deployment will trigger via Render auto-deploy
3. The start script will automatically resolve the failed migration
4. Application should deploy successfully

## Expected Outcome

✅ **Single deployment per push** (via Render auto-deploy only)  
✅ **Failed migration automatically resolved** during startup  
✅ **No more duplicate deployments**  
✅ **Build completes successfully**

## Verification Steps

After deployment:
1. Check Render dashboard - should show **1 deployment** per push
2. Check build logs - should show migration resolved successfully
3. Check GitHub Actions - should show **no deploy workflows running**
4. Verify application is running correctly at https://getcarelinkai.com

## Rollback Plan

If issues occur:
1. Restore workflows from `.github/workflows-disabled/` back to `.github/workflows/`
2. Revert `package.json` changes
3. Push to GitHub

## Notes

- The disabled workflows are preserved in `.github/workflows-disabled/` for reference
- Auto-deploy on Render is the recommended approach (eliminates GitHub Actions overhead)
- The migration resolution is idempotent - safe to run multiple times
- All `|| true` ensures failures don't block deployment

---

**Commit Message**: 
```
fix: Disable duplicate deploy hooks and resolve failed migration

- Moved 4 GitHub Actions deploy workflows to workflows-disabled/
- Updated migrate:deploy to resolve 20260107004129_add_impersonation_feature
- Prevents 5 simultaneous deployments (now only uses Render auto-deploy)
- Fixes P3009 migration error blocking deployments
```
