# Operator MVP Status Matrix

**Last Updated:** December 8, 2025  
**Analysis Type:** Comprehensive code audit (no changes made)  
**Scope:** All Operator-facing features in CareLinkAI Phase 1 MVP

---

## Overview

The **Operator** role represents assisted living facility operators who:
- Manage one or more assisted living homes (listings)
- Handle family inquiries and lead conversion
- Oversee residents, caregivers, and daily operations
- Track compliance (licenses, inspections)
- Monitor occupancy, analytics, and billing

**Current State:** Operator experience has **extensive functionality** but suffers from **inconsistent UX**, **missing polish**, and **navigation gaps** compared to the Aide and Provider marketplaces.

---

## Status Legend

- ✅ **DONE**: Fully implemented and working with good UX
- 🚧 **WIP**: Partially implemented or has known issues
- ⚠️ **NEEDS POLISH**: Works but lacks quality/consistency
- ❌ **TODO**: Not implemented or completely broken

---

## Feature Matrix

### 1. Operator Account & Access

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| Operator role in auth system | ✅ DONE | `prisma/schema.prisma` | `UserRole.OPERATOR` exists; `Operator` model with userId, companyName, taxId, businessLicense |
| Operator signup/onboarding | ❌ TODO | N/A | No operator-specific registration flow; no onboarding wizard |
| Operator dashboard/landing page | 🚧 WIP | `/operator/page.tsx` | KPI cards work (homes, inquiries, residents, occupancy); lacks trends, recent activity, quick actions |
| Navigation & layout for Operator | ⚠️ NEEDS POLISH | `/operator/layout.tsx` | Uses generic `DashboardLayout`; no operator-specific nav structure; no role switcher |
| Profile management | ❌ TODO | N/A | No `/operator/profile` or `/settings/operator`; can't edit companyName, taxId, businessLicense |
| Settings/Preferences | 🚧 WIP | `/api/operator/preferences/route.ts` | API exists but no UI; preferences stored as JSON blob |
| Admin scope filtering | 🚧 WIP | Multiple pages | Admins can view by operatorId; inconsistently implemented across pages |

**Critical Gaps:**
- No operator profile editing capability
- No onboarding flow for new operators
- No operator-specific settings UI
- Dashboard lacks actionable insights (just counts)

---

### 2. Listings / Homes Management

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View list of homes | ✅ DONE | `/operator/homes/page.tsx`<br>`GET /api/operator/homes` | Lists homes with address, careLevel, capacity, status; supports mock mode |
| Create new home listing | 🚧 WIP | `/operator/homes/new/page.tsx` | Route exists but page not implemented |
| Edit/update home listing | ✅ DONE | `/operator/homes/[id]/edit/page.tsx`<br>`PATCH /api/operator/homes/[id]` | Form works; edits name, description, capacity, amenities, price; validation via Zod |
| Delete/archive home listing | ❌ TODO | N/A | No delete/archive functionality |
| Home detail/manage page | 🚧 WIP | `/operator/homes/[id]/page.tsx` | Route exists but page not implemented |
| Home listing fields & validation | 🚧 WIP | `prisma/schema.prisma` | Schema complete; missing: photos UI, address editing, careLevel editing |
| Photo management | 🚧 WIP | `/api/operator/homes/[id]/photos/*` | API exists (upload, delete, reorder) but no UI component |
| Licenses management | ✅ DONE | `/api/operator/homes/[id]/licenses/*` | CRUD APIs; integrated into Compliance page |
| Inspections management | ✅ DONE | `/api/operator/homes/[id]/inspections/*` | CRUD APIs; integrated into Compliance page |
| Visibility in Family search | ✅ DONE | Family marketplace | Homes searchable by families; status=ACTIVE required |

**Critical Gaps:**
- No "Create Home" form implementation
- No photo upload UI (API exists)
- No home detail "Manage" page
- Edit form lacks address/careLevel/status controls
- No bulk operations

---

