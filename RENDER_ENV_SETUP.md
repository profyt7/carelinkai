# Render Environment Variable Setup Guide

## 📋 Overview

This guide provides step-by-step instructions for configuring the `RESEND_API_KEY` environment variable on your Render service **carelinkai**.

**API Key:** `re_ZqdFsZVm_NeP55XeaWozxRhKZQohZbZk4`

---

## 🎯 Quick Summary

Since the Render CLI requires authentication with a Render API token (which would need to be generated from your Render account), the **recommended approach** is to set the environment variable manually through the Render Dashboard. This is secure, straightforward, and takes less than 2 minutes.

---

## 🚀 Method 1: Render Dashboard (Recommended)

### Step-by-Step Instructions

#### 1. **Log in to Render Dashboard**
   - Navigate to [https://dashboard.render.com](https://dashboard.render.com)
   - Sign in with your credentials

#### 2. **Select Your Service**
   - From the dashboard, locate and click on your **carelinkai** service
   - This will open the service details page

#### 3. **Navigate to Environment Settings**
   - In the left sidebar, click on **"Environment"**
   - This will display your current environment variables

#### 4. **Add the RESEND_API_KEY**
   - Click the **"+ Add Environment Variable"** button
   - Fill in the following:
     - **Key:** `RESEND_API_KEY`
     - **Value:** `re_ZqdFsZVm_NeP55XeaWozxRhKZQohZbZk4`

#### 5. **Save and Deploy**
   - You have three save options:
     - **"Save, rebuild, and deploy"** - Triggers a new build and deployment (use if you have code changes)
     - **"Save and deploy"** - Re-deploys with the new variable using existing build (recommended for env var only changes)
     - **"Save only"** - Saves without deploying (use if you want to add more variables first)
   
   - **Recommended:** Click **"Save and deploy"** to apply the changes immediately

#### 6. **Verify Deployment**
   - Wait for the deployment to complete (usually 1-3 minutes)
   - Check the deployment logs to ensure no errors occurred
   - The `RESEND_API_KEY` is now available to your application

---

## 🔧 Method 2: Render API (Programmatic - Advanced)

If you prefer to use the Render API programmatically, follow these steps:

### Prerequisites
- Render API Key (generate from [https://dashboard.render.com/u/settings#api-keys](https://dashboard.render.com/u/settings#api-keys))
- Your service ID (found in the service URL or via API)

### Using cURL

```bash
# Set your Render API key
export RENDER_API_KEY="your_render_api_key_here"

# Set your service ID
export SERVICE_ID="your_service_id_here"

# Add or update the environment variable
curl -X PUT "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/RESEND_API_KEY" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "re_ZqdFsZVm_NeP55XeaWozxRhKZQohZbZk4"
  }'

# Trigger a deployment to apply changes
curl -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "clearCache": "do_not_clear"
  }'
```

### Using Python

```python
import requests
import os

RENDER_API_KEY = os.environ.get('RENDER_API_KEY')
SERVICE_ID = 'your_service_id_here'

# Add or update environment variable
response = requests.put(
    f'https://api.render.com/v1/services/{SERVICE_ID}/env-vars/RESEND_API_KEY',
    headers={
        'Authorization': f'Bearer {RENDER_API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'value': 're_ZqdFsZVm_NeP55XeaWozxRhKZQohZbZk4'
    }
)

print(f"Update status: {response.status_code}")

# Trigger deployment
deploy_response = requests.post(
    f'https://api.render.com/v1/services/{SERVICE_ID}/deploys',
    headers={
        'Authorization': f'Bearer {RENDER_API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'clearCache': 'do_not_clear'
    }
)

print(f"Deploy status: {deploy_response.status_code}")
```

---

## 🔧 Method 3: Render CLI (Alternative)

### Installation

Choose one of the following installation methods:

#### Option A: Homebrew (macOS/Linux)
```bash
brew update
brew install render
```

#### Option B: Direct Install Script (Linux/macOS)
```bash
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
```

#### Option C: Direct Download
- Visit [https://github.com/render-oss/cli/releases](https://github.com/render-oss/cli/releases)
- Download the appropriate binary for your system
- Make it executable: `chmod +x render`
- Move to PATH: `sudo mv render /usr/local/bin/`

### Authentication

```bash
# Login to Render (opens browser for token generation)
render login

# Set your active workspace
render workspace set
```

### Setting Environment Variable

```bash
# List your services to find the service ID
render services

# Note: The Render CLI doesn't have a direct command to set individual env vars
# You'll need to use the Render Dashboard or API for this
```

**Note:** As of now, the Render CLI is primarily focused on deployments, logs, and service management. For environment variable configuration, the Dashboard or API methods are more straightforward.

---

## 📝 Local Development Setup

The `RESEND_API_KEY` has already been stored locally in `.env.local` for your development environment:

```bash
# Location: /home/ubuntu/carelinkai-project/.env.local
RESEND_API_KEY=re_ZqdFsZVm_NeP55XeaWozxRhKZQohZbZk4
```

### Security Notes:
- ✅ `.env.local` has been added to `.gitignore`
- ✅ This file will NOT be committed to version control
- ✅ The API key is secure and only accessible locally

### Using in Your Application

Depending on your framework, the environment variable will be automatically loaded:

**Next.js:**
```javascript
// Automatically loaded from .env.local
const resendApiKey = process.env.RESEND_API_KEY;
```

**Node.js (with dotenv):**
```javascript
require('dotenv').config({ path: '.env.local' });
const resendApiKey = process.env.RESEND_API_KEY;
```

---

## ✅ Verification Steps

After setting the environment variable on Render:

### 1. Check Environment Variables
- Go to your service in Render Dashboard
- Click "Environment" in the left sidebar
- Verify `RESEND_API_KEY` is listed

### 2. Check Deployment Logs
- Click "Logs" in the left sidebar
- Look for any errors related to missing environment variables
- Confirm the service started successfully

### 3. Test the Integration
- Send a test email using your application
- Check Resend dashboard for email delivery status
- Monitor application logs for any Resend-related errors

---

## 🔍 Troubleshooting

### Issue: Environment variable not available in application

**Solution:**
- Ensure you clicked "Save and deploy" (not just "Save only")
- Wait for deployment to complete
- Check that the variable name is exactly `RESEND_API_KEY` (case-sensitive)

### Issue: Deployment failed after adding variable

**Solution:**
- Check deployment logs for specific error messages
- Verify the API key format is correct
- Ensure no trailing spaces in the key or value

### Issue: Emails not sending

**Solution:**
- Verify the API key is active in your Resend dashboard
- Check Resend API logs for authentication errors
- Ensure your application code is correctly reading the environment variable

---

## 📚 Additional Resources

- [Render Environment Variables Documentation](https://render.com/docs/configure-environment-variables)
- [Render API Documentation](https://api-docs.render.com/)
- [Render CLI Documentation](https://render.com/docs/cli)
- [Resend API Documentation](https://resend.com/docs)

---

## 🎉 Next Steps

1. ✅ **Set the environment variable** on Render using Method 1 (Dashboard)
2. ✅ **Wait for deployment** to complete
3. ✅ **Test email functionality** in your application
4. ✅ **Monitor logs** for any issues
5. ✅ **Verify email delivery** in Resend dashboard

---

**Configuration Date:** January 6, 2026  
**Service:** carelinkai  
**Environment Variable:** RESEND_API_KEY  
**Status:** Ready for deployment
