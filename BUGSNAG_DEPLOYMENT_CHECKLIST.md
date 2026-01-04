# Bugsnag Deployment Checklist

## ✅ Implementation Status: COMPLETE

**Commit**: `3e14708` - "feat: Complete migration from Sentry to Bugsnag for error tracking"  
**Date**: January 3, 2026  
**Files Changed**: 32 files (2,445 insertions, 4,585 deletions)

---

## 📋 Pre-Deployment Checklist

### 1. Get Bugsnag API Key ⏳ PENDING

- [ ] Log in to Bugsnag dashboard: https://app.bugsnag.com
- [ ] Create or select your project
- [ ] Navigate to Settings → Project Settings
- [ ] Copy the "Notifier API key"
- [ ] API key format: `1234567890abcdef1234567890abcdef`

### 2. Update Local Environment ⏳ PENDING

- [ ] Open `/home/ubuntu/carelinkai-project/.env`
- [ ] Find line: `NEXT_PUBLIC_BUGSNAG_API_KEY=YOUR_BUGSNAG_API_KEY_HERE`
- [ ] Replace with actual API key: `NEXT_PUBLIC_BUGSNAG_API_KEY=your_actual_key`
- [ ] Save the file

### 3. Test Locally ⏳ PENDING

- [ ] Start dev server: `npm run dev`
- [ ] Visit: `http://localhost:3000/test-bugsnag-client`
- [ ] Click "Test Client Error" button
- [ ] Click "Test Server Error" button
- [ ] Check Bugsnag dashboard for both errors
- [ ] Verify error details and metadata are captured

### 4. Update Render Environment Variables ⏳ PENDING

- [ ] Go to Render dashboard: https://dashboard.render.com
- [ ] Select your CareLinkAI web service
- [ ] Click "Environment" tab
- [ ] Add new environment variable:
  - Key: `NEXT_PUBLIC_BUGSNAG_API_KEY`
  - Value: `[Your Bugsnag API Key]`
- [ ] Click "Save Changes"
- [ ] Wait for automatic redeploy

### 5. Push to GitHub ⏳ PENDING

- [ ] Verify commit: `git log --oneline -1`
- [ ] Push to main: `git push origin main`
- [ ] Verify push successful on GitHub

### 6. Verify Deployment ⏳ PENDING

- [ ] Go to Render dashboard
- [ ] Check deployment logs for:
  - ✅ Build successful
  - ✅ `npm install` completed
  - ✅ Next.js build successful
  - ✅ No Sentry-related errors
- [ ] Look for: `✅ Bugsnag client initialized successfully`

### 7. Test in Production ⏳ PENDING

- [ ] Visit: `https://your-app.onrender.com/test-bugsnag-client`
- [ ] Run all three tests (client, server, error boundary)
- [ ] Check Bugsnag dashboard for production errors
- [ ] Verify environment shows as "production"

---

## 📊 What Was Migrated

### ❌ Removed (Sentry)
- `@sentry/nextjs` package
- `@sentry/profiling-node` package
- All Sentry configuration files (6 files)
- Sentry imports from layout
- Sentry wrapper in next.config.js
- Sentry test endpoints (3 endpoints)
- Sentry test components (2 components)
- Sentry environment variables

### ✅ Added (Bugsnag)
- `@bugsnag/js` package
- `@bugsnag/plugin-react` package
- Client configuration: `src/lib/bugsnag-client.ts`
- Server configuration: `src/lib/bugsnag-server.ts`
- Provider component: `src/components/BugsnagProvider.tsx`
- Test endpoint: `/api/test-bugsnag`
- Test page: `/test-bugsnag-client`
- Setup documentation: `BUGSNAG_SETUP.md`
- Migration summary: `SENTRY_TO_BUGSNAG_MIGRATION.md`
- Bugsnag environment variable

### 🔄 Updated
- `next.config.js` - Removed Sentry wrapper
- `src/app/layout.tsx` - Added BugsnagProvider
- `src/app/operator/layout.tsx` - Removed SentryTestButton
- `src/app/global-error.tsx` - Updated error boundary
- 5 API routes - Replaced Sentry with Bugsnag
- `.env` - Updated environment variables

---

## 🧪 Testing Verification

### Local Testing
After updating `.env` with API key:

```bash
# Start dev server
npm run dev

# Visit test page
open http://localhost:3000/test-bugsnag-client
```

**Expected Results:**
- ✅ Page loads without errors
- ✅ Console shows: "✅ Bugsnag client initialized successfully"
- ✅ Client test sends error to Bugsnag
- ✅ Server test sends error to Bugsnag
- ✅ Error boundary test shows fallback UI
- ✅ All errors visible in Bugsnag dashboard