### 3. Inquiries / Leads Management

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View list of incoming inquiries | ✅ DONE | `/operator/inquiries/page.tsx`<br>`GET (server-side fetch)` | Table view with status, home, createdAt, tourDate; client-side filtering |
| View lead details page | ✅ DONE | `/operator/inquiries/[id]/page.tsx`<br>`GET /api/operator/inquiries/[id]` | Shows family contact, message, internalNotes, status |
| Update lead status | ✅ DONE | `PATCH /api/operator/inquiries/[id]` | Status dropdown; optimistic updates; InquiryStatus enum |
| Add internal notes to lead | ✅ DONE | `PATCH /api/operator/inquiries/[id]/notes` | Textarea with save button; notes stored in `internalNotes` |
| View Family info in lead | ✅ DONE | Inquiry detail page | Name, email, phone shown; no link to family profile |
| Filter leads by status | 🚧 WIP | Client-side component | `OperatorInquiriesTable` has status filter but no backend API filtering |
| Filter leads by date | ❌ TODO | N/A | No date range filter |
| Filter leads by home | ❌ TODO | N/A | No home filter dropdown |
| Sort leads | ⚠️ NEEDS POLISH | Client-side only | No backend sorting; only `createdAt: desc` |
| Lead status workflow | ⚠️ NEEDS POLISH | InquiryStatus enum | 7 statuses but no guided workflow or automation |
| **Separate Lead Model** | 🚧 WIP | `/operator/leads/*`<br>`GET /api/operator/leads` | NEW polymorphic Lead model for Aide/Provider inquiries; causes confusion with Inquiry model |

**Critical Gaps:**
- **Two lead systems:** Inquiry (for homes) vs Lead (for aides/providers) → confusing, inconsistent
- No deep-link from inquiry to messaging
- No bulk status updates
- No assignment to specific operator user
- No lead scoring or prioritization
- Filters are client-side only (no backend API support)
- No export to CSV

---

### 4. Residents / Care Management

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View residents list | ✅ DONE | `/operator/residents/page.tsx`<br>`GET /api/residents` | Table with name, status; filters by q, status, homeId, familyId; CSV export |
| Add new resident | 🚧 WIP | `/operator/residents/new/page.tsx` | Route exists but page not implemented |
| View resident details | 🚧 WIP | `/operator/residents/[id]/page.tsx` | Route exists but page not implemented |
| Edit resident details | 🚧 WIP | `/operator/residents/[id]/edit/page.tsx` | Route exists but page not implemented |
| Link resident to home | ⚠️ NEEDS POLISH | Inline actions component | Quick assign via dropdown; no validation flow |
| Resident care plans | ❌ TODO | N/A | No care plan UI |
| Resident compliance tracking | 🚧 WIP | `/operator/residents/[id]/compliance/page.tsx` | Route exists; ResidentComplianceItem model in DB but no UI |
| Resident notes | ⚠️ NEEDS POLISH | ResidentNote model | DB model exists; no UI component |
| Resident incidents | ⚠️ NEEDS POLISH | ResidentIncident model | DB model exists; no UI component |
| Resident timeline | ⚠️ NEEDS POLISH | CareTimelineEvent model | DB model exists; no UI component |
| Resident contacts | ⚠️ NEEDS POLISH | ResidentContact model | DB model exists; no UI component |
| Family collaboration | ⚠️ NEEDS POLISH | FamilyDocument, FamilyNote models | DB models exist; no UI |

**Critical Gaps:**
- Most resident routes exist but pages not implemented
- Rich data model (notes, incidents, timeline, contacts) but no UI
- No resident onboarding workflow
- No resident → inquiry linking
- No resident billing/payment tracking UI

---

### 5. Caregivers / Staff Management

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View employed caregivers | ✅ DONE | `/operator/caregivers/page.tsx` | Lists CaregiverEmployment records with caregiver name, position, dates, status |
| Add new employment record | 🚧 WIP | `/operator/caregivers/new/page.tsx`<br>`POST /api/operator/caregivers` | Route/API exist but page not implemented |
| End employment | ✅ DONE | `PATCH /api/operator/caregivers/[id]` | Server action sets endDate, isActive=false |
| View caregiver profile | ❌ TODO | N/A | No link to caregiver profile from employment list |
| Manage caregiver credentials | ❌ TODO | N/A | No way to view/verify caregiver credentials from operator view |
| Message caregivers | ❌ TODO | N/A | No deep-link to messaging from caregiver list |

**Critical Gaps:**
- No "Add Employment" form
- No link to caregiver profile or credentials
- No messaging integration
- No caregiver performance tracking

