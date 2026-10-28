# How-To Guide Screenshots

Drop screenshot PNGs here (flat, by the exact filename below). The
How-To hub renders only images that exist (see `AVAILABLE_HOWTO_IMAGES`
in `src/app/learn/howto/content.ts`), so until a file lands the guide
renders text-only — nothing 404s. After adding files, re-run:

    npx tsx scripts/generate-howto-content.ts

Filenames are per-guide; if two guides share a name (e.g. `01_dashboard.png`)
they refer to different screens — capture each guide separately. (A future
cleanup may namespace these by slug.)

## Getting Started (All Roles) (`shared`)
- **Sign Up & Log In** (`signup-and-login`):
  - [ ] `01_register.png`
  - [ ] `02_login.png`
  - [ ] `03_dashboard.png`
- **Messaging** (`messaging`):
  - [ ] `01_inbox.png`
  - [ ] `02_conversation.png`
- **Settings — Profile, Account & Notifications** (`settings-profile-and-notifications`):
  - [ ] `01_settings_hub.png`

## For Families (`family`)
- **Search for a Care Home** (`search-homes`):
  - [ ] `01_login.png`
  - [ ] `02_dashboard.png`
  - [ ] `03_search_results.png`
  - [ ] `04_listing_detail.png`
- **Save Favorites & Compare Homes** (`save-and-compare`):
  - [ ] `01_search_results.png`
  - [ ] `02_heart_saved.png`
  - [ ] `03_compare_banner.png`
  - [ ] `04_favorites.png`
- **Send an Inquiry to a Care Home** (`send-inquiry`):
  - [ ] `01_listing_detail.png`
  - [ ] `02_inquiry_form.png`
  - [ ] `03_inquiry_filled.png`
  - [ ] `04_my_inquiries.png`
- **Schedule a Tour** (`schedule-tour`):
  - [ ] `01_listing_panel.png`
  - [ ] `02_tour_datetime.png`
  - [ ] `03_my_tours.png`
- **Use AI Match to Find Your Best Homes** (`ai-match`):
  - [ ] `01_aimatch_start.png`
  - [ ] `02_step1_budget.png`
  - [ ] `03_step4_location.png`
  - [ ] `04_results.png`
- **Use the Family Portal** (`family-portal`):
  - [ ] `01_portal_home.png`
  - [ ] `02_documents.png`
  - [ ] `03_activity.png`
  - [ ] `04_members.png`

## For Operators (`operator`)
- **Claim Your Listing** — _(no screenshots)_
- **Your Operator Dashboard** (`operator-dashboard`):
  - [ ] `01_dashboard.png`
  - [ ] `02_ask_ai.png`
- **Manage Your Home & Photos** (`manage-home-and-photos`):
  - [ ] `01_your_homes.png`
  - [ ] `02_manage_home.png`
  - [ ] `03_photo_upload.png`
- **Manage Leads & the Inquiries Pipeline** (`leads-and-inquiries-pipeline`):
  - [ ] `01_pipeline.png`
  - [ ] `02_kanban_cards.png`
- **Manage Tour Requests** (`tour-management`):
  - [ ] `01_tour_management.png`
  - [ ] `02_tour_request.png`
- **Manage Residents** (`residents`):
  - [ ] `01_residents.png`
  - [ ] `02_resident_row.png`
- **Shifts & On-Call AI Coverage** (`shifts-and-oncall-ai`):
  - [ ] `01_shifts.png`
  - [ ] `02_oncall.png`
- **Compliance Document Kits** (`compliance-kits`):
  - [ ] `01_compliance_kits.png`
- **Analytics & Billing** (`analytics-and-billing`):
  - [ ] `01_analytics.png`
  - [ ] `02_billing.png`

## For Caregivers (`caregiver`)
- **Your Caregiver Dashboard** (`caregiver-dashboard`):
  - [ ] `01_dashboard.png`
  - [ ] `02_status_tiles.png`
- **Build Your Profile & Add Credentials** (`profile-and-credentials`):
  - [ ] `01_profile.png`
  - [ ] `02_skills.png`
  - [ ] `03_rate.png`
  - [ ] `04_credentials.png`
- **Find Jobs & Track Applications** (`marketplace-jobs-and-applications`):
  - [ ] `01_jobs.png`
  - [ ] `02_job_card.png`
  - [ ] `03_applications.png`
- **Pick Up Shifts & Track Your Hours** (`shifts-and-timesheets`):
  - [ ] `01_open_shifts.png`
  - [ ] `02_my_shifts.png`
- **Earn Reliability Points & Rewards** (`reliability-points`):
  - [ ] `01_points.png`
  - [ ] `02_tier.png`
- **Your Public Profile & Background Checks** (`public-profile-and-background-checks`):
  - [ ] `01_public_profile.png`
  - [ ] `02_background_checks.png`

## For Providers (`provider`)
- **Your Provider Dashboard & Getting Listed** (`provider-dashboard-and-onboarding`):
  - [ ] `01_dashboard.png`
  - [ ] `02_onboarding_checklist.png`
- **Set Up Your Provider Profile, Services & Pricing** (`profile-services-and-pricing`):
  - [ ] `01_profile.png`
  - [ ] `02_services.png`
  - [ ] `03_transport.png`
  - [ ] `04_pricing.png`
- **Your Marketplace Listing & Public Presence** (`marketplace-listing-and-presence`):
  - [ ] `01_listing_billing.png`
  - [ ] `02_public_profile.png`

## For Discharge Planners (`discharge-planner`)
- **AI Placement Search** (`placement-search`):
  - [ ] `01_dashboard.png`
  - [ ] `02_search.png`
  - [ ] `03_results.png`
- **Request a Care-Team Shortlist (Concierge)** (`refer-and-inquire-on-behalf`) — _(no screenshots)_

**Total screenshots referenced: 71**
