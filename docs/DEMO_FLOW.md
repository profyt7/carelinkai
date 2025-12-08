# CareLinkAI Demo Walkthrough Script

## Overview

This document provides a **5-10 minute scripted demo** covering the key workflows of CareLinkAI for live walkthroughs with ALFs, agencies, and investors.

**Demo Personas:** All use password `DemoUser123!`
- demo.family@carelinkai.test
- demo.operator@carelinkai.test
- demo.aide@carelinkai.test
- demo.provider@carelinkai.test
- demo.admin@carelinkai.test

**Demo Portal:** Access all persona cards at `/demo` for quick switching between accounts.

---

## 🎯 Demo Flow (10 minutes)

### Part 1: Family Flow (3 minutes)

**Goal:** Show how families find care and submit inquiries

#### Step 1: Login as Family Member
1. Navigate to `/auth/login` (or use `/demo` portal)
2. Login with:
   - Email: demo.family@carelinkai.test
   - Password: DemoUser123!
3. **Say:** "This is Jennifer Martinez. She's caring for her 82-year-old mother with early-stage Alzheimer's."

#### Step 2: View Care Context
1. Navigate to `/settings/family`
2. **Say:** "Jennifer has filled out her care context - her mother's age, diagnosis, mobility level, and care needs."
3. Point out key fields:
   - Recipient age: 82
   - Diagnosis: Early-stage Alzheimer's
   - Mobility: Needs Assistance
   - Care notes: Detailed care requirements
4. **Say:** "This information helps us match her with the right caregivers and agencies."

#### Step 3: Browse Marketplace
1. Navigate to `/marketplace/aides`
2. **Say:** "Jennifer can browse individual caregivers. Look at Sarah Thompson here - 7 years of Alzheimer's care experience, $32/hour."
3. Scroll through a few caregiver cards
4. Click on a caregiver profile to show detail page
5. **Say:** "She can see their full bio, credentials, availability, and reviews."
6. Click "Request Care" button
7. **Say:** "With one click, Jennifer can submit an inquiry to this caregiver."

#### Step 4: Browse Providers
1. Navigate to `/marketplace/providers`
2. **Say:** "Or she can browse home care agencies like Golden Years Home Care."
3. Click on a provider to show detail page
4. Point out:
   - Services offered
   - Coverage area
   - Years in business
   - Verification badge
5. **Say:** "Verified providers have been vetted by our admin team."

#### Step 5: Check Messages
1. Navigate to `/messages`
2. **Say:** "Jennifer can see all her conversations in one place - with caregivers, agencies, and our operators who help coordinate care."
3. Click on a conversation to show message thread
4. **Say:** "Real-time messaging keeps everyone on the same page."

**Transition:** "Now let's see how our operators manage these inquiries..."

---

### Part 2: Operator Flow (2 minutes)

**Goal:** Show lead management and care coordination

#### Step 1: Logout and Login as Operator
1. Logout from family account
2. Login with:
   - Email: demo.operator@carelinkai.test
   - Password: DemoUser123!
3. **Say:** "This is Michael Chen, one of our operators who coordinates care matches."

#### Step 2: View Lead Dashboard
1. Navigate to `/operator/leads`
2. **Say:** "Michael sees all family inquiries here - leads from families to caregivers and agencies."
3. Point out:
   - Lead status badges (NEW, IN_REVIEW, CONTACTED)
   - Target type (AIDE vs PROVIDER)
   - Assignment column
4. **Say:** "Leads can be filtered by status, type, and assigned operator."

#### Step 3: Open a Lead Detail
1. Click on a lead (preferably one with status IN_REVIEW)
2. Navigate to `/operator/leads/[id]`
3. **Say:** "Here's a detailed view of Jennifer's inquiry to Golden Years Home Care."
4. Scroll through sections:
   - **Family Information:** Contact details, relationship to recipient
   - **Provider Information:** Business details and contact
   - **Inquiry Details:** Start date, hours per week, location, message
   - **Care Context:** Mother's age, diagnosis, mobility, notes
5. **Say:** "All the information an operator needs to facilitate the match."