---

### 6. Shifts / Scheduling

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View shifts list | ✅ DONE | `/operator/shifts/page.tsx` | Table with home, times, rate, caregiver, status |
| Create new shift | 🚧 WIP | `/operator/shifts/new/page.tsx`<br>`POST /api/operator/shifts` | Route/API exist but page not implemented |
| Assign shift to caregiver | ✅ DONE | `/operator/shifts/[id]/assign/page.tsx`<br>`PATCH /api/operator/shifts/[id]/assign` | Assign/reassign UI works |
| Unassign shift | ✅ DONE | Client component button | UnassignShiftButton removes caregiver from shift |
| Shift calendar view | 🚧 WIP | `/operator/shifts/calendar/page.tsx` | Route exists but page not implemented |
| Shift status workflow | ⚠️ NEEDS POLISH | ShiftStatus enum | 6 statuses but no automated transitions |
| Timesheet integration | ⚠️ NEEDS POLISH | Timesheet model | DB model exists; no UI |

**Critical Gaps:**
- No "Create Shift" form
- Calendar view not implemented
- No timesheet UI
- No shift notifications
- No shift availability matching

---

### 7. Analytics & Reporting

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| Occupancy dashboard | ✅ DONE | `/operator/analytics/page.tsx` | Doughnut chart, homes count, capacity, occupancy % |
| Inquiry funnel chart | ✅ DONE | `/operator/analytics/page.tsx` | Bar chart by status; CSV export |
| Admin scope filtering | ✅ DONE | `/operator/analytics/page.tsx` | Admin can filter by operatorId |
| Date range filtering | ✅ DONE | Query param `range` | 7d, 30d, 90d options |
| CSV export | 🚧 WIP | Inquiries only | Only inquiry funnel exports; no resident/shift exports |
| Revenue/billing analytics | ❌ TODO | N/A | No revenue trends, projections, or cohort analysis |
| Performance metrics | ❌ TODO | N/A | No lead conversion rate, avg time-to-placement, etc. |

**Critical Gaps:**
- Limited to occupancy + inquiry funnel
- No trend lines or forecasting
- No performance KPIs
- No resident tenure/churn analysis
- No caregiver utilization metrics

---

### 8. Billing / Payments

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View payment history | ✅ DONE | `/operator/billing/page.tsx` | Table with date, home, family, type, amount, status |
| 30-day volume summary | ✅ DONE | `/operator/billing/page.tsx` | KPI card with total and count |
| MRR tracking | ✅ DONE | `/operator/billing/page.tsx` | KPI card for monthly recurring revenue |
| Admin scope filtering | ✅ DONE | `/operator/billing/page.tsx` | Admin can filter by operatorId |
| Payout management | 🚧 WIP | `/api/operator/payouts/*` | Stripe Connect API routes exist but no UI |
| Invoice generation | ❌ TODO | N/A | No invoice creation or download |
| Payment disputes | ❌ TODO | N/A | No dispute handling |
| Resident billing statements | ❌ TODO | N/A | No per-resident billing UI |

**Critical Gaps:**
- No payout request UI
- No invoice management
- No per-resident billing breakdown
- No refund handling
- No payment method management

---

### 9. Compliance & Licensing

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| View licenses list | ✅ DONE | `/operator/compliance/page.tsx` | Shows expiring-soon licenses with home, type, expiration |
| Upload/add license | ✅ DONE | ComplianceQuickActions component | Quick-add form with file upload |
| Download license document | ✅ DONE | `GET /api/operator/homes/[id]/licenses/[licenseId]/download` | Works |
| Delete license | ✅ DONE | `DELETE /api/operator/homes/[id]/licenses/[licenseId]` | Works |
| View inspections list | ✅ DONE | `/operator/compliance/page.tsx` | Shows recent inspections with home, type, date, result |
| Upload/add inspection | ✅ DONE | ComplianceQuickActions component | Quick-add form with file upload |
| Download inspection document | ✅ DONE | `GET /api/operator/homes/[id]/inspections/[inspectionId]/download` | Works |
| Delete inspection | ✅ DONE | `DELETE /api/operator/homes/[id]/inspections/[inspectionId]` | Works |
| Expiration alerts | ⚠️ NEEDS POLISH | Client-side display only | Shows red/amber text; no email alerts or dashboard warnings |
| Compliance dashboard | ⚠️ NEEDS POLISH | `/operator/compliance/page.tsx` | Basic list view; no summary metrics or risk scoring |

