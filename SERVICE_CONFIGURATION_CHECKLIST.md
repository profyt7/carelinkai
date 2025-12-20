# Service Configuration Checklist

## Phase 1: Configure External Services

This checklist will guide you through configuring all external services needed for the AI features.

---

## 1. OpenAI API Configuration

**Purpose:** Powers AI response generation for inquiries

**What you need:**
- OpenAI API Key

**Where to get it:**
1. Go to: https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important:** Save it immediately - you won't see it again!

**Environment Variable:**
```
OPENAI_API_KEY=sk-...your-key-here...
```

**Status:** ⏳ Pending

---

## 2. SMTP Email Configuration

**Purpose:** Sends AI-generated email responses to inquiries

**What you need:**
- SMTP Host (e.g., smtp.gmail.com)
- SMTP Port (usually 587 for TLS)
- SMTP Username (your email)
- SMTP Password (app password)
- From Email Address

**Recommended Providers:**

### Option A: Gmail (Easiest)
1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. Create an app password for "Mail"
4. Copy the 16-character password

**Configuration:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Option B: SendGrid (Scalable)
1. Go to: https://sendgrid.com
2. Sign up for free account (100 emails/day)
3. Create API key
4. Use API key as password

**Configuration:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@yourdomain.com
```

### Option C: AWS SES (Production)
1. Go to: https://aws.amazon.com/ses/
2. Set up SES account
3. Verify domain/email
4. Get SMTP credentials

**Configuration:**
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=your-verified-email@yourdomain.com
```

**Status:** ⏳ Pending

---

## 3. Twilio SMS Configuration

**Purpose:** Sends SMS notifications for follow-ups

**What you need:**
- Twilio Account SID
- Twilio Auth Token
- Twilio Phone Number

**Where to get it:**
1. Go to: https://www.twilio.com/console
2. Sign in to your Twilio account
3. Find your Account SID and Auth Token on the dashboard
4. Go to Phone Numbers → Manage → Active Numbers
5. Copy your Twilio phone number (format: +1234567890)

**Environment Variables:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Status:** ⏳ Pending

---

## 4. Cron Job Configuration

**Purpose:** Runs automated follow-up processing every hour

**What you need:**
- A secret key for security (any random string)

**How to generate:**
```bash
# Option 1: Use OpenSSL
openssl rand -hex 32

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Use any random string generator
```

**Environment Variable:**
```
CRON_SECRET=your-random-secret-key-here
```

**Cron Job Setup (Render):**
1. Go to Render Dashboard
2. Create new Cron Job
3. Name: "CareLinkAI Follow-up Processor"
4. Schedule: `0 * * * *` (every hour)
5. Command: `curl -X POST https://carelinkai.onrender.com/api/follow-ups/process -H "Authorization: Bearer $CRON_SECRET"`

**Status:** ⏳ Pending

---

## 5. Configuration Steps

### Step 1: Update Local .env File
```bash
# Copy .env.example to .env if not exists
cp .env.example .env

# Edit .env and add all credentials
nano .env
```

### Step 2: Update Render Environment Variables
1. Go to: https://dashboard.render.com
2. Select your CareLinkAI service
3. Go to "Environment" tab
4. Add/update each variable
5. Click "Save Changes"
6. Render will automatically redeploy

### Step 3: Test Configuration
```bash
# Test OpenAI
curl -X POST https://carelinkai.onrender.com/api/test/openai

# Test SMTP
curl -X POST https://carelinkai.onrender.com/api/test/smtp

# Test Twilio
curl -X POST https://carelinkai.onrender.com/api/test/twilio

# Test Cron
curl -X POST https://carelinkai.onrender.com/api/follow-ups/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 6. Verification Checklist

After configuration, verify each service:

- [ ] OpenAI API responds successfully
- [ ] Test email sends successfully
- [ ] Test SMS sends successfully
- [ ] Cron job runs successfully
- [ ] AI response generation works
- [ ] Email sending works in production
- [ ] SMS notifications work
- [ ] Follow-ups process automatically

---

## 7. Troubleshooting

### OpenAI Issues
- Check API key is valid
- Verify billing is set up
- Check rate limits

### SMTP Issues
- Verify app password (not regular password)
- Check firewall/port 587 is open
- Try different SMTP provider

### Twilio Issues
- Verify phone number is active
- Check account balance
- Verify phone number format (+1234567890)

### Cron Issues
- Verify CRON_SECRET matches
- Check cron job schedule
- Review logs in Render

---

## Next Steps

Once all services are configured:
1. Test each feature end-to-end
2. Create test inquiry
3. Generate AI response
4. Send test email
5. Schedule test follow-up
6. Verify SMS notification
7. Document any issues