#### Step 4: Update Lead Status
1. Change status dropdown from "IN_REVIEW" to "CONTACTED"
2. Add operator notes: "Spoke with Robert at Golden Years. They have availability and are scheduling an intro call with Jennifer for next week."
3. Click "Save Changes"
4. **Say:** "Michael updates the status and adds notes for the team. This keeps everyone informed."

#### Step 5: Open Conversation
1. Click "Open Conversation" button
2. **Say:** "Michael can message Jennifer directly to coordinate the introduction."

**Transition:** "Let's see what this looks like from the caregiver's side..."

---

### Part 3: Aide/Caregiver Flow (2 minutes)

**Goal:** Show caregiver profile, credentials, and messaging

#### Step 1: Logout and Login as Aide
1. Logout from operator account
2. Login with:
   - Email: demo.aide@carelinkai.test
   - Password: DemoUser123!
3. **Say:** "This is Sarah Thompson, an experienced Alzheimer's care specialist."

#### Step 2: View Caregiver Profile
1. Navigate to `/settings/aide`
2. **Say:** "Sarah's profile highlights her 7 years of experience, $32 hourly rate, and specialties."
3. Point out:
   - Bio section
   - Skills and certifications
   - Availability calendar
   - Background check status: CLEAR
4. **Say:** "A complete profile helps families make informed decisions."

#### Step 3: View Credentials
1. Navigate to `/settings/credentials`
2. **Say:** "Caregivers can upload and manage their credentials - CPR, CNA license, TB test results."
3. Point out verification status
4. **Say:** "Our admin team verifies these documents to build trust."

#### Step 4: Check Messages
1. Navigate to `/messages`
2. **Say:** "Sarah sees inquiries from families and operators. She can respond directly."
3. Open a message thread with demo.family
4. **Say:** "Here's Jennifer's inquiry. Sarah can reply to discuss availability and rates."

**Transition:** "Agencies work similarly. Let's quickly look at the provider view..."

---

### Part 4: Provider Flow (1.5 minutes)

**Goal:** Show provider profile, services, and inquiries

#### Step 1: Logout and Login as Provider
1. Logout from aide account
2. Login with:
   - Email: demo.provider@carelinkai.test
   - Password: DemoUser123!
3. **Say:** "This is Golden Years Home Care, a 15-year-old agency serving the Bay Area."

#### Step 2: View Provider Profile
1. Navigate to `/settings/provider`
2. **Say:** "Providers can showcase their business - services, coverage area, insurance info."
3. Point out:
   - Business name and contact details
   - Service types (Personal Care, Dementia Care, etc.)
   - Coverage area (San Francisco, Oakland, San Jose)
   - Years in business: 15
   - Verified badge
4. **Say:** "Verified providers have uploaded their licenses and insurance documents."

#### Step 3: View Credentials
1. Navigate to `/settings/credentials`
2. **Say:** "Just like caregivers, providers upload their credentials - business licenses, liability insurance, etc."

#### Step 4: Check Messages
1. Navigate to `/messages`
2. **Say:** "Golden Years receives inquiries from families and can respond to schedule consultations."

**Transition:** "Finally, let's see the admin tools that keep our marketplace trustworthy..."

---

### Part 5: Admin Flow (1.5 minutes)

**Goal:** Show provider/aide verification and management

#### Step 1: Logout and Login as Admin
1. Logout from provider account
2. Login with:
   - Email: demo.admin@carelinkai.test
   - Password: DemoUser123!
3. **Say:** "This is our admin view for platform management."

#### Step 2: View Provider Management
1. Navigate to `/admin/providers`
2. **Say:** "Admins can see all providers and their verification status."
3. Point out:
   - Provider cards with business names
   - Verification badges
   - Service types
   - Years in business
4. **Say:** "We can filter by verification status, service types, and location."

#### Step 3: Open a Provider Detail
1. Click on a provider (preferably one with verified status)
2. **Say:** "Here's the full provider profile with credentials."
3. Point out:
   - Credentials section with verification status
   - Contact information
   - Coverage area