**Critical Gaps:**
- No email alerts for expiring licenses
- No compliance dashboard with risk scores
- No audit trail for compliance changes
- No bulk upload/management
- No automated renewal reminders

---

### 10. Messaging / Communication

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| Operator → Family messaging | ⚠️ NEEDS POLISH | Generic `/messages` | Generic messaging exists but no deep-link from inquiry detail |
| Operator → Aide messaging | ⚠️ NEEDS POLISH | Generic `/messages` | Generic messaging exists but no deep-link from caregiver list |
| Operator → Provider messaging | ⚠️ NEEDS POLISH | Generic `/messages` | Generic messaging exists but no deep-link from leads |
| Deep-link from lead to conversation | ❌ TODO | N/A | No "Message Family" button on inquiry detail page |
| Message notifications | ✅ DONE | SSE at `/api/messages/sse` | Real-time notifications work |
| Message threading | ✅ DONE | Conversation model | Thread-based messaging |
| Unread count | ✅ DONE | DashboardLayout | Unread badge in header |

**Critical Gaps:**
- No context-aware messaging (no "Message this family" button on inquiry page)
- No message templates
- No automated messages
- No message search/filtering from operator view

---

### 11. Quality & UX

| Feature | Status | Routes/APIs | Notes / Gaps |
|---------|--------|-------------|--------------|
| Visual consistency with Aide/Provider | ⚠️ NEEDS POLISH | All operator pages | Less polished; inconsistent form styles, no photo galleries |
| Error states | 🚧 WIP | Various pages | Some pages have good error handling; others use generic alerts |
| Empty states | 🚧 WIP | Various pages | Some pages have empty states; others just show empty tables |
| Loading states | 🚧 WIP | Various pages | Some pages have spinners; others have no loading feedback |
| Form validation feedback | ⚠️ NEEDS POLISH | Edit forms | Basic Zod validation but lacks inline error display like Aide/Provider |
| Success confirmations | ⚠️ NEEDS POLISH | Various actions | Uses toast/alert; no animated confirmations |
| Mobile responsiveness | ⚠️ NEEDS POLISH | All pages | Grid layouts responsive but tables not mobile-optimized |
| Accessibility | ⚠️ NEEDS POLISH | All pages | Basic semantic HTML; no ARIA labels or keyboard nav testing |
| Help text / tooltips | ❌ TODO | N/A | No contextual help or tooltips |
| Onboarding guide | ❌ TODO | N/A | No first-time user guide |

**Critical Gaps:**
- Inconsistent UI patterns (some client components, some server components)
- No photo galleries like Aide/Provider profiles
- Forms lack real-time validation feedback
- No animation or micro-interactions
- No contextual help
- Mobile table views need work

---

## Concrete Issues Identified

### Critical Breakages

1. **🔴 CRITICAL:** Multiple resident/shift/caregiver routes exist but pages are not implemented
   - `/operator/residents/new`, `/operator/residents/[id]`, `/operator/residents/[id]/edit`
   - `/operator/homes/new`, `/operator/homes/[id]`
   - `/operator/caregivers/new`
   - `/operator/shifts/new`, `/operator/shifts/calendar`
   - **Impact:** Users see 404 or blank pages when clicking navigation links
   - **Files:** `src/app/operator/{residents,homes,caregivers,shifts}/...`

2. **🔴 CRITICAL:** No Operator profile management
   - **Impact:** Operators can't edit their company name, tax ID, or business license
   - **Missing:** `/operator/profile` or `/settings/operator` page
   - **API:** None exists
   - **Files:** None

3. **🔴 CRITICAL:** Two separate lead/inquiry systems cause confusion
   - **Inquiry model** for Home inquiries (`/operator/inquiries/*`)
   - **Lead model** for Aide/Provider inquiries (`/operator/leads/*`)
   - **Impact:** Confusing for operators; duplicated UI patterns; inconsistent workflows
   - **Files:** `src/app/operator/{inquiries,leads}/*`, `prisma/schema.prisma`

