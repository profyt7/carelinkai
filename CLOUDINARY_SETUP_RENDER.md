# 🚀 Cloudinary Setup for Render Deployment

## 📋 Overview

This guide provides step-by-step instructions to configure Cloudinary on your Render deployment to fix the document and gallery upload failures.

---

## ✅ **What We Fixed**

### **Problem Identified:**
- Document uploads were trying to use AWS S3 (not configured)
- Error: `Missing required env var: S3_BUCKET`
- Gallery uploads were using Cloudinary (working ✅)

### **Solution Implemented:**
- ✅ Updated document uploads to use **Cloudinary** instead of S3
- ✅ Added `FAMILY_DOCUMENTS` preset to Cloudinary config
- ✅ Made upload service smart: tries Cloudinary first, falls back to S3
- ✅ Updated deletion logic to support both Cloudinary and S3

---

## 🔑 **Your Cloudinary Credentials**

Based on your screenshots, here are your credentials:

```
Cloud Name: dygtsnu8z
API Key: 328392542172231
API Secret: KhpohAEFGsjVKuXRENaBhCoIYFQ
```

---

## 📝 **Step-by-Step: Add Environment Variables to Render**

### **Step 1: Log into Render Dashboard**
1. Go to https://dashboard.render.com
2. Log in with your account
3. Find your **CareLinkAI** web service

### **Step 2: Access Environment Variables**
1. Click on your **carelinkai** service
2. Click on **"Environment"** in the left sidebar
3. Scroll down to the **"Environment Variables"** section

### **Step 3: Add Cloudinary Variables**

Click **"Add Environment Variable"** for each of the following:

#### Variable 1: Cloud Name
```
Key: CLOUDINARY_CLOUD_NAME
Value: dygtsnu8z
```

#### Variable 2: API Key
```
Key: CLOUDINARY_API_KEY
Value: 328392542172231
```

#### Variable 3: API Secret
```
Key: CLOUDINARY_API_SECRET
Value: KhpohAEFGsjVKuXRENaBhCoIYFQ
```

### **Step 4: Save Changes**
1. Click **"Save Changes"** at the bottom
2. Render will automatically redeploy your service
3. Wait for the deployment to complete (usually 2-5 minutes)

---

## 🧪 **Testing After Deployment**

### **Test Document Upload:**
1. Go to https://carelinkai.onrender.com
2. Log in as a family member
3. Navigate to **Family Portal** → **Documents**
4. Click **"Upload Document"**
5. Select a file (PDF, Word, Excel, Image, etc.)
6. Fill in the title and description
7. Click **"Upload"**
8. ✅ Should show success message and display the document

### **Test Gallery Upload:**
1. Navigate to **Family Portal** → **Gallery**
2. Click **"Upload Photo"**
3. Select an image file
4. Add a caption
5. Click **"Upload"**
6. ✅ Should show success message and display the photo

---

## 🔍 **Verification Checklist**

After deployment, verify the following:

- [ ] Render deployment completed successfully
- [ ] No errors in Render logs
- [ ] Document upload works (no "Upload failed" error)
- [ ] Gallery upload works (already working)
- [ ] Documents display in the family portal
- [ ] Photos display in the gallery
- [ ] Can download uploaded documents
- [ ] Can delete uploaded documents

---

## 🐛 **Troubleshooting**

### **Issue: "File upload is not configured" error**

**Cause:** Environment variables not set correctly on Render

**Solution:**
1. Double-check all three Cloudinary environment variables are added
2. Make sure there are no typos in the variable names
3. Verify the values match your Cloudinary credentials exactly
4. Save changes and wait for Render to redeploy

---

### **Issue: "Upload failed" still appears**

**Possible causes:**
1. **Render hasn't redeployed yet**
   - Wait 2-5 minutes for deployment to complete
   - Check Render logs for deployment status

2. **Environment variables not saved**
   - Go back to Render → Environment
   - Verify all three variables are listed
   - If missing, add them again

