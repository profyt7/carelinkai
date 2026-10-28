# CareLink AI Quick Start Guide
## Your First 7 Days to Launch Success

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Reading Time:** 10 minutes  
**Purpose:** Cut through the noise. Here's exactly what to do first.

---

## Welcome! Start Here 👋

You have a comprehensive 150+ page master launch plan. That's great for reference, but **overwhelming for Day 1**.

This guide answers: **"What do I do RIGHT NOW?"**

**Your Goal for Week 1:** Set up automation foundations so you can focus on high-value work (sales, product, content) instead of repetitive tasks.

---

## The Only 3 Things You Need to Do First

### 1. Set Up Email Automation (4 hours)
### 2. Build Your CRM (2 hours)
### 3. Start Outreach (2 hours)

**Total Time:** 8 hours (1 day of focused work)

After these 3 things, you'll have:
- ✅ Automated email sequences (onboarding, nurture, conversion)
- ✅ Lead tracking system (no more lost prospects)
- ✅ First 5-10 operator prospects contacted (momentum!)

Let's dive in.

---

## Thing 1: Set Up Email Automation (4 hours)

**Why This First:** Email is your primary communication channel. Automate it once, benefit forever.

### Step 1: Create Mailchimp Account (10 min)

1. Go to [mailchimp.com](https://mailchimp.com)
2. Click "Sign Up Free"
3. Enter email, username, password
4. Verify email
5. Choose "Free" plan (500 contacts, 1,000 monthly sends)

✅ **Done? Great. Next step.**

---

### Step 2: Create Audiences (20 min)

1. Dashboard → Audience → Create Audience
2. Create **"Operators"** audience
   - Name: "Operators - Senior Care Facilities"
   - Add custom fields: First Name, Last Name, Company Name, Phone, Location, Status
3. Create **"Families"** audience
   - Name: "Families - Looking for Care"
   - Add custom fields: First Name, Last Name, Phone, Location, Care Type Needed
4. Create **"Professionals"** audience
   - Name: "Professionals - Discharge Planners & Partners"
   - Add custom fields: First Name, Last Name, Organization, Title, Phone

✅ **Done? You now have 3 organized contact lists.**

---

### Step 3: Create 3 Essential Email Templates (90 min)

**Template 1: Operator Welcome Email**

1. Navigate to Campaigns → Email templates → Basic template
2. Subject: `Welcome to CareLink AI, [First Name]! 🎉`
3. Body:
```
Hi [First Name],

Welcome to CareLink AI! We're thrilled to have [Company Name] on board.

Here's what happens next:
✅ Step 1: Complete your facility profile (5 minutes) [Link]
✅ Step 2: Add photos and amenities
✅ Step 3: Start receiving qualified leads

Need help? Reply to this email or book a quick call: [Calendar Link]

Best,
[Your Name]
Founder, CareLink AI
```
4. Save as "Operator Welcome"

---

**Template 2: Family Welcome Email**

1. Create new template
2. Subject: `Welcome to CareLink AI! Let's find the perfect care home`
3. Body:
```
Hi [First Name],

Thank you for trusting CareLink AI to help find care for your loved one.

Here's how to get started:
🔍 Search by location, care type, and budget [Start Searching]
💬 Message facilities directly
⭐ Read reviews from other families
📅 Schedule tours

We're here to help every step of the way.

Questions? Reply to this email anytime.

Best,
[Your Name]
CareLink AI
```
4. Save as "Family Welcome"

---

**Template 3: Beta Invitation**

1. Create new template
2. Subject: `You're invited! CareLink AI Beta Access`
3. Body:
```
Hi [First Name],

Great news! You've been accepted to the CareLink AI beta program.

As a Founding Member, you get:
✨ Free access for 2 months
✨ Priority support
✨ Lifetime 20% discount when we launch
✨ Your feedback shapes our product

[Activate Beta Access Button]

Let's make this great together!

[Your Name]
Founder, CareLink AI
```
4. Save as "Beta Invitation"

✅ **Done? You have 3 core email templates ready.**

---

### Step 4: Build Automation Flow (60 min)

**Create Operator Onboarding Sequence:**

1. Navigate to Automations → Customer Journeys → Create Journey
2. Choose "Starting point" → "Joins audience" (select Operators audience)
3. Add delay: 0 minutes (send immediately)
4. Add email: "Operator Welcome" (Template 1)
5. Add delay: 2 days
6. Add email: "Setup Guide" (create simple email: "Here are 3 tips to optimize your profile...")
7. Add delay: 5 days
8. Add email: "Are you getting leads?" (check-in email)
9. Activate journey

**Test It:**
- Add yourself to Operators audience (use test email)
- Verify you receive welcome email immediately
- Wait or manually trigger next emails (verify automation works)

✅ **Done? Your first automation is live!**

---

### Step 5: Integration with Website (30 min)

**Option A: Quick & Dirty (Embedded Form)**
1. Audience → Signup forms → Embedded forms
2. Copy code snippet
3. Paste into your website (wherever you have sign-up forms)

**Option B: Cleaner (API Integration)**
- Follow Mailchimp API docs (takes longer, but more control)
- Recommended if you're technical

**Test:**
- Fill out sign-up form on your website
- Check Mailchimp → Verify subscriber appears
- Check email → Verify welcome email sent

✅ **Done? Email automation complete! (4 hours total)**

**Time Saved Ongoing:** 10-15 hours/week

---

## Thing 2: Build Your CRM (2 hours)

**Why This:** Track every prospect, never lose a lead.

### Step 1: Create Google Sheet (20 min)

1. Create new Google Sheet: "CareLink AI CRM"
2. Create 3 sheets (tabs at bottom):

**Sheet 1: Operators**

| First Name | Last Name | Email | Phone | Facility Name | Location | Beds | Status | Lead Source | Notes | Last Contact | Next Step |
|------------|-----------|-------|-------|---------------|----------|------|--------|-------------|-------|--------------|-----------|

**Sheet 2: Families**

| Name | Email | Phone | Care Recipient | Location | Care Type | Budget | Timeline | Status | Operator Matched | Notes | Last Contact |
|------|-------|-------|----------------|----------|-----------|--------|----------|--------|------------------|-------|--------------|

**Sheet 3: Discharge Planners**

| Name | Email | Hospital | Title | Placements/Month | Status | Notes | Last Contact | Next Step |
|------|-------|----------|-------|------------------|--------|-------|--------------|-----------|

3. Format as table:
   - Bold headers (first row)
   - Freeze first row (View → Freeze → 1 row)
   - Apply alternating colors (Format → Alternating colors)

✅ **Done? You have a simple CRM.**

---

### Step 2: Create Lead Capture Forms (40 min)

1. Go to [tally.so](https://tally.so) → Sign up (free, unlimited forms)
2. Create 3 forms:

**Form 1: Operator Beta Waitlist**
- Fields:
  - First Name (required)
  - Last Name (required)
  - Email (required, validated)
  - Phone Number (optional)
  - Facility Name (required)
  - Facility Location (City, State) (required)
  - Number of Beds (dropdown: 1-5, 6-15, 16-30, 31-50, 51+)
  - Current biggest challenge (text area)
- Settings:
  - Redirect after submit → "Thank you" page
  - Send confirmation email: "Thanks! We'll be in touch within 48 hours."

**Form 2: Family Inquiry**
- Fields:
  - Your Name (required)
  - Email (required)
  - Phone (optional)
  - Who are you looking for care for? (dropdown: Parent, Spouse, Self, Other)
  - Location (City, State) (required)
  - Care Type Needed (checkboxes: Independent Living, Assisted Living, Memory Care, Skilled Nursing)
  - Budget Range (dropdown: <$3K/mo, $3-5K, $5-7K, $7-10K, $10K+)
  - Move-in Timeline (dropdown: Immediate, 1-3 months, 3-6 months, 6+ months, Just exploring)

**Form 3: Partnership Inquiry**
- Fields:
  - Name (required)
  - Email (required)
  - Hospital/Organization (required)
  - Title/Role (required)
  - How many patients do you place per month? (dropdown)

3. Copy form links or embed codes

✅ **Done? You have 3 lead capture forms.**

---

### Step 3: Automate Form → CRM (60 min)

**Set Up Make.com Automation:**

1. Go to [make.com](https://make.com) → Sign up (free tier: 1,000 operations/month)
2. Click "Create a scenario"

**Automation: Operator Lead Flow**

1. **Module 1 (Trigger): Tally "Watch Responses"**
   - Connect Tally account
   - Select form: "Operator Beta Waitlist"
   - Polling interval: Every 15 minutes

2. **Module 2 (Action): Google Sheets "Add a Row"**
   - Connect Google account
   - Select spreadsheet: "CareLink AI CRM"
   - Select sheet: "Operators"
   - Map fields:
     - First Name → Tally "First Name"
     - Last Name → Tally "Last Name"
     - Email → Tally "Email"
     - (map all fields from form)
     - Status → "New Lead" (manual entry)
     - Lead Source → "Website Form" (manual entry)
     - Last Contact → formatDate(now) (use Make.com function)

3. **Module 3 (Action): Mailchimp "Add/Update Subscriber"**
   - Connect Mailchimp
   - Select audience: "Operators"
   - Email → Tally "Email"
   - Merge fields:
     - FNAME → First Name
     - LNAME → Last Name
     - COMPANY → Facility Name
   - Tags: "beta_waitlist"
   - Status: "Subscribed" (triggers welcome email automatically)

4. **Module 4 (Action): Gmail "Send an Email"** (optional notification to you)
   - Connect Gmail
   - To: your email
   - Subject: "🎉 New operator lead: [Facility Name]"
   - Body: "Name: [First Name Last Name] | Email: [Email] | Facility: [Facility Name]"

5. **Test the scenario:**
   - Fill out Tally form (use test data)
   - Check: Did row appear in Google Sheets? ✅
   - Check: Did subscriber add to Mailchimp? ✅
   - Check: Did you receive email notification? ✅

6. **Activate scenario** (turn on switch)

**Repeat for Family and Discharge Planner forms** (20 min each)

✅ **Done? Your CRM is automated! (2 hours total)**

**Time Saved Ongoing:** 10 hours/week

---

## Thing 3: Start Outreach (2 hours)

**Why This:** You need beta users. Start recruiting NOW.

### Step 1: Build Operator Prospect List (60 min)

**Goal:** 50-100 prospects (you'll reach out to them this week)

**Sources:**
1. **Google Maps:**
   - Search "assisted living [your city]"
   - Find 20-30 facilities
   - Note: Facility name, address, phone, website

2. **Google Search:**
   - Search "memory care [your city]"
   - Find 10-20 more facilities

3. **State Licensing Databases:**
   - Most states have public lists of licensed facilities
   - Example: California: [CDSS Community Care Licensing](https://www.ccld.dss.ca.gov/carefacilitysearch/)
   - Download list, filter by your city

**Collect:**
- Facility name
- Owner/Director name (check website "About" or "Staff" page, or LinkedIn)
- Email (check website "Contact" page, or guess format: firstname@facilityname.com)
- Phone
- Website
- LinkedIn profile (if available)

**Add to CRM:** Paste into Google Sheets "Operators" tab

**Target:** 50-100 prospects by end of Day 1

✅ **Done? You have your outreach list.**

---

### Step 2: Write Outreach Emails (30 min)

**Save these templates in Gmail (for easy reuse):**

**Email 1: Cold Outreach**

```
Subject: Quick question about [Facility Name]

Hi [First Name],

I came across [Facility Name] while researching assisted living facilities in [City]. 
[Specific compliment about their facility from website - e.g., "I love your focus on 
memory care and the beautiful garden photos on your website."]

I'm building CareLink AI to help operators like you get more qualified leads without 
paying $5,000+ per placement to traditional referral agencies.

Would you be open to a 15-minute call to see if it's a fit?

[Calendar Link]

Best,
[Your Name]
Founder, CareLink AI
[Phone]
```

**Email 2: Follow-Up (3 days later)**

```
Subject: Re: Quick question about [Facility Name]

Hi [First Name],

Following up on my note below. I know you're busy, so I'll be brief:

Our beta operators are seeing 10-15 qualified inquiries/month for $49-$149/month 
(vs $5,000+ per placement with traditional agencies).

Would you be interested in learning more?

[Calendar Link]

Thanks,
[Your Name]
```

**Email 3: Break-Up (3 days later)**

```
Subject: One last thing...

Hi [First Name],

I'll stop reaching out after this! But I wanted to ask:

Is lead generation something you're actively working on? Or is it just not a 
priority right now?

If it's the latter, no problem—I'll remove you from my list. If it's the 
former, I'd love to share how we're helping facilities in [City] fill vacancies.

Either way, best of luck with [Facility Name]!

[Your Name]
```

✅ **Done? You have your outreach templates.**

---

### Step 3: Send First 10 Emails TODAY (30 min)

**Your Mission:**
- Open your CRM
- Pick top 10 prospects (facilities you genuinely think would benefit)
- Personalize Email 1 for each (change [Facility Name], [First Name], add specific compliment)
- Send manually (Gmail) - Takes 2-3 minutes per email
- Add note in CRM: "Status = Outreach Sent, Last Contact = [Today's Date], Next Step = Follow up in 3 days"

**Why Manual First 10?** 
- Quality over quantity (Day 1 is about starting, not scaling)
- You'll refine your pitch based on responses
- It's more personal (higher response rate)

✅ **Done? You've started momentum! (2 hours total)**

**Expected Results:**
- 5-10% response rate (1-2 responses from 10 emails)
- 1 demo call booked (if lucky)
- If no responses in 48 hours, that's normal - keep going!

---

## Your First Week at a Glance

### Day 1 (8 hours): Foundation
- ✅ Email automation set up (4 hours)
- ✅ CRM built (2 hours)
- ✅ First 10 outreach emails sent (2 hours)

### Day 2 (6 hours): Content & Outreach
- **Morning (3 hours):** Send 10 more outreach emails (personalize, send)
- **Afternoon (3 hours):** Write first blog post (use ChatGPT to draft, you edit)
  - Topic: "How to Choose the Right Assisted Living Facility (2026 Guide)"
  - Length: 1,200-1,500 words
  - Optimize for SEO: Include keywords like "assisted living", "how to choose", "[your city]"
  - Publish to your blog

### Day 3 (6 hours): Social Media & Outreach
- **Morning (2 hours):** Set up Buffer account, connect LinkedIn, Twitter
- **Morning (1 hour):** Create 10 social posts (use ChatGPT, save in Buffer)
- **Afternoon (3 hours):** Send 10 more outreach emails, follow up on Day 1 emails (if 3 days passed)

### Day 4 (6 hours): Product Refinement & Outreach
- **Morning (3 hours):** Test platform end-to-end (Family flow, Operator flow)
- **Morning (1 hour):** Fix any bugs found
- **Afternoon (2 hours):** Send 10 more outreach emails

### Day 5 (6 hours): Demos & Follow-Ups
- **All Day:** Book and conduct demo calls (if any responses)
- **OR:** Send 10 more outreach emails, follow up on Day 2-3 emails
- **Evening (1 hour):** Write 2nd blog post (draft, schedule to publish next week)

### Day 6-7 (Weekend): OFF
- **No work** (burnout prevention)
- **Optional:** 1-2 hours Sunday evening to prep for Week 2

---

## Week 1 Goals (What Success Looks Like)

**By End of Week 1:**
- ✅ 50 outreach emails sent (10/day × 5 days)
- ✅ 2-5 responses (5-10% response rate)
- ✅ 1-2 demo calls booked
- ✅ 1 blog post published
- ✅ 10 social posts scheduled
- ✅ Email automation live (tested and working)
- ✅ CRM set up and being used daily

**If You Hit These Goals:** You're on track for beta launch Week 5! 🎉

**If You Miss Goals:** That's okay! Week 1 is about learning. Adjust and keep going.

---

## Common Mistakes to Avoid

### Mistake 1: Perfectionism
**❌ "I need to perfect my website before reaching out to anyone."**

**✅ Better:** Ship imperfect, iterate based on real feedback. Your first 10 prospects will tell you what needs fixing.

---

### Mistake 2: Trying to Do Everything
**❌ "I'll set up 20 automation flows, write 50 blog posts, and reach out to 500 prospects Week 1."**

**✅ Better:** Do 3 things well (email automation, CRM, outreach). Everything else can wait.

---

### Mistake 3: Not Personalizing Outreach
**❌ Sending generic "Dear Sir/Madam" emails.**

**✅ Better:** Spend 2 minutes per email. Mention their facility name, specific detail from website. 10 personalized emails > 100 generic ones.

---

### Mistake 4: Waiting for Responses
**❌ "I sent 10 emails yesterday, got no responses, so I'm stopping."**

**✅ Better:** Outreach is a numbers game. 5-10% response rate is normal. Send 50 emails, you'll get 3-5 responses. Keep going.

---

### Mistake 5: Not Tracking
**❌ "I reached out to some people, not sure who or when."**

**✅ Better:** Update CRM after every action. Status, last contact, next step. 15 seconds per update = Never lose a prospect.

---

## What to Do After Week 1

**Week 2-4: Continue Building Momentum**
- Keep sending 10 outreach emails/day (build to 50+ prospects contacted)
- Publish 1 blog post/week (4 posts by end of Week 4)
- Post on social media 3-5x/week (Buffer makes this easy)
- Conduct demo calls (convert prospects to beta sign-ups)
- Product improvements (based on demo feedback)

**Target by End of Week 4:**
- 150-200 prospects contacted
- 10-20 responses
- 5-10 demo calls conducted
- 3-10 beta sign-ups secured

**Week 5: BETA LAUNCH! 🚀**
- Onboard your first beta users
- Start collecting feedback
- Iterate weekly

---

## Resources (Bookmark These)

### Tools
- [Mailchimp](https://mailchimp.com) - Email automation
- [Tally](https://tally.so) - Forms
- [Make.com](https://make.com) - Automation
- [Buffer](https://buffer.com) - Social scheduling
- [Calendly](https://calendly.com) - Meeting scheduling
- [ChatGPT](https://chat.openai.com) - Content generation

### Master Launch Plan
- `CARELINK_AI_FINAL_MASTER_LAUNCH_PLAN.md` - Full 52-week plan
- `LAUNCH_READINESS_CHECKLIST.md` - Pre-launch checklist
- `AUTOMATION_SETUP_GUIDE_SOLO_FOUNDER.md` - Detailed automation setup

### Support
- **Questions?** Re-read relevant sections of master plan
- **Stuck?** Join founder communities: [Indie Hackers](https://indiehackers.com), r/startups on Reddit
- **Need accountability?** Find an accountability partner (fellow founder, weekly check-ins)

---

## Your Next Action (Right Now)

**Close this document.**

**Open Mailchimp and start Step 1 of Thing 1.**

You have 8 hours of focused work ahead. No distractions. No reading more docs.

**Just execute.**

You've got this! 💪

---

**Document Status:** Complete  
**Last Updated:** February 2, 2026  
**Next Document:** Jump back into `CARELINK_AI_FINAL_MASTER_LAUNCH_PLAN.md` for deep dives on any topic