4. **🔴 CRITICAL:** No messaging integration from operator views
   - **Impact:** Operators must manually navigate to `/messages` and search for user
   - **Expected:** "Message Family" button on inquiry detail, "Message Aide" on caregiver list
   - **Files:** `src/app/operator/inquiries/[id]/page.tsx`, etc.

5. **🔴 CRITICAL:** Photo management API exists but no UI
   - **APIs:** `POST /api/operator/homes/[id]/photos`, `DELETE`, `PATCH /reorder`
   - **Impact:** Operators can't add photos to home listings → poor family experience
   - **Files:** `src/app/api/operator/homes/[id]/photos/*` (API only)

### UX Issues

6. **🟡 HIGH:** Dashboard lacks actionable insights
   - **Current:** Just KPI counts (homes, inquiries, residents, occupancy)
   - **Expected:** Recent activity feed, expiring licenses alert, unread messages count, quick actions
   - **Files:** `src/app/operator/page.tsx`

7. **🟡 HIGH:** Inquiry filters are client-side only
   - **Current:** `OperatorInquiriesTable` filters on client after fetching all
   - **Expected:** Server-side filtering via API query params (status, home, dateRange)
   - **Files:** `src/components/operator/OperatorInquiriesTable.tsx`

8. **🟡 HIGH:** Edit Home form is incomplete
   - **Current:** Only name, description, capacity, amenities, price
   - **Missing:** Address, careLevel, status, genderRestriction
   - **Files:** `src/app/operator/homes/[id]/edit/page.tsx`

9. **🟡 MEDIUM:** Inconsistent empty states
   - **Some pages:** "No homes yet. Click 'Add Home' to create..." (good)
   - **Other pages:** Just empty table (bad)
   - **Files:** Various operator pages

10. **🟡 MEDIUM:** Forms lack real-time validation feedback
    - **Current:** Zod validation on submit
    - **Expected:** Inline error messages like Aide/Provider credential forms
    - **Files:** `src/app/operator/homes/[id]/edit/page.tsx`, etc.

### Navigation Issues

11. **🟠 MEDIUM:** No breadcrumbs or consistent back navigation
    - **Current:** Some pages have back button, others don't
    - **Expected:** Breadcrumbs (Dashboard > Homes > Edit Home)
    - **Files:** All operator pages

12. **🟠 MEDIUM:** No sidebar navigation for operator features
    - **Current:** Dashboard quick-links only
    - **Expected:** Persistent sidebar like admin console
    - **Files:** `src/app/operator/layout.tsx`

13. **🟠 MEDIUM:** Leads vs Inquiries confusion
    - **Current:** Two separate pages (`/operator/inquiries`, `/operator/leads`)
    - **Expected:** Unified "Leads" page with tabs (Home Inquiries, Aide Leads, Provider Leads)
    - **Files:** `src/app/operator/{inquiries,leads}/*`

14. **🟠 MEDIUM:** No link from inquiry to family profile
    - **Current:** Shows family name, email, phone
    - **Expected:** Link to `/family/[id]` profile (if family role has profile page)
    - **Files:** `src/app/operator/inquiries/[id]/page.tsx`

### RBAC Issues

15. **🟠 LOW:** Admin scope filtering inconsistent
    - **Current:** Some pages support `?operatorId=`, others don't
    - **Expected:** All operator pages should respect admin scope
    - **Files:** `src/app/operator/{analytics,billing,compliance}/page.tsx` (good), others (missing)

16. **🟠 LOW:** Operator can't see all their data in one place
    - **Current:** Must navigate to separate pages
    - **Expected:** Cross-home reporting and resident management
    - **Files:** Various

---

## Comparison with Other Roles

### What Aide/Provider Have That Operator Lacks

1. **Polished profile pages** with photo galleries
   - Aide/Provider: `/marketplace/caregivers/[id]` has photo, bio, skills, reviews, verification badges
   - Operator: Home detail page doesn't exist; edit page is bare-bones

2. **Real-time validation and inline errors**
   - Aide/Provider: Credential upload form has immediate feedback
   - Operator: Edit home form validates only on submit

3. **Comprehensive settings pages**
   - Aide: `/settings/profile`, `/settings/credentials`, `/settings/availability`
   - Provider: `/settings/provider` (assumed)
   - Operator: No `/settings/operator` page

