# Quick Fix Guide - Upload 503 Errors

## 🎯 TL;DR - What to Do Now

### 1. Push Code to GitHub ⚠️
```bash
cd /home/ubuntu/carelinkai-project
git push origin main
```
**Note**: If authentication fails, you'll need to set up a GitHub token (see `GITHUB_PUSH_INSTRUCTIONS.md`)

### 2. Check Render Environment Variables
Go to: https://dashboard.render.com → Your Service → Environment

**Must have exactly these names** (case-sensitive):
```
CLOUDINARY_CLOUD_NAME = dygtSnu8z
CLOUDINARY_API_KEY = 328392542172231
CLOUDINARY_API_SECRET = KhpohAEFOsjVKuxRENaBhCoIYFQ
```

⚠️ **Common mistakes**:
- Wrong spelling: `CLOUDINARY_CLOUD` ❌ (should be `CLOUDINARY_CLOUD_NAME` ✅)
- Wrong case: `cloudinary_cloud_name` ❌
- Extra spaces: ` dygtSnu8z ` ❌

### 3. Redeploy on Render
After fixing environment variables:
- Click **"Manual Deploy"** → **"Deploy latest commit"**

### 4. Test Upload Again
Once deployed:
1. Go to https://carelinkai.onrender.com
2. Login as family member
3. Try uploading a photo or document

### 5. If Still Failing - Use Diagnostic
Visit (while logged in):
```
https://carelinkai.onrender.com/api/diagnostic/cloudinary
```

Should show:
```json
{
  "isConfigured": true,
  "environmentVariables": {
    "CLOUDINARY_CLOUD_NAME": { "exists": true },
    "CLOUDINARY_API_KEY": { "exists": true },
    "CLOUDINARY_API_SECRET": { "exists": true }
  }
}
```

If any shows `"exists": false`, that environment variable is missing!

---

## 🔍 Why This Happened

The code requires these **exact** environment variable names:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

If Render doesn't have all three set correctly, uploads return **503 Service Unavailable**.

---

## 📚 More Details

See: `UPLOAD_503_ERROR_DIAGNOSTIC_REPORT.md`

---

## ✅ Success Criteria

- [ ] Environment variables set correctly in Render
- [ ] Code pushed to GitHub
- [ ] Render redeployed
- [ ] Diagnostic endpoint shows `isConfigured: true`
- [ ] Gallery upload works
- [ ] Document upload works

---

**Last Updated**: December 13, 2025  
**Commit**: `54cbc40`
