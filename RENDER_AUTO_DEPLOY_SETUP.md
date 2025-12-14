# 🔧 Render Auto-Deploy Configuration Guide

**Purpose:** Ensure future GitHub pushes automatically trigger Render deployments

---

## 🎯 Why This Matters

Currently, you have to manually trigger deployments. With auto-deploy:
- ✅ Push to GitHub → Automatic deployment
- ✅ No manual intervention needed
- ✅ Faster deployment workflow

---

## 📋 Step-by-Step Setup

### 1. Access Render Dashboard
1. Go to https://dashboard.render.com
2. Log in with your account
3. Click on your **CareLinkAI** service

### 2. Check Auto-Deploy Setting

**Path:** Dashboard → CareLinkAI → Settings → Build & Deploy

**Verify these settings:**
```
✅ Auto-Deploy: Yes
✅ Branch: main
```

**If Auto-Deploy is "No":**
1. Click the toggle to enable it
2. Save changes
3. Done! ✅

### 3. Verify GitHub Connection

**Path:** Dashboard → CareLinkAI → Settings → Connected Accounts

**Check:**
```
✅ GitHub: Connected
✅ Repository: profyt7/carelinkai
✅ Access: Read & Write
```

**If Not Connected:**
1. Click "Connect GitHub"
2. Authorize Render to access your repositories
3. Select `profyt7/carelinkai`
4. Confirm connection

### 4. Verify GitHub Webhook

**Path:** GitHub → profyt7/carelinkai → Settings → Webhooks

**What to Look For:**
```
✅ Webhook URL: https://api.render.com/deploy/...
✅ Status: ✓ (green checkmark)
✅ Recent Deliveries: 200 OK responses
```

**If Webhook is Missing or Broken:**
1. Go back to Render Dashboard
2. Disconnect the GitHub repository:
   - Settings → Repository → Disconnect
3. Reconnect the repository:
   - Settings → Repository → Connect GitHub
   - Select `profyt7/carelinkai`
   - This will recreate the webhook automatically

### 5. Test Auto-Deploy

**After configuration, test with a simple commit:**

```bash
cd /home/ubuntu/carelinkai-project
git commit --allow-empty -m "test: Verify auto-deploy works"
git push origin main
```

**Then check Render:**
- Dashboard should show "Deploying..." automatically
- No manual trigger needed
- Deployment starts within 30 seconds

---

## 🔍 Troubleshooting Auto-Deploy

### Issue: Auto-Deploy Still Not Working

**Check 1: Branch Name**
- Ensure your default branch is `main`
- Render setting should match your branch name

**Check 2: Webhook Deliveries**
1. Go to GitHub → Settings → Webhooks
2. Click on the Render webhook
3. Check "Recent Deliveries" tab
4. Look for failed deliveries (red X)

**Common webhook errors:**
- **401 Unauthorized:** Reconnect GitHub in Render
- **404 Not Found:** Webhook URL is wrong, recreate
- **500 Server Error:** Contact Render support

**Check 3: Repository Permissions**
1. GitHub → Settings → Integrations → Render
2. Verify "Repository access" includes `profyt7/carelinkai`
3. If not listed, grant access

**Check 4: Render Service Status**
- Visit: https://status.render.com
- Check if there are any incidents affecting webhooks

---

## 🎯 Deployment Workflow (After Setup)

### Ideal Workflow:
```
1. Make code changes locally
   ↓
2. git commit -m "fix: Description"
   ↓
3. git push origin main
   ↓
4. Render automatically detects push (within 30 sec)
   ↓
5. Deployment starts automatically
   ↓
6. Monitor logs in Render Dashboard
   ↓
7. Deployment completes → "Live" status
```

**Total Time:** 5-10 minutes (automated)

---

## 🚨 Important Notes

### Build Command
Ensure this is set in Render settings:
```
npm install
```

### Start Command
Ensure this is set:
```
npm run start
```

This runs migrations and starts the server:
```javascript
// package.json
"start": "npm run migrate:deploy && next start"
```

### Postinstall Script
Already configured in package.json:
```javascript
"postinstall": "prisma generate"
```

This ensures Prisma Client is regenerated on every deploy ✅

---

## ✅ Configuration Checklist

Before leaving this guide, verify:

- [ ] Render auto-deploy is **enabled**
- [ ] GitHub account is **connected** in Render
- [ ] Webhook exists in GitHub repo settings
- [ ] Webhook shows **recent successful deliveries**
- [ ] Test commit **triggers automatic deployment**
- [ ] Build command is `npm install`
- [ ] Start command is `npm run start`
- [ ] Postinstall script runs `prisma generate`

---

## 📊 Configuration Summary

| Setting | Value | Status |
|---------|-------|--------|
| Auto-Deploy | Yes | ⏳ Verify |
| Branch | main | ✅ |
| GitHub Connected | Yes | ⏳ Verify |
| Webhook Active | Yes | ⏳ Verify |
| Build Command | npm install | ✅ |
| Start Command | npm run start | ✅ |
| Postinstall | prisma generate | ✅ |

---

## 🎯 Next Steps

1. **Now:** Complete manual deployment
2. **After deployment:** Configure auto-deploy (this guide)
3. **Test:** Push a test commit to verify auto-deploy
4. **Future:** Enjoy automatic deployments! 🎉

---

## 📞 Resources

- **Render Auto-Deploy Docs:** https://render.com/docs/deploys
- **GitHub Webhooks:** https://docs.github.com/en/webhooks
- **Render Support:** support@render.com

---

**Last Updated:** December 14, 2025  
**Status:** Configuration guide ready  
**Next Action:** Configure after manual deployment completes