4. **Onboarding flows**
   - Aide/Provider: Registration includes role-specific fields
   - Operator: No onboarding wizard or setup guide

5. **Visual richness**
   - Aide/Provider: Profile cards, rating stars, verification badges, photo galleries
   - Operator: Plain tables and basic forms

6. **Contextual actions**
   - Aide/Provider: "Message" buttons, "View Profile" links, "Favorite" toggles
   - Operator: Missing "Message Family" from inquiry detail, no quick actions

### What Operator Needs to Match Quality Bar

1. **Operator Profile Settings Page**
   - `/operator/profile` or `/settings/operator`
   - Edit company name, tax ID, business license, contact info
   - Upload company logo
   - Manage notification preferences

2. **Complete Home Management UI**
   - Implement `/operator/homes/new` (create form)
   - Implement `/operator/homes/[id]` (detail/manage page)
   - Photo gallery component with drag-drop upload
   - Address editing
   - Care level and amenities multi-select
   - Status controls

3. **Unified Leads Dashboard**
   - Merge Inquiries + Leads into one view with tabs
   - Server-side filtering (status, date, home, assigned)
   - Bulk actions (assign, status update)
   - Lead scoring/prioritization

4. **Resident Management UI**
   - Implement all missing resident pages (new, detail, edit, compliance)
   - Resident timeline view
   - Notes and incidents UI
   - Family collaboration features

5. **Messaging Integration**
   - "Message" buttons on inquiry detail, caregiver list
   - Deep-links to conversations with context
   - Message templates for common responses

6. **Polish & Consistency**
   - Standardize form styles (match Aide/Provider)
   - Add loading skeletons (not just spinners)
   - Empty state illustrations
   - Success animations
   - Breadcrumbs
   - Sidebar navigation
   - Help tooltips

7. **Mobile Optimization**
   - Responsive tables (convert to cards on mobile)
   - Touch-friendly buttons
   - Mobile-optimized forms

8. **Onboarding & Help**
   - First-time setup wizard
   - Contextual help text
   - Video tutorials or tooltips
   - Sample data for new operators

---

## Implementation Plan

### Priority 1: Critical Fixes (Week 1-2)

**Goal:** Fix broken routes and enable core workflows

1. **Implement missing resident pages** *(Complexity: Medium)*
   - `src/app/operator/residents/new/page.tsx` - Create resident form
   - `src/app/operator/residents/[id]/page.tsx` - Resident detail view
   - `src/app/operator/residents/[id]/edit/page.tsx` - Edit resident form
   - **Dependencies:** None
   - **Files:** 3 new pages
   - **APIs:** Use existing `POST /api/residents`, `GET /api/residents/[id]`, `PATCH /api/residents/[id]`

2. **Implement home creation and detail pages** *(Complexity: Medium)*
   - `src/app/operator/homes/new/page.tsx` - Create home form
   - `src/app/operator/homes/[id]/page.tsx` - Home detail/manage view
   - **Dependencies:** Photo upload component (Priority 2)
   - **Files:** 2 new pages
   - **APIs:** Use existing `POST /api/operator/homes`, `GET /api/operator/homes/[id]`

3. **Create Operator profile settings page** *(Complexity: Simple)*
   - `src/app/settings/operator/page.tsx` - Edit company info
   - `src/app/api/operator/profile/route.ts` - GET/PATCH operator profile
   - **Dependencies:** None
   - **Files:** 1 page, 1 API route
   - **Fields:** companyName, taxId, businessLicense, preferences

4. **Add messaging integration to inquiry detail** *(Complexity: Simple)*
   - Add "Message Family" button to `/operator/inquiries/[id]/page.tsx`
   - Deep-link to `/messages?userId={familyUserId}`
   - **Dependencies:** None
   - **Files:** 1 file update

5. **Implement photo upload UI for homes** *(Complexity: Medium)*
   - Create `PhotoGalleryManager` component (upload, delete, reorder, set primary)
   - Integrate into home detail/edit pages
   - **Dependencies:** Existing photo APIs
   - **Files:** 1 new component, 2 page updates
   - **APIs:** Use existing `POST /api/operator/homes/[id]/photos`, `DELETE`, `PATCH /reorder`

