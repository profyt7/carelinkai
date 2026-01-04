# Bugsnag Error Tracking Setup Guide

## 🎯 Overview

This guide will help you complete the Bugsnag integration for CareLinkAI. The migration from Sentry to Bugsnag is **almost complete** - you just need to add your Bugsnag API key!

## ✅ What's Already Done

The following has been implemented and is ready to use:

### 1. **Packages Installed**
- ✅ `@bugsnag/js` - Core Bugsnag library
- ✅ `@bugsnag/plugin-react` - React error boundary plugin

### 2. **Sentry Completely Removed**
- ✅ Uninstalled `@sentry/nextjs` and `@sentry/profiling-node`
- ✅ Deleted all Sentry configuration files
- ✅ Removed Sentry from `next.config.js`
- ✅ Cleaned up Sentry environment variables

### 3. **Bugsnag Configuration Files Created**
- ✅ `src/lib/bugsnag-client.ts` - Client-side error tracking
- ✅ `src/lib/bugsnag-server.ts` - Server-side error tracking
- ✅ `src/components/BugsnagProvider.tsx` - React error boundary wrapper

### 4. **Integration Complete**
- ✅ Integrated into root layout (`src/app/layout.tsx`)
- ✅ Error boundary with custom fallback UI
- ✅ Automatic error capture for both client and server

### 5. **Test Endpoints Created**
- ✅ `/api/test-bugsnag` - Server-side test endpoint
- ✅ `/test-bugsnag-client` - Client-side test page

## 📋 What You Need to Do

### Step 1: Get Your Bugsnag API Key

