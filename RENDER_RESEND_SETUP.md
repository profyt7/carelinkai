# Quick Setup: RESEND_API_KEY on Render

**⚠️ IMPORTANT:** The code has been deployed to GitHub and will auto-deploy to Render. However, **emails will NOT work until you add the RESEND_API_KEY environment variable on Render**.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Your Resend API Key

1. **Visit:** https://resend.com/
2. **Log in or Sign up** with `profyt7@gmail.com`
3. **Go to API Keys:** https://resend.com/api-keys
4. **Click "Create API Key"**
   - Name: `CareLinkAI Production`
   - Permissions: Full Access
5. **Copy the API key** (starts with `re_`)
   - ⚠️ Save it somewhere safe - you can't see it again!

### Step 2: Add to Render

1. **Go to Render Dashboard:** https://dashboard.render.com/
2. **Select your service:** `carelinkai`
3. **Click "Environment"** in left sidebar
4. **Click "Add Environment Variable"**
   - **Key:** `RESEND_API_KEY`
   - **Value:** Paste your API key (from Step 1)
5. **Click "Save Changes"**
6. **Render will auto-deploy** (takes ~5 minutes)

---

## ✅ Test It Works

After deployment completes:

1. **Go to:** https://getcarelinkai.com/auth/register
2. **Register a test account**
3. **Check your email** (look in spam folder too)
4. **Verification email should arrive** with:
   - Professional CareLinkAI branding
   - Blue "Verify Email Address" button
   - 24-hour expiry notice

---

## 🎨 Optional: Use Custom Domain

**Current:** Emails sent from `profyt7@gmail.com`  
**Goal:** Emails sent from `noreply@getcarelinkai.com`

### Steps:

1. **In Resend Dashboard:**
   - Go to: https://resend.com/domains
   - Click "Add Domain"
   - Enter: `getcarelinkai.com`

2. **Add DNS Records:**
   - Copy TXT, MX, and CNAME records from Resend
   - Add them to your domain's DNS settings
   - Wait for verification (up to 48 hours)

3. **Update Code:**
   ```bash
   # Edit src/lib/email.ts
   # Change line:
   const FROM_EMAIL = 'profyt7@gmail.com';
   # To:
   const FROM_EMAIL = 'noreply@getcarelinkai.com';
   ```

4. **Commit and Push:**
   ```bash
   git add src/lib/email.ts
   git commit -m "feat: Use custom domain for emails"
   git push origin main
   ```

---

## 📊 Monitor Email Delivery

**Resend Dashboard:** https://resend.com/emails

You can:
- View all sent emails
- Check delivery status
- See bounce/spam rates
- Debug any issues

---

## 🆘 Troubleshooting

### Emails Not Sending?

**Check:**
1. ✅ RESEND_API_KEY is set on Render
2. ✅ API key is correct (starts with `re_`)
3. ✅ Render deployment succeeded
4. ✅ Check Render logs for errors

**View Logs:**
```bash
# On Render Dashboard
Services → carelinkai → Logs
```

### Emails in Spam?

**Until domain is verified:**
- Emails may go to spam
- This is normal when using gmail.com address
- Domain verification will fix this

**After domain verification:**
- SPF, DKIM, DMARC records improve deliverability
- Emails will have better inbox placement

---

## 📞 Need Help?

**Resend Support:** https://resend.com/support  
**GitHub Issues:** https://github.com/profyt7/carelinkai/issues  
**Email:** profyt7@gmail.com

---

**Last Updated:** January 6, 2026  
**Status:** Ready for Production ✅