**Estimated Effort:** 5-7 days

---

### Priority 2: UX Improvements (Week 3-4)

**Goal:** Bring operator UX to Aide/Provider quality bar

6. **Enhance Edit Home form** *(Complexity: Simple)*
   - Add address editing (street, city, state, zipCode)
   - Add careLevel multi-select
   - Add status dropdown (DRAFT, ACTIVE, INACTIVE)
   - Add genderRestriction radio buttons
   - **Files:** `src/app/operator/homes/[id]/edit/page.tsx`

7. **Improve dashboard with actionable insights** *(Complexity: Medium)*
   - Recent activity feed (last 5 inquiries, new residents, expiring licenses)
   - Quick actions (Create Home, View Inquiries, Run Report)
   - Expiring licenses alert box
   - **Files:** `src/app/operator/page.tsx`

8. **Server-side inquiry filtering** *(Complexity: Medium)*
   - Update API to accept query params (status, homeId, dateFrom, dateTo, assignedOperatorId)
   - Update client component to use API instead of client-side filtering
   - **Files:** `src/app/api/operator/inquiries/route.ts` (new), `src/components/operator/OperatorInquiriesTable.tsx`

9. **Add real-time validation to forms** *(Complexity: Simple)*
   - Use Zod + inline error messages for all operator forms
   - Match Aide/Provider credential form style
   - **Files:** All operator form pages

10. **Standardize empty states** *(Complexity: Simple)*
    - Add consistent empty state messages + illustrations
    - Include CTA button ("Create Home", "Add Resident")
    - **Files:** All list pages

11. **Add breadcrumbs navigation** *(Complexity: Simple)*
    - Create `Breadcrumbs` component
    - Add to all operator pages
    - **Files:** 1 new component, all pages

12. **Implement shift creation and calendar** *(Complexity: Medium)*
    - `src/app/operator/shifts/new/page.tsx` - Create shift form
    - `src/app/operator/shifts/calendar/page.tsx` - Calendar view with FullCalendar.js
    - **Files:** 2 new pages

**Estimated Effort:** 6-8 days

---

### Priority 3: Polish & Nice-to-Have (Week 5+)

**Goal:** Professional polish and advanced features

13. **Unify Leads and Inquiries** *(Complexity: Complex)*
    - Create `/operator/leads/page.tsx` with tabs (Home Inquiries, Aide Leads, Provider Leads)
    - Migrate Inquiry model queries to unified API
    - Maintain backward compatibility
    - **Files:** 1 new page, API updates, deprecate old routes

14. **Add operator sidebar navigation** *(Complexity: Simple)*
    - Update `src/app/operator/layout.tsx` with persistent sidebar
    - Links: Dashboard, Homes, Leads, Residents, Caregivers, Shifts, Compliance, Billing, Analytics
    - **Files:** 1 file update

15. **Implement resident timeline and notes UI** *(Complexity: Medium)*
    - Add timeline component to resident detail page
    - Add notes/incidents forms
    - **Files:** 1 component, 1 page update

16. **Add mobile optimization** *(Complexity: Medium)*
    - Convert tables to card views on mobile
    - Test and fix touch targets
    - **Files:** All list pages, CSS updates

17. **Create onboarding wizard** *(Complexity: Medium)*
    - 3-step wizard for new operators: Profile, First Home, Invite Team
    - Show on first login
    - **Files:** 1 new page/modal

18. **Add help tooltips and contextual help** *(Complexity: Simple)*
    - Add question mark icons with tooltips
    - Link to docs or video tutorials
    - **Files:** All pages, 1 help content file

19. **Implement bulk actions** *(Complexity: Medium)*
    - Bulk status update for inquiries
    - Bulk assign for leads
    - **Files:** Inquiry/lead list pages

20. **Add payout management UI** *(Complexity: Medium)*
    - Connect Stripe account
    - Request payout button
    - View payout history
    - **Files:** `src/app/operator/payouts/page.tsx`, existing API routes

**Estimated Effort:** 8-10 days

---

## Testing Checklist