4. **Say:** "Admins can review uploaded documents and toggle verification status."

#### Step 4: View Caregiver Management (if time permits)
1. Navigate to `/admin/aides`
2. **Say:** "We have similar tools for managing individual caregivers."
3. Point out caregiver cards with background check status
4. **Say:** "This ensures only qualified, vetted caregivers appear in our marketplace."

#### Step 5: View Platform Metrics (Enhanced Dashboard)
1. Navigate to `/admin/metrics`
2. **Say:** "Our enhanced metrics dashboard gives us real-time visibility into platform health and growth."
3. **Point out the "Last Updated" timestamp** (top-right corner):
   - "This shows when the data was last generated - we're looking at live data from just moments ago."
4. **Demonstrate the Time Range Toggle** (center of page):
   - Click "Last 7 Days" → Watch the Lead Trends cards highlight
   - Click "Last 30 Days" → See the emphasis shift
   - **Say:** "We can toggle between time ranges to see short-term momentum vs long-term trends."
5. **Click through the Clickable KPI Tiles:**
   - Click "Total Leads" → Navigates to `/operator/leads`
   - **Say:** "Tiles deep-link to operational views - one click to drill down into details."
   - Go back, click "Active Aides" → Navigates to `/marketplace/caregivers`
   - Go back, click "Active Providers" → Navigates to `/admin/providers`
   - **Say:** "This makes it easy to go from high-level metrics to specific actions."
6. **Highlight the Key Ratios Section** (gradient banner):
   - **Verified Provider Rate:** "82% of our providers are verified - showing our commitment to quality."
   - **Background Check Clear Rate:** "75% of aides have cleared background checks."
   - **Leads per Provider:** "1.5 leads per provider shows balanced marketplace demand."
   - **Leads per Aide:** "2.3 leads per aide indicates healthy interest from families."
   - **Messages per Lead:** "6.9 messages per lead shows active engagement and conversation."
   - **Say:** "These ratios help us understand marketplace health beyond raw numbers."
7. Scroll through other sections:
   - **User Metrics:** Show growth by role (family, caregivers, providers)
   - **Lead Metrics:** Highlight leads by status and target type
   - **Marketplace Metrics:** Point out verified vs unverified breakdown
   - **Engagement Metrics:** Show message activity
8. **Say:** "This dashboard helps us track growth, identify bottlenecks, and measure platform traction."
9. Point to specific metrics based on the selected time range:
   - "We've had X new families sign up in the last 7 days"
   - "We have Y leads in 'IN_REVIEW' status - these need operator attention"
   - "Z% of our providers are verified, demonstrating our quality standards"

**Use Case for Investors:**
- **Growth Metrics:** Emphasize new users by role (last 7/30 days) showing user acquisition momentum
- **Demand Proof:** Highlight total leads and recent lead volume (use time toggle to show trends)
- **Supply Quality:** Point to verification rates and background check metrics as differentiation
- **Engagement Proof:** Messages per lead and total message activity show real usage, not just signups
- **Marketplace Balance:** Leads per provider/aide ratios show supply-demand equilibrium
- **Operational Efficiency:** Clickable tiles demonstrate admin tools for scale
- **Data-Driven Culture:** Time range toggle and key ratios show commitment to actionable analytics

**Use Case for ALFs/Agencies:**
- **Lead Volume:** Focus on active leads and conversion (NEW → CONTACTED → CLOSED)
- **Caregiver Quality:** Emphasize background check clear rate and verification rates
- **Response Time:** Messages per lead shows families are engaged and communicating
- **Marketplace Health:** Active aides and providers show robust supply

---

## 🎬 Demo Wrap-Up

**Key Points to Emphasize:**

1. **For Families:**
   - Easy browsing of caregivers and agencies
   - Detailed profiles with credentials and reviews
   - Direct messaging and inquiry submission
   - Care context helps match with right providers

2. **For Operators:**
   - Centralized lead management
   - Status tracking and assignment
   - Full visibility into family needs and provider availability
   - Built-in messaging for coordination

