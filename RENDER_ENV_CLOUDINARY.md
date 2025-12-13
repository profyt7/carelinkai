# Render Environment Variables Setup for Cloudinary

## Overview

This guide provides step-by-step instructions for configuring Cloudinary environment variables in Render for the CareLinkAI application.

## Prerequisites

- Access to Render Dashboard: https://dashboard.render.com/
- Cloudinary account with API credentials
- CareLinkAI service deployed on Render

## Step-by-Step Instructions

### Step 1: Access Render Dashboard

1. Navigate to https://dashboard.render.com/
2. Log in with your credentials
3. Locate the **CareLinkAI** service in your dashboard

### Step 2: Open Environment Variables

1. Click on your **CareLinkAI** service
2. Navigate to the **Environment** tab in the left sidebar
3. You should see a list of existing environment variables

### Step 3: Add Cloudinary Environment Variables

Add the following environment variables one by one:

#### Variable 1: CLOUDINARY_CLOUD_NAME
- **Key**: `CLOUDINARY_CLOUD_NAME`
- **Value**: `your_cloud_name_here` (get from Cloudinary dashboard)
- **Type**: Secret (recommended)

#### Variable 2: CLOUDINARY_API_KEY
- **Key**: `CLOUDINARY_API_KEY`
- **Value**: `your_api_key_here` (get from Cloudinary dashboard)
- **Type**: Secret (recommended)

#### Variable 3: CLOUDINARY_API_SECRET
- **Key**: `CLOUDINARY_API_SECRET`
- **Value**: `your_api_secret_here` (get from Cloudinary dashboard)
- **Type**: Secret (**REQUIRED** - this is sensitive)

#### Variable 4: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- **Key**: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Value**: `your_cloud_name_here` (same as Variable 1)
- **Type**: Plain (this is public and safe to expose)

#### Variable 5: CLOUDINARY_URL (Optional)
- **Key**: `CLOUDINARY_URL`
- **Value**: `cloudinary://your_api_key:your_api_secret@your_cloud_name`
- **Type**: Secret (recommended)

### Step 4: Save Changes

1. After adding all variables, click **Save Changes** button
2. Render will automatically trigger a new deployment
3. Wait for the deployment to complete (usually 3-5 minutes)

### Step 5: Verify Deployment

#### Check Deployment Logs

1. Go to the **Logs** tab
2. Look for successful deployment messages
3. Check for any Cloudinary-related errors

Expected log entries:
```
✅ Build succeeded
✅ Starting service
✅ Service is live
```

#### Test File Upload

1. Navigate to https://carelinkai.onrender.com
2. Log in to the application
3. Try uploading a file:
   - Go to Family Portal → Gallery
   - Click "Upload Photos"
   - Select an image and upload
   - Verify the image appears in the gallery

4. Alternative test - Upload a document:
   - Go to Operator Dashboard → Residents
   - Select a resident
   - Go to Documents tab
   - Upload a test document
   - Verify the document appears

#### Verify in Cloudinary Dashboard

1. Log in to Cloudinary: https://console.cloudinary.com/
2. Go to **Media Library**
3. Check for newly uploaded files under the `carelinkai/` folder
4. Verify files are stored correctly

## Troubleshooting

### Issue: Environment variables not taking effect

**Solution:**
1. Clear Render's build cache:
   - Go to Settings → Build & Deploy
   - Click "Clear Build Cache"
   - Trigger manual deploy

2. Restart the service:
   - Go to Manual Deploy
   - Click "Clear build cache & deploy"

### Issue: Upload fails with "Cloudinary not configured"

**Possible Causes:**
- Environment variables not saved
- Service not redeployed after adding variables
- Typo in variable names

**Solution:**
1. Double-check variable names (case-sensitive)
2. Verify all 5 variables are present
3. Trigger a manual redeploy
4. Check deployment logs for errors

### Issue: 401 Unauthorized Error

**Possible Causes:**
- Incorrect API credentials
- API secret mismatch
- Cloud name typo

**Solution:**
1. Verify credentials in Cloudinary dashboard
2. Check for extra spaces in values
3. Ensure cloud name is exact (e.g., `dygtsnu8z` not `dygtsnud8`)
4. Regenerate API credentials if needed

### Issue: Files not appearing in Cloudinary

**Possible Causes:**
- Wrong cloud name
- Incorrect folder structure
- API key/secret mismatch

**Solution:**
1. Check Cloudinary dashboard for correct cloud name
2. Verify credentials match your account
3. Test with the connection script locally first

## Security Notes

### ⚠️ Important Security Considerations

1. **Never commit credentials to git**
   - `.env` file is gitignored
   - Always use environment variables in production

2. **Use "Secret" type for sensitive values**
   - `CLOUDINARY_API_SECRET` must be Secret
   - `CLOUDINARY_URL` should be Secret
   - `CLOUDINARY_API_KEY` should be Secret

3. **Only use "Plain" for public values**
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is safe as Plain
   - This is exposed to the browser intentionally

4. **Rotate credentials periodically**
   - Update Cloudinary API credentials every 6-12 months
   - Update both Cloudinary and Render when rotating

5. **Monitor usage**
   - Check Cloudinary usage reports
   - Set up alerts for unusual activity
   - Monitor bandwidth and storage limits

## Rollback Procedure

If you need to rollback the Cloudinary integration:

1. **Remove Environment Variables** (if needed):
   - Go to Environment tab in Render
   - Delete Cloudinary-related variables
   - Save changes

2. **Redeploy Previous Version**:
   - Go to Deploys tab
   - Find the last successful deploy before Cloudinary
   - Click "Redeploy" on that version

3. **Verify Application**:
   - Test that application works without Cloudinary
   - File uploads may be disabled or use alternative storage

## Additional Resources

- **Render Documentation**: https://render.com/docs/environment-variables
- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **CareLinkAI Cloudinary Setup**: See `docs/CLOUDINARY_SETUP.md`

## Support

If you encounter issues:

1. **Check Render Logs**: Look for specific error messages
2. **Review Cloudinary Status**: https://status.cloudinary.com/
3. **Contact Support**:
   - Render Support: https://render.com/support
   - Cloudinary Support: https://support.cloudinary.com/

## Environment Variable Summary

Copy-paste ready format for quick setup:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

**Note**: Replace these placeholders with your actual Cloudinary credentials from your Cloudinary dashboard.

## Verification Checklist

Use this checklist after deployment:

- [ ] All 5 environment variables added to Render
- [ ] Variables marked as "Secret" where appropriate
- [ ] Deployment completed successfully
- [ ] No errors in deployment logs
- [ ] Application loads without errors
- [ ] Test file upload in Gallery works
- [ ] Test document upload works
- [ ] Files appear in Cloudinary Media Library
- [ ] Thumbnail generation works
- [ ] File deletion works (if implemented)

## Timeline

- **Adding Variables**: 2-3 minutes
- **Render Deployment**: 3-5 minutes
- **Total Setup Time**: ~5-10 minutes

---

**Last Updated**: December 13, 2025
**Version**: 1.0
**Author**: CareLinkAI Development Team
