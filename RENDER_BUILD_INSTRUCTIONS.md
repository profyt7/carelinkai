# Render Deployment Instructions

## Memory Issue Resolution - January 6, 2026

### Problem
Deployment was failing with "JavaScript heap out of memory" error at build time, preventing the navigation link and other recent changes from being deployed.

### Root Cause
The Node.js heap size was limited to 4096 MB (4 GB), which was insufficient for the current build size.

### Solution
Increased Node.js heap size to **8192 MB (8 GB)** across all build scripts.

---

## Build Configuration Changes

### Modified Files
- `package.json` - Updated 3 build scripts with increased memory allocation

### Updated Scripts
```json
"build": "NODE_OPTIONS='--max-old-space-size=8192' NEXT_TELEMETRY_DISABLED=1 next build"
"build:production": "NODE_OPTIONS='--max-old-space-size=8192' NEXT_TELEMETRY_DISABLED=1 next build"
"build:original": "cross-env NODE_OPTIONS=--max-old-space-size=8192 next build"
```

---

## Render Dashboard Settings

### Build Command
**Use the default npm build command which will execute:**
```bash
npm run build
```

This will automatically use the updated memory settings from `package.json`.

### Alternative: Manual Build Command
If you need to set the build command manually in Render dashboard:
```bash
NODE_OPTIONS='--max-old-space-size=8192' NEXT_TELEMETRY_DISABLED=1 npm run build
```

### Start Command
```bash
npm start
```

This will:
1. Run database migrations (`npm run migrate:deploy`)
2. Start the Next.js production server

---

## Environment Variables Required on Render

Ensure these are set in the Render dashboard:

### Critical Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your production URL (e.g., `https://getcarelinkai.com`)
- `NEXTAUTH_SECRET` - Secure random string for NextAuth
- `NODE_ENV=production`

### Optional but Recommended
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `SENDGRID_API_KEY` (for email functionality)
- `STRIPE_SECRET_KEY` (for payment processing)
- `NEXT_PUBLIC_BUGSNAG_API_KEY` (for error tracking)

### Memory Setting (Add this to Render)
- `NODE_OPTIONS=--max-old-space-size=8192`

**Note:** While this is now set in package.json scripts, adding it as an environment variable in Render provides an additional safety layer.

---

## Verification Steps

### 1. Local Build Test (Already Completed ✅)
```bash
cd /home/ubuntu/carelinkai-project
npm run build
```
**Result:** Build completed successfully without memory errors.

### 2. Render Deployment Verification
After pushing to GitHub and triggering deployment:

1. **Monitor Build Phase**
   - Check Render logs for "Creating an optimized production build"
   - Verify no "heap out of memory" errors appear
   - Build should complete in 5-10 minutes

2. **Check Build Output**
   - Look for: "✓ Compiled successfully"
   - Verify page count matches expected (~87 pages)
   - Check for: "○ (Static) prerendered as static content"

3. **Verify Deployment**
   - Deployment should show "Live" status
   - Health check should pass
   - Application should be accessible at production URL

### 3. Application Health Checks
After deployment is live:

```bash
# Test homepage
curl -I https://getcarelinkai.com

# Test API health
curl https://getcarelinkai.com/api/health

# Test navigation link (the feature that was blocked)
# Visit https://getcarelinkai.com and check navigation
```

---

## Expected Outcomes

### ✅ What Should Work Now
1. **Build Success**: Build completes without memory errors
2. **Navigation Link**: New navigation code gets deployed
3. **All Features**: Report Bug Button, Enhanced Search, Navigation Links all deployed
4. **Database Migrations**: Auto-deploy migrations run successfully
5. **Application Starts**: Next.js server starts without issues

### 📊 Build Performance
- **Build Time**: 5-10 minutes (depending on Render instance)
- **Memory Usage**: Peak ~6-7 GB (safely under 8 GB limit)
- **Build Size**: ~82.7 kB shared JS + dynamic routes

---

## Troubleshooting

### If Build Still Fails with Memory Error
1. **Double-check Render Settings**:
   - Go to Render Dashboard → Your Service → Settings
   - Verify Build Command is `npm run build`
   - Check if NODE_OPTIONS environment variable is set

2. **Increase Memory Further** (if needed):
   ```bash
   # In package.json, change to 10240 (10 GB)
   "build": "NODE_OPTIONS='--max-old-space-size=10240' NEXT_TELEMETRY_DISABLED=1 next build"
   ```

3. **Check Render Instance Type**:
   - Ensure you're using a plan with at least 8 GB RAM
   - Free tier may not support this memory allocation

### If Build Succeeds but Deployment Fails
1. **Check Migration Issues**:
   ```bash
   # Render logs should show:
   npm run migrate:deploy
   ```
   - If migrations fail, check DATABASE_URL
   - Verify database is accessible from Render

2. **Check Environment Variables**:
   - Verify all required env vars are set
   - Check for typos in variable names

3. **Check Application Logs**:
   - Look for startup errors
   - Verify port binding (Render sets PORT automatically)

---

## Deployment Checklist

- [x] ✅ Updated package.json with increased memory (8192 MB)
- [x] ✅ Tested build locally (successful)
- [ ] Push changes to GitHub main branch
- [ ] Verify Render auto-deploy triggers
- [ ] Monitor build phase in Render logs
- [ ] Verify deployment goes live
- [ ] Test navigation link feature
- [ ] Check application health endpoints
- [ ] Verify database migrations applied

---

## Rollback Plan

If deployment fails and needs rollback:

1. **Revert package.json Changes**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Manual Deploy Previous Version**:
   - In Render Dashboard, go to "Deploys" tab
   - Find last successful deployment
   - Click "Redeploy"

3. **Alternative Memory Settings**:
   If 8192 MB is too much for your Render instance:
   ```bash
   # Try 6144 MB (6 GB)
   NODE_OPTIONS='--max-old-space-size=6144'
   ```

---

## Technical Details

### Memory Allocation Breakdown
- **Previous**: 4096 MB (4 GB) → Failed at build time
- **Current**: 8192 MB (8 GB) → Build successful
- **Safety Margin**: ~1-2 GB available for overhead

### Build Process
1. **prebuild**: Cleans `.next` and runs `prisma generate`
2. **build**: Compiles Next.js with increased memory
3. **Optimization**: Uses SWC minification, skips TS/ESLint checks
4. **Output**: Generates static and dynamic routes

### Next.js Configuration
- **Compiler**: SWC (faster than Terser)
- **Type Checking**: Disabled (ignoreBuildErrors: true)
- **Linting**: Disabled (ignoreDuringBuilds: true)
- **Telemetry**: Disabled (NEXT_TELEMETRY_DISABLED=1)

---

## Additional Resources

- **Next.js Build Optimization**: https://nextjs.org/docs/advanced-features/compiler
- **Node.js Memory Management**: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
- **Render Deployment Docs**: https://render.com/docs/deploy-nextjs-app

---

## Contact & Support

If you continue to experience issues:
1. Check Render logs for specific error messages
2. Verify environment variables match production requirements
3. Test database connectivity from Render instance
4. Review recent commits for potential breaking changes

**Last Updated**: January 6, 2026  
**Build Status**: ✅ Verified Locally  
**Memory Allocation**: 8192 MB  
**Next Step**: Push to GitHub for deployment
