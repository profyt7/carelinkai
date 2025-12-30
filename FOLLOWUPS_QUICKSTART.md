# Automated Follow-ups - Quick Start Guide

## 🚀 What's Implemented

The automated follow-up system is **fully implemented** and ready to deploy!

### ✅ Features
- Automated follow-up scheduling based on inquiry rules
- Email delivery via SMTP
- SMS delivery via Twilio (optional)
- Multi-channel communication (Email, SMS, Phone Call, Task)
- Rule-based follow-up timing
- API endpoint for processing follow-ups

### 📁 Key Files Created/Modified
1. `.github/workflows/process-followups.yml` - GitHub Actions cron job
2. `render.yaml` - Updated with cron job documentation
3. `AUTOMATED_FOLLOWUPS_SETUP.txt` - Comprehensive setup guide

### 🎯 Existing Implementation (Already Built)
- `src/app/api/follow-ups/process/route.ts` - Processing endpoint
- `src/lib/followup/followup-processor.ts` - Follow-up processing logic
- `src/lib/followup/followup-scheduler.ts` - Scheduling logic
- `src/lib/followup/followup-rules.ts` - Follow-up rules engine
- `src/lib/email/inquiry-email-service.ts` - Email delivery
- `src/lib/sms/sms-service.ts` - SMS delivery

## ⚡ Quick Setup (5 Minutes)

### Step 1: Generate CRON_SECRET
```bash
openssl rand -hex 32
```
Copy the output (e.g., `a1b2c3d4e5f6...`)

### Step 2: Add to Render Environment Variables
1. Go to https://dashboard.render.com
2. Select your service (carelinkai)
3. Click "Environment" tab
4. Add variable:
   - Key: `CRON_SECRET`
   - Value: (paste the generated secret)
5. Click "Save Changes"

### Step 3: Add to GitHub Secrets
1. Go to https://github.com/profyt7/carelinkai/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CRON_SECRET`
4. Value: (same as Render)
5. Click "Add secret"

### Step 4: Configure Email (Required)
Add these to Render Environment Variables:
- `SMTP_HOST` - Your SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (587 or 465)
- `SMTP_USER` - Your email address
- `SMTP_PASS` - Your email password or app password
- `SMTP_FROM` - Sender email address

### Step 5: Deploy
```bash
git add .
git commit -m "feat: Add automated follow-ups system with GitHub Actions cron"
git push origin main
```

## 🔄 How It Works

1. **GitHub Actions** runs every 6 hours (12 AM, 6 AM, 12 PM, 6 PM UTC)
2. Calls `POST /api/follow-ups/process` with authentication
3. System processes all due follow-ups:
   - Checks database for pending follow-ups
   - Generates personalized content using AI
   - Sends emails via SMTP
   - Sends SMS via Twilio (if configured)
   - Updates follow-up status in database
4. Creates inquiry response records

## 📊 Follow-up Schedule

Default rules:
- **Urgent inquiries**: SMS after 1 hour
- **New inquiries**: Email after 24 hours
- **Second follow-up**: Email after 3 days
- **Third follow-up**: Email after 7 days
- **Tour reminders**: SMS 24 hours before
- **Post-tour**: Email 48 hours after

## 🧪 Testing

### Manual Trigger (Recommended for Testing)
1. Go to https://github.com/profyt7/carelinkai/actions
2. Click "Process Follow-ups"
3. Click "Run workflow"
4. Select "main" branch
5. Click "Run workflow"
6. View logs to see results

### API Test (Alternative)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://carelinkai.onrender.com/api/follow-ups/process
```

Expected response:
```json
{
  "success": true,
  "message": "Follow-ups processed successfully"
}
```

## 📱 Optional: SMS Setup

If you want SMS follow-ups, add Twilio credentials to Render:
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (+1XXXXXXXXXX)

**Note**: SMS is optional. The system will work with email-only if Twilio is not configured.

## 🎛️ Customization

### Change Frequency
Edit `.github/workflows/process-followups.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours (current)
  # - cron: '0 */4 * * *'  # Every 4 hours
  # - cron: '0 */12 * * *'  # Every 12 hours
  # - cron: '0 9 * * *'  # Daily at 9 AM
```

### Modify Rules
Edit `src/lib/followup/followup-rules.ts` to add/modify follow-up rules.

### Customize Emails
Edit `src/lib/email/inquiry-email-service.ts` to change email templates.

## 🔍 Monitoring

### View Execution History
https://github.com/profyt7/carelinkai/actions/workflows/process-followups.yml

### Check Render Logs
```
Dashboard > carelinkai > Logs
```
Filter by "follow-up" to see processing logs.

### Database Query
```sql
SELECT * FROM "FollowUp" 
WHERE status = 'PENDING' 
ORDER BY "scheduledFor" DESC;
```

## ⚠️ Important Notes

1. **CRON_SECRET Security**: Never commit this to git. Always use environment variables.
2. **Email Configuration**: Required for email follow-ups to work.
3. **SMS is Optional**: System works fine with email-only.
4. **GitHub Actions Limits**: Free tier includes 2000 minutes/month (more than enough).
5. **Render Starter Plan**: Doesn't support native cron jobs. Using GitHub Actions instead.

## 🆘 Troubleshooting

### Follow-ups not processing?
1. Check GitHub Actions logs
2. Verify CRON_SECRET matches in GitHub and Render
3. Check Render logs for errors
4. Ensure API endpoint returns 200

### Emails not sending?
1. Verify SMTP credentials in Render
2. Test SMTP connection
3. Check spam folders
4. Review Render logs for email errors

### Need Help?
- Read full guide: `/home/ubuntu/AUTOMATED_FOLLOWUPS_SETUP.txt`
- Check GitHub Issues: https://github.com/profyt7/carelinkai/issues

## 📈 Next Steps

After deployment:
1. Monitor first 24 hours of execution
2. Create test inquiry to verify system
3. Check email delivery
4. Review follow-up completion rate
5. Adjust rules based on response patterns

## 🎉 That's It!

You're ready to deploy! The system will automatically:
- Process follow-ups every 6 hours
- Send personalized emails to families
- Track all follow-up activities
- Update inquiry status

Deploy now and start automating your follow-ups! 🚀