### Functionality Testing
- [ ] Create new operator account
- [ ] View operator dashboard with mock data
- [ ] Create new home listing
- [ ] Edit home listing (all fields)
- [ ] Upload photos to home
- [ ] View home in family marketplace
- [ ] Receive and view family inquiry
- [ ] Update inquiry status through workflow
- [ ] Add internal notes to inquiry
- [ ] Create new resident
- [ ] Assign resident to home
- [ ] View resident detail
- [ ] Add caregiver employment
- [ ] Create and assign shift
- [ ] View analytics charts
- [ ] View billing/payments
- [ ] Upload license and inspection
- [ ] Message family from inquiry
- [ ] Test admin scope filtering

### RBAC Testing
- [ ] Operator can only see their homes/inquiries
- [ ] Admin can view all operators with scope filter
- [ ] Operator can't access admin routes
- [ ] Operator can't edit other operators' data

### UX Testing
- [ ] All forms validate on submit
- [ ] Error messages are clear
- [ ] Success confirmations appear
- [ ] Loading states show for async operations
- [ ] Empty states display with CTAs
- [ ] Mobile responsive (all pages)
- [ ] Breadcrumbs work
- [ ] Messaging deep-links work

---

## Deployment Considerations

### Database Migrations
- No new migrations needed (all models exist)
- May need to add indexes if query performance degrades

### API Changes
- New APIs needed:
  - `GET /api/operator/profile`
  - `PATCH /api/operator/profile`
  - `GET /api/operator/inquiries` (with filters)
  - `POST /api/operator/homes` (already exists but needs testing)
  - `POST /api/residents` (already exists)

### Environment Variables
- No new env vars needed
- Ensure `NEXT_PUBLIC_RESIDENTS_ENABLED` is set

### Third-Party Services
- Stripe Connect for payouts (already configured)
- S3 for photo/document uploads (already configured)

---

## Risk Assessment

### High Risk
- **Two lead systems (Inquiry vs Lead):** Unifying these requires careful migration and backward compatibility
- **Missing pages:** Users may have bookmarks to unimplemented routes

### Medium Risk
- **Photo upload:** S3 integration needs testing in production
- **RBAC:** Admin scope filtering must be consistently enforced
- **Mobile:** Tables may break on small screens

### Low Risk
- **Forms:** Straightforward CRUD operations
- **Dashboard:** Mostly display logic
- **Analytics:** Read-only queries

---

## Success Metrics

### Post-Implementation KPIs
- [ ] **All operator routes return 200** (no 404s)
- [ ] **Operator profile completion rate** > 80%
- [ ] **Home photo upload rate** > 50%
- [ ] **Inquiry response time** < 24 hours
- [ ] **Mobile usability score** > 80% (Lighthouse)
- [ ] **Operator satisfaction score** (survey) > 4.0/5.0

---

## Related Documentation

- `docs/mvp_status_matrix.md` - Family ↔ Operator flow status
- `docs/mvp_status_aides.md` - Aide marketplace status
- `docs/mvp_status_providers.md` - Provider marketplace status
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - Phase 1 completion report
- `prisma/schema.prisma` - Database schema reference

---

## Summary

### Current State
- **Total Routes:** 23 operator pages
- **Implemented:** 10 pages (43%)
- **Partially Implemented:** 5 pages (22%)
- **Not Implemented:** 8 pages (35%)
- **API Endpoints:** 22 routes (most work)
- **Overall Status:** 🚧 **WIP with significant gaps**

### Key Findings
1. **Strong foundation:** Core models and APIs are solid
2. **Missing UI:** Many routes exist but pages not implemented
3. **Inconsistent UX:** Operator experience less polished than Aide/Provider
4. **Confusing lead systems:** Inquiry vs Lead duplication
5. **Navigation gaps:** No sidebar, breadcrumbs, or messaging integration

### Recommended Path Forward
1. **Phase 1 (Weeks 1-2):** Fix critical breakages (Priority 1 tasks)
2. **Phase 2 (Weeks 3-4):** Improve UX to match Aide/Provider (Priority 2 tasks)
3. **Phase 3 (Weeks 5+):** Polish and advanced features (Priority 3 tasks)

**Total Estimated Effort:** 19-25 days (3-5 weeks for 1 developer)

---

**Document Status:** ✅ Analysis Complete (No Code Changes Made)  
**Next Step:** Review with team and prioritize implementation tasks