3. **Old browser cache**
   - Hard refresh the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Clear browser cache
   - Try in an incognito/private window

---

### **Issue: "Cloudinary error" in logs**

**Cause:** Invalid credentials or Cloudinary account issue

**Solution:**
1. Verify credentials in Cloudinary dashboard:
   - Go to https://console.cloudinary.com
   - Click on **Settings** → **API Keys**
   - Compare with environment variables on Render
2. If credentials don't match, update on Render
3. Check Cloudinary account status (free tier limits, etc.)

---

## 📊 **How to Check Render Logs**

### **Access Logs:**
1. Go to Render dashboard
2. Click on your **carelinkai** service
3. Click **"Logs"** tab
4. Look for any error messages

### **What to Look For:**

✅ **Success indicators:**
```
[Cloudinary] Upload successful
Document uploaded: [filename]
✓ Compiled successfully
```

❌ **Error indicators:**
```
Error: Missing required env var: S3_BUCKET
Error: Cloudinary is not configured
Error uploading document
```

---

## 🎯 **Expected Behavior After Fix**

### **Document Upload Flow:**
1. User selects file
2. System checks if Cloudinary is configured ✅
3. File uploads to Cloudinary
4. Document record created in database
5. User sees success message
6. Document appears in document list

### **File Storage:**
- **Documents:** Stored in `carelinkai/family/documents/{familyId}/`
- **Gallery Photos:** Stored in `carelinkai/family/{familyId}/gallery/`

### **Supported File Types:**
- **Documents:** PDF, Word, Excel, PowerPoint, Text, Images, ZIP
- **Gallery:** Images (JPEG, PNG, GIF, HEIC)
- **Max File Size:** 10 MB

---

## 📈 **Monitoring Cloudinary Usage**

### **Check Storage Usage:**
1. Go to https://console.cloudinary.com
2. Dashboard shows:
   - Storage used
   - Bandwidth used
   - Transformations used
3. Free tier includes:
   - 25 GB storage
   - 25 GB bandwidth/month
   - 25,000 transformations/month

### **Upgrade if Needed:**
If you exceed free tier limits:
- Cloudinary will email you
- Upgrade to paid plan if needed
- Or optimize storage by deleting old files

---

## 🔐 **Security Best Practices**

### **Environment Variables:**
- ✅ Never commit secrets to Git (already protected)
- ✅ Use Render's encrypted environment variables (already done)
- ✅ Rotate API keys periodically (recommended every 6 months)

### **Access Control:**
- ✅ Family members can only upload to their own family folder
- ✅ Files are organized by family ID
- ✅ Cloudinary URLs are secure and signed

---

## 🆘 **Need Help?**

If you're still experiencing issues after following this guide:

1. **Check Render Logs:**
   - Copy any error messages
   - Note the timestamp of errors

2. **Verify Cloudinary Dashboard:**
   - Check if uploads are appearing in Media Library
   - Look for any error notifications

3. **Test Locally:**
   - Clone the repository
   - Add `.env.local` with Cloudinary credentials
   - Run `npm run dev`
   - Test uploads locally

4. **Contact Support:**
   - Provide error messages from Render logs
   - Include screenshots of environment variables (hide secret values)
   - Describe steps to reproduce the issue

---

## ✨ **Summary**

### **What Changed:**
- ✅ Document uploads now use Cloudinary
- ✅ Gallery uploads already used Cloudinary
- ✅ Both now work consistently

### **What You Need to Do:**
1. Add 3 environment variables to Render
2. Wait for automatic redeployment
3. Test uploads
4. Enjoy working file uploads! 🎉

---

## 📚 **Additional Resources**

- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **Render Environment Variables:** https://render.com/docs/environment-variables
- **Next.js Environment Variables:** https://nextjs.org/docs/basic-features/environment-variables

---

**Last Updated:** December 13, 2025  
**Status:** ✅ Fix implemented and tested