### Production Testing
After deployment to Render:

```bash
# Visit production test page
open https://your-app.onrender.com/test-bugsnag-client
```

**Expected Results:**
- ✅ Same as local testing
- ✅ Environment shows as "production" in Bugsnag
- ✅ All metadata captured correctly

---

## 🔍 Verification Commands

### Check Bugsnag Integration
```bash
# Check for Bugsnag files
ls -la src/lib/bugsnag-*
ls -la src/components/BugsnagProvider.tsx

# Check for Sentry remnants (should be empty)
grep -r "@sentry" src --include="*.tsx" --include="*.ts"

# Check environment variable (local)
grep BUGSNAG .env
```

### Check Git Status
```bash
# View latest commit
git log --oneline -1

# Check for uncommitted changes
git status

# View files changed
git show --stat
```

### Check Package.json
```bash
# Check Bugsnag packages installed
npm list @bugsnag/js @bugsnag/plugin-react

# Check no Sentry packages (should error)
npm list @sentry/nextjs @sentry/profiling-node
```

---

## 🚨 Troubleshooting

### "Bugsnag API key not configured" Warning

**Problem**: Console shows warning about missing API key.

**Solution**:
1. Check `.env` file has correct API key
2. Restart development server: `npm run dev`
3. Verify key is not still `YOUR_BUGSNAG_API_KEY_HERE`

### Errors Not Appearing in Bugsnag

**Problem**: Test errors sent but not visible in dashboard.

**Solution**:
1. Verify API key is correct
2. Check you're looking at correct Bugsnag project
3. Check time filter in Bugsnag (try "All time")
4. Look in "Errors" section, not just Dashboard
5. Wait a few seconds for errors to appear

### Build Errors on Deployment

**Problem**: Render deployment fails with build errors.

**Solution**:
1. Check deployment logs for specific error
2. Verify all imports are correct
3. Ensure Bugsnag packages installed
4. Try local build: `npm run build`

### Missing Environment Variable

**Problem**: Production shows "API key not configured".

**Solution**:
1. Go to Render dashboard
2. Check Environment tab
3. Verify `NEXT_PUBLIC_BUGSNAG_API_KEY` is set
4. Trigger manual redeploy if needed

---

## 📚 Documentation References

1. **Setup Guide**: `BUGSNAG_SETUP.md`
   - Complete step-by-step instructions
   - API key configuration
   - Testing procedures

2. **Migration Summary**: `SENTRY_TO_BUGSNAG_MIGRATION.md`
   - Technical details of migration
   - Before/after comparison
   - Feature comparison

3. **Bugsnag Docs**: https://docs.bugsnag.com
   - JavaScript guide
   - React integration
   - Next.js setup

---

## 🎯 Success Criteria

Migration is successful when:

- [x] ✅ All Sentry code removed
- [x] ✅ Bugsnag packages installed
- [x] ✅ Configuration files created
- [x] ✅ Integration complete
- [x] ✅ Test endpoints created
- [x] ✅ Documentation written
- [x] ✅ Changes committed to Git
- [ ] ⏳ API key configured (local)
- [ ] ⏳ API key configured (production)
- [ ] ⏳ Local tests passing
- [ ] ⏳ Deployed to production
- [ ] ⏳ Production tests passing

---

## 📞 Next Steps

### Immediate (Required)

1. **Get API Key** (5 minutes)
   - Log in to Bugsnag
   - Copy API key

2. **Configure Locally** (2 minutes)
   - Update `.env` file
   - Restart dev server

3. **Test Locally** (5 minutes)
   - Run all three tests
   - Verify in Bugsnag dashboard

4. **Configure Production** (3 minutes)
   - Update Render environment variables
   - Wait for redeploy

5. **Test Production** (5 minutes)
   - Run production tests
   - Verify in Bugsnag dashboard

**Total Time**: ~20 minutes

### Optional (Future)

1. **Source Maps**: Configure for better stack traces
2. **User Context**: Add user identification
3. **Custom Grouping**: Configure error grouping rules
4. **Notifications**: Set up Bugsnag alerts

---

## ✨ Migration Complete!

All code changes are done and committed. You just need to:

1. Add your Bugsnag API key
2. Test locally
3. Deploy to production
4. Verify everything works

Refer to `BUGSNAG_SETUP.md` for detailed instructions!

---

**Status**: ✅ READY FOR API KEY CONFIGURATION  
**Last Updated**: January 3, 2026  
**Commit**: `3e14708`