1. **Log in to Bugsnag Dashboard**
   - Go to [https://app.bugsnag.com](https://app.bugsnag.com)
   - Log in with your account

2. **Create/Select Project**
   - If you haven't created a project yet:
     - Click "Create new project"
     - Choose "JavaScript" as the platform
     - Name it "CareLinkAI" or similar
   - If you already have a project, select it

3. **Get Your API Key**
   - Go to **Settings** → **Project Settings**
   - Find the **API key** in the "Notifier API key" section
   - It looks something like: `1234567890abcdef1234567890abcdef`
   - **Copy this key** - you'll need it in the next step

### Step 2: Update Environment Variables

#### Local Development (.env file)

1. Open `/home/ubuntu/carelinkai-project/.env`
2. Find this line:
   ```
   NEXT_PUBLIC_BUGSNAG_API_KEY=YOUR_BUGSNAG_API_KEY_HERE
   ```
3. Replace `YOUR_BUGSNAG_API_KEY_HERE` with your actual Bugsnag API key:
   ```
   NEXT_PUBLIC_BUGSNAG_API_KEY=1234567890abcdef1234567890abcdef
   ```

#### Production (Render Dashboard)

1. Go to your Render dashboard: [https://dashboard.render.com](https://dashboard.render.com)
2. Select your CareLinkAI web service
3. Go to **Environment** tab
4. Add/update this environment variable:
   - **Key**: `NEXT_PUBLIC_BUGSNAG_API_KEY`
   - **Value**: `[Your Bugsnag API Key]`
5. Click **Save Changes**
6. Render will automatically redeploy with the new environment variable

### Step 3: Test Locally

1. **Start your development server**:
   ```bash
   cd /home/ubuntu/carelinkai-project
   npm run dev
   ```

2. **Test client-side error tracking**:
   - Open browser to `http://localhost:3000/test-bugsnag-client`
   - Click "Test Client Error" button
   - Check your Bugsnag dashboard for the error

3. **Test server-side error tracking**:
   - On the same test page, click "Test Server Error" button
   - Or visit `http://localhost:3000/api/test-bugsnag` directly
   - Check your Bugsnag dashboard for the error

4. **Test error boundary**:
   - On the test page, click "Throw Uncaught Error" button
   - You should see the error fallback UI
   - Check Bugsnag dashboard for the error

### Step 4: Deploy to Production

1. **Commit your changes** (if not already done):
   ```bash
   cd /home/ubuntu/carelinkai-project
   git add .
   git commit -m "feat: Complete Bugsnag integration with API key"
   git push origin main
   ```

2. **Verify Render deployment**:
   - Go to Render dashboard
   - Check deployment logs for success
   - Look for: `✅ Bugsnag client initialized successfully`

3. **Test in production**:
   - Visit `https://your-app.onrender.com/test-bugsnag-client`
   - Run all three tests
   - Verify errors appear in Bugsnag dashboard

## 🔍 Verification Checklist

After completing the setup, verify everything works:

- [ ] Bugsnag API key added to `.env` file
- [ ] Bugsnag API key added to Render environment variables
- [ ] Local development server starts without errors
- [ ] Client-side test error appears in Bugsnag dashboard
- [ ] Server-side test error appears in Bugsnag dashboard
- [ ] Error boundary test shows fallback UI
- [ ] Production deployment successful
- [ ] Production errors tracked in Bugsnag

## 📊 What Gets Tracked

Bugsnag will automatically track:

### Client-Side Errors
- Unhandled JavaScript errors
- Unhandled promise rejections
- React component errors (caught by error boundary)
- Manual error notifications

### Server-Side Errors
- API route errors
- Server-side rendering errors
- Unhandled exceptions in Node.js
- Manual error notifications

### Metadata Captured
- User information (if available)
- App version and environment
- Browser/device information (client-side)
- Node.js version (server-side)
- Request details (URL, method, headers)
- Custom metadata you add

### Breadcrumbs
- Navigation events
- HTTP requests
- User interactions
- State changes
- Manual breadcrumbs

## 🛠️ Usage in Your Code

### Manually Notify Bugsnag

**Client-Side**:
```typescript
import { notifyBugsnag, leaveBreadcrumb } from '@/lib/bugsnag-client';

// Notify an error
try {
  // Your code
} catch (error) {
  notifyBugsnag(error as Error, {
    customData: 'any metadata you want',
  });
}

// Leave a breadcrumb
leaveBreadcrumb('User clicked submit button', {
  formData: { name: 'John' },
});
```

**Server-Side**:
```typescript
import { notifyBugsnagServer, leaveBreadcrumbServer } from '@/lib/bugsnag-server';

// Notify an error
try {
  // Your code
} catch (error) {
  notifyBugsnagServer(error as Error, {
    endpoint: '/api/example',
    userId: '123',
  });
}

// Leave a breadcrumb
leaveBreadcrumbServer('Database query executed', {
  query: 'SELECT * FROM users',
});
```

### Wrap API Routes (Optional)

```typescript
import { withBugsnagServerError } from '@/lib/bugsnag-server';

export const GET = withBugsnagServerError(async (req, res) => {
  // Your API route code
  // Errors will automatically be sent to Bugsnag
});
```

## 🔧 Configuration Options

You can customize Bugsnag behavior by editing:

- `src/lib/bugsnag-client.ts` - Client configuration
- `src/lib/bugsnag-server.ts` - Server configuration

Common customizations:
- Add more metadata to errors
- Filter sensitive data
- Customize error grouping
- Set user context
- Configure release stages

## 📚 Resources

- [Bugsnag JavaScript Documentation](https://docs.bugsnag.com/platforms/javascript/)
- [Bugsnag React Documentation](https://docs.bugsnag.com/platforms/javascript/react/)
- [Bugsnag Node.js Documentation](https://docs.bugsnag.com/platforms/javascript/nodejs/)

## 🆘 Troubleshooting

### Errors Not Appearing in Bugsnag

1. **Check API key is correct**:
   - Look in browser console for: `✅ Bugsnag client initialized successfully`
   - Check server logs for: `✅ Bugsnag server initialized successfully`
   - If you see warnings about API key not configured, double-check your `.env` file

2. **Check environment variables**:
   ```bash
   # Local
   echo $NEXT_PUBLIC_BUGSNAG_API_KEY
   
   # Should show your API key, not "YOUR_BUGSNAG_API_KEY_HERE"
   ```

3. **Check Render environment variables**:
   - Go to Render dashboard → Environment
   - Verify `NEXT_PUBLIC_BUGSNAG_API_KEY` is set
   - If you just added it, wait for redeploy to complete

4. **Check Bugsnag dashboard**:
   - Make sure you're looking at the correct project
   - Check the time filter (errors might be in "All time" view)
   - Look in "Errors" section, not just "Dashboard"

### Console Warnings

If you see: `Bugsnag API key not configured. Error tracking is disabled.`
- Your API key is not set or is still the placeholder value
- Update your `.env` file with the real API key
- Restart your development server

## 🎉 Success!

Once you see errors in your Bugsnag dashboard, you're all set! Bugsnag will now automatically track and notify you of all errors in your application.

## 🔒 Security Note

- ⚠️ **Never commit your Bugsnag API key to Git**
- The `.env` file should be in `.gitignore` (already configured)
- Only add the API key through environment variables
- Use different API keys for development and production (recommended)

## 📞 Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the Bugsnag documentation
3. Check browser console and server logs for error messages
4. Verify all environment variables are set correctly

---

**Last Updated**: January 3, 2026
**Status**: Ready for API key configuration