3. **For Caregivers/Providers:**
   - Professional profiles to showcase experience
   - Credential management and verification
   - Direct inquiries from families
   - Streamlined communication

4. **For Admins:**
   - Verification tools for trust and safety
   - Provider and caregiver management
   - Oversight of marketplace quality

**Closing Statement:**
"CareLinkAI brings together families, caregivers, agencies, and operators into one seamless platform. We're making senior care more accessible, transparent, and efficient for everyone involved."

---

## 🔧 Demo Tips

### Before the Demo
1. Run `npm run seed:demo` to ensure fresh data
2. Test login for all 5 personas
3. Open `/demo` portal in a browser tab for quick persona switching
4. Have a second browser/incognito window ready for showing multiple views simultaneously
5. Check that all messages and leads are populated

### During the Demo
1. **Start with the problem:** "Finding quality senior care is hard for families. Coordinating that care is hard for operators. We solve both."
2. **Use realistic language:** Refer to personas by name (Jennifer, Michael, Sarah)
3. **Highlight key features:**
   - Care context matching
   - Real-time messaging
   - Credential verification
   - Lead management
4. **Show, don't tell:** Click through actual flows rather than just describing them
5. **Customize to audience:**
   - For ALFs: Focus on operator and family flows
   - For agencies: Focus on provider flow and marketplace visibility
   - For investors: Show all flows and emphasize scalability

### After the Demo
1. Offer to create a custom demo account for their organization
2. Provide access to documentation
3. Schedule follow-up to discuss integration or pilot program

---

## 📱 Quick Reference: Key URLs

| Flow | URL | Purpose |
|------|-----|---------|
| **Demo Portal** | `/demo` | Access all persona cards |
| **Login** | `/auth/login` | Login page |
| **Family Profile** | `/settings/family` | Care context |
| **Browse Aides** | `/marketplace/aides` | Caregiver marketplace |
| **Browse Providers** | `/marketplace/providers` | Agency marketplace |
| **Messages** | `/messages` | Messaging interface |
| **Operator Leads** | `/operator/leads` | Lead management |
| **Lead Detail** | `/operator/leads/[id]` | Individual lead view |
| **Aide Profile** | `/settings/aide` | Caregiver profile |
| **Provider Profile** | `/settings/provider` | Agency profile |
| **Credentials** | `/settings/credentials` | Credential management |
| **Admin Providers** | `/admin/providers` | Provider admin |
| **Admin Aides** | `/admin/aides` | Caregiver admin |
| **Admin Metrics** | `/admin/metrics` | Platform analytics dashboard |

---

## 🎥 Alternative Demo Flows

### Quick Demo (5 minutes)
1. Family Flow (2 min): Care context → Browse → Submit inquiry
2. Operator Flow (2 min): View leads → Update status
3. Admin Flow (1 min): Provider verification

### Deep Dive Demo (15 minutes)
Include all 5 flows above plus:
- Show filters and search on marketplace
- Demonstrate favorites functionality
- Show message thread continuity across personas
- Walk through credential upload and verification process
- Explain AI matching (future roadmap)

### Role-Specific Demos
**For Assisted Living Facilities:**
- Focus on operator flow and family flow
- Emphasize lead management and coordination
- Show how operators can assign leads and track status

**For Home Care Agencies:**
- Focus on provider flow and marketplace visibility
- Show credential verification and trust badges
- Demonstrate inquiry management and messaging

**For Investors:**
- Show full end-to-end flow
- Emphasize marketplace network effects
- Highlight scalability (multiple operators, providers, families)
- **Demo the metrics dashboard** (`/admin/metrics`) to show:
  - Platform growth (new users by role)
  - Lead volume and conversion (proof of demand)
  - Supply-side health (active providers and caregivers)
  - Engagement levels (message activity)
- Discuss future features (AI matching, advanced analytics)

---

## Related Documentation

- [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) - Full account details and test data
- [METRICS_OVERVIEW.md](./METRICS_OVERVIEW.md) - Platform metrics and analytics documentation
- [PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md](../PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md) - Provider technical documentation
- [family_profile_implementation.md](../family_profile_implementation.md) - Family technical documentation
