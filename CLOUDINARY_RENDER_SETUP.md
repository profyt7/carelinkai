# Cloudinary Setup on Render - Quick Action Guide

**URGENT**: This must be completed for download functionality to work.

---

## Problem
Documents are not uploading to Cloudinary because the environment variables are missing on Render.

## Solution
Add Cloudinary environment variables to your Render service.

---

## Step-by-Step Instructions

### 1. Access Render Dashboard
1. Go to: https://dashboard.render.com/
2. Sign in with your GitHub account (profyt7/carelinkai)
3. Navigate to your **carelinkai** service

### 2. Open Environment Settings
1. Click on your **carelinkai** web service
2. Click on **"Environment"** in the left sidebar
3. Scroll to the **"Environment Variables"** section

### 3. Add Cloudinary Variables
Click **"Add Environment Variable"** and add each of the following:

#### Variable 1: CLOUDINARY_CLOUD_NAME
```
Key:   CLOUDINARY_CLOUD_NAME
Value: dygtsnu8z
```

#### Variable 2: CLOUDINARY_API_KEY
```
Key:   CLOUDINARY_API_KEY
Value: 328392542172231
```

#### Variable 3: CLOUDINARY_API_SECRET
```
Key:   CLOUDINARY_API_SECRET
Value: KhpohAEFGsjVKuXRENaBhCoIYFQ
```

#### Variable 4: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
```
Key:   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
Value: dygtsnu8z
```

#### Variable 5: CLOUDINARY_URL (Optional but recommended)
```
Key:   CLOUDINARY_URL
Value: cloudinary://328392542172231:KhpohAEFGsjVKuXRENaBhCoIYFQ@dygtsnu8z
```

### 4. Save and Deploy
1. Click **"Save Changes"** at the bottom
2. Render will automatically trigger a redeploy
3. Wait 3-5 minutes for deployment to complete

---

## Verification Steps

### After Deployment Completes:

1. **Go to**: https://carelinkai.onrender.com/auth/login

2. **Login as Family User**:
   - Email: `demo.family@carelinkai.test`
   - Password: `DemoUser123!`

3. **Navigate to Documents Tab**

4. **Upload a New Document**:
   - Click "Upload Document"
   - Fill in title and description
   - Select a file (any small file)
   - Click "Upload"

5. **Check Upload Success**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Upload should complete without errors

6. **Test Download**:
   - Click "Download" button on the newly uploaded document
   - **Expected**: File should download successfully
   - **Expected**: No "Legacy file path" error
   - **Expected**: Network tab shows 302 redirect to Cloudinary URL

7. **Verify in Network Tab**:
   ```
   Status: 302 (Redirect)
   Location: https://res.cloudinary.com/dygtsnu8z/...
   ```

---

## Expected Outcomes

### ✅ Success Indicators
- Upload completes without errors
- Document appears in list immediately
- Download button works (302 redirect)
- File downloads to your computer
- Network tab shows redirect to `res.cloudinary.com`
- No console errors

### ❌ Still Failing?
If downloads still fail after configuration:

1. **Check Environment Variables**:
   - Verify all 5 variables are set correctly
   - Check for typos in keys or values
   - Ensure no extra spaces

2. **Verify Deployment**:
   - Check Render logs for deployment completion
   - Look for "Deploy live" status
   - Verify timestamp is after adding env vars

3. **Check Cloudinary Account**:
   - Login to Cloudinary dashboard
   - Verify cloud name is `dygtsnu8z`
   - Check if uploads are appearing

4. **Review Logs**:
   - Check Render logs for Cloudinary-related errors
   - Look for "CLOUDINARY_CLOUD_NAME" mentions
   - Check for upload/download errors

---

## Alternative: Manual Redeploy

If auto-deploy doesn't trigger:

1. Go to your service on Render
2. Click **"Manual Deploy"** button
3. Select **"Deploy latest commit"**
4. Wait for deployment to complete

---

## Troubleshooting

### Issue: "Upload service not configured" Error
**Cause**: Environment variables not set or deployment not complete  
**Solution**: Double-check all 5 variables are added, wait for deployment

### Issue: Downloads still showing "Legacy file path" Error
**Cause**: New uploads still not using Cloudinary  
**Solution**: Verify env vars, check Render logs for Cloudinary initialization

### Issue: Uploads succeeding but downloads failing
**Cause**: Upload using Cloudinary but download endpoint not detecting it  
**Solution**: Check document metadata in database for `uploadService: 'cloudinary'`

---

## Quick Copy-Paste Block

For easy copy-paste into Render:

```
CLOUDINARY_CLOUD_NAME=dygtsnu8z
CLOUDINARY_API_KEY=328392542172231
CLOUDINARY_API_SECRET=KhpohAEFGsjVKuXRENaBhCoIYFQ
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dygtsnu8z
CLOUDINARY_URL=cloudinary://328392542172231:KhpohAEFGsjVKuXRENaBhCoIYFQ@dygtsnu8z
```

---

## Time Estimate

- **Configuration**: 5 minutes
- **Deployment**: 3-5 minutes
- **Verification**: 5 minutes
- **Total**: ~15 minutes

---

## Support

If you encounter issues:

1. Check Render deployment logs
2. Verify all environment variables are set correctly
3. Test with a fresh document upload
4. Check browser console and network tabs for errors

---

**Last Updated**: December 14, 2025  
**Status**: Ready to Execute  
**Priority**: CRITICAL
