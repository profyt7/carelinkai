# Force Render to Use Node Runtime

## Problem
Render is showing "Docker" as runtime even after removing Dockerfile.

## Why This Happens
When a service is **first created** in Render with a Dockerfile, Render permanently sets it as a "Docker" service. Simply removing the Dockerfile doesn't change the service type.

## Solution Options

### Option 1: Delete and Recreate Service (Recommended) ⭐

This is the cleanest solution but requires reconfiguring environment variables.

#### Steps:

**1. Backup Environment Variables (2 min)**
   - Go to Render dashboard: https://dashboard.render.com
   - Select "carelinkai" service
   - Go to "Environment" tab
   - Copy all environment variables to a safe place (text file or notepad)

**2. Delete the Service (1 min)**
   - Go to "Settings" tab
   - Scroll to bottom
   - Click "Delete Web Service"
   - Confirm deletion

**3. Create New Service (5 min)**
   - Click "New +" → "Web Service"
   - Connect to GitHub repository: `profyt7/carelinkai`
   - Render will auto-detect Node runtime (no Dockerfile exists)
   - Configure:
     - **Name**: `carelinkai`
     - **Region**: Oregon (US West)
     - **Branch**: `main`
     - **Runtime**: **Node** (should be auto-detected)
     - **Build Command**: `npm install && npx prisma generate && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: Starter

**4. Add Environment Variables (3 min)**
   - Paste all environment variables from backup
   - Essential variables include:
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
     - `OPENAI_API_KEY`
     - All SMTP_* variables
     - All TWILIO_* variables
     - All CLOUDINARY_* variables
     - `CRON_SECRET`

**5. Deploy (5-10 min)**
   - Click "Create Web Service"
   - Wait for deployment
   - Verify runtime shows "Node" in dashboard

---

### Option 2: Contact Render Support 👍

If you don't want to delete and recreate:

1. Go to Render dashboard
2. Click the chat icon (bottom right)
3. Ask: "Please change my service 'carelinkai' (ID: srv-d3isol3uibrs73d5fm1g) from Docker runtime to Node runtime"
4. Wait for support response (usually 1-2 hours)

---

### Option 3: Use Render Blueprint (render.yaml) ❓

We've added a `render.yaml` file that explicitly specifies Node runtime. However, this might not work for existing services that were created as Docker services.

- The `render.yaml` file is now in the repository
- Render might respect it on next deployment
- If not, you'll need Option 1 or 2

---

## Verification

After changing to Node runtime, you should see:

```
✅ Runtime: Node
✅ Node Version: 20.x
✅ Build Time: 5-10 minutes (not 60-120 minutes)
✅ Smaller build size (~200MB vs ~500MB)
```

---

## Important Notes

- **Downtime**: Deleting and recreating will cause ~10 minutes of downtime
- **Environment Variables**: Make sure to backup all env vars before deleting
- **Database**: Your database (carelinkai-db) is separate and won't be affected
- **Redis**: Your Redis (carelinkai-redis) is separate and won't be affected
- **Domain**: You might need to reconfigure custom domain if you have one
- **Deploy Hooks**: The deploy hook will be regenerated

---

## Current Status

| Item | Status |
|------|--------|
| Runtime | ❌ Docker (slow, inefficient) |
| Should be | ✅ Node (fast, efficient) |
| Dockerfile | ✅ Removed from repository |
| Dockerfile.backup | ✅ Removed from repository |
| render.yaml | ✅ Added with Node configuration |

---

## Recommendation

**Delete and recreate the service** - it's the fastest and most reliable solution.

### Why?
- Guaranteed to work
- Only 10-15 minutes total time
- Future deployments will be **10-20x faster**
- Lower costs (smaller builds, less memory)
- Clean slate with proper configuration

---

## Need Help?

If you need assistance with the migration process, let me know and I can guide you through each step!
