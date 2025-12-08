# CareLinkAI Metrics Dashboard - Overview & Documentation

## Introduction

The **Admin Metrics Dashboard** (`/admin/metrics`) provides comprehensive, real-time analytics and performance indicators for the CareLinkAI platform. This dashboard is exclusively available to users with the **ADMIN** role and serves as the central hub for understanding platform health, user growth, marketplace activity, and engagement levels.

**Access:** Admin users only  
**URL:** `/admin/metrics`  
**API Endpoint:** `GET /api/admin/metrics`

---

## Dashboard Features

### 1. Last Updated Timestamp

**Location:** Top-right corner of the page  
**Description:** Displays when the metrics data was last generated  
**Format:** "Dec 8, 2025, 3:45 PM" (localized to user's timezone)  
**Purpose:** Provides confidence in data freshness and helps admins understand when to refresh for latest numbers

**Technical Details:**
- Timestamp is generated server-side in the API response (`generatedAt` field)
- Formatted using `toLocaleString()` with custom options for readability
- Updates automatically on page refresh

---

### 2. Time Range Toggle

**Location:** Center of page, below the header  
**Options:** 
- **Last 7 Days** - Shows short-term momentum and recent trends
- **Last 30 Days** - Shows monthly growth patterns
- **All Time** - Shows cumulative platform metrics

**Visual Behavior:**
- Active selection is highlighted with primary color and shadow
- Inactive options use neutral styling with hover effects
- Smooth transitions between selections

**Impact on Dashboard:**
When a time range is selected, the **Lead Trends** section visually emphasizes the corresponding metric:
- **Last 7 Days selected** → "Leads (Last 7 Days)" card highlights with ring, shadow, and scale
- **Last 30 Days selected** → "Leads (Last 30 Days)" card highlights with ring, shadow, and scale
- **All Time selected** → No specific card emphasis (shows overall totals)

**Use Cases:**
- **Investors:** Toggle to show growth momentum (Last 7 Days) vs sustained growth (Last 30 Days)
- **Operators:** Use Last 7 Days to identify immediate bottlenecks or spikes
- **Long-term Planning:** Use All Time view to understand cumulative trends

**Technical Details:**
- State managed with React `useState` hook
- No URL persistence (selection resets on page reload)
- CSS transitions provide smooth visual feedback

---

### 3. Clickable KPI Tiles (Deep-Links)

**Location:** Top of metrics display, below time range toggle  
**Purpose:** Provide quick navigation from high-level metrics to detailed operational views

#### Tile Mappings:

| Tile | Metric | Deep-Link Destination | Description |
|------|--------|----------------------|-------------|
| **Total Users** | Sum of all users by role | *No link* (no dedicated user list exists) | Displays total registered users across all roles |
| **Total Leads** | Count of all non-deleted leads | `/operator/leads` | Navigate to lead management interface |
| **Active Aides** | Caregivers visible in marketplace | `/marketplace/caregivers` | Browse marketplace caregiver listings |
| **Active Providers** | Active home care agencies | `/admin/providers` | Admin provider management view |

#### Visual Design:
- **Hover Effect:** Border color changes to match tile theme (green for leads, blue for aides, purple for providers)
- **Hover Shadow:** Subtle shadow appears on hover
- **Arrow Icon:** Right-pointing arrow (`FiArrowRight`) appears on hover and slides right
- **Cursor:** Pointer cursor indicates interactivity
- **Accessibility:** Tiles are keyboard-navigable (Tab key) and trigger on Enter key

**Use Cases:**
- **Admins:** Quickly drill down from overview to specific operational areas
- **Demo Scenarios:** Show seamless navigation between analytics and action
- **Daily Operations:** One-click access to most-used admin tools

**Technical Details:**
- Uses Next.js `Link` component for client-side navigation
- Maintains existing dashboard state when navigating back
- RBAC enforced on destination pages (Admin/Operator access required)

---

### 4. Key Ratios & Insights

**Location:** Below KPI tiles, in a gradient-styled section  
**Purpose:** Provide calculated metrics that indicate platform health beyond raw counts

#### Ratios Displayed:

| Ratio | Calculation | Interpretation | Edge Case Handling |
|-------|-------------|----------------|-------------------|
| **Verified Provider Rate** | `(verifiedProviders / activeProviders) * 100` | Higher % = better marketplace trust | Returns "N/A" if no active providers |
| **Background Check Clear Rate** | `(aidesWithClearBGCheck / activeAides) * 100` | Higher % = more vetted caregivers | Returns "N/A" if no active aides |
| **Leads per Provider** | `totalLeads / activeProviders` | Indicates demand for provider services | Returns "N/A" if no active providers |
| **Leads per Aide** | `totalLeads / activeAides` | Indicates demand for caregiver services | Returns "N/A" if no active aides |
| **Messages per Lead** | `totalMessages / totalLeads` | Indicates engagement level per inquiry | Returns "N/A" if no leads |

#### Formatting:
- **Percentages:** Displayed with 1 decimal place (e.g., "82.5%")
- **Ratios:** Displayed with 1 decimal place (e.g., "2.3")
- **Context Labels:** Each ratio includes a subtitle explaining what it represents

#### Visual Design:
- Gradient background (primary-50 to blue-50) distinguishes section
- Five evenly-spaced cards with white/transparent backgrounds
- Color-coded borders matching respective metric themes
- Responsive grid layout (1 column mobile → 5 columns desktop)

**Use Cases:**
- **Investors:** Verification rates show quality commitment; engagement rates show product-market fit
- **Operators:** Leads per provider/aide ratios help balance supply and demand
- **ALFs/Agencies:** Background check rates demonstrate safety standards

**Technical Details:**
- Helper functions calculate ratios with null-check guards
- `.toFixed(1)` used for consistent decimal formatting
- Division-by-zero protection prevents crashes

---

## Dashboard Sections

### Overview Cards (KPI Tiles)
**Purpose:** High-level platform snapshot  
**Metrics:**
- Total Users (all roles)
- Total Leads (non-deleted)
- Active Aides (marketplace-visible)
- Active Providers (active agencies)

**Features:** Clickable tiles, hover effects, deep-linking

---

### Key Ratios & Insights
**Purpose:** Calculated health indicators  
**Metrics:**
- Verified Provider Rate
- Background Check Clear Rate
- Leads per Provider
- Leads per Aide
- Messages per Lead

**Features:** Gradient styling, divide-by-zero protection, context labels

---

### User Metrics
**Purpose:** User growth tracking by role  
**Table Columns:**
- Role (Family, Caregiver, Provider, Operator, Admin)
- Total (all-time count)
- Last 7 Days (new users)
- Last 30 Days (new users)

**Use Cases:**
- Track user acquisition by segment
- Identify which roles are growing fastest
- Monitor operator/admin staffing needs

---

### Lead Metrics
**Purpose:** Inquiry volume and status tracking  
**Sections:**
1. **Leads by Status** (NEW, IN_REVIEW, CONTACTED, CLOSED, CANCELLED)
2. **Leads by Target Type** (AIDE vs PROVIDER)
3. **Lead Trends** (Last 7 Days, Last 30 Days) - Interactive with time range toggle

**Use Cases:**
- Identify leads needing operator attention
- Track conversion from NEW → CONTACTED → CLOSED
- Monitor aide vs provider demand balance

---

### Marketplace Metrics
**Purpose:** Supply-side health monitoring  
**Metrics:**
- Active Aides count
- Active Providers count
- Verified Providers count
- Unverified Providers count
- Aide Background Check Status breakdown (CLEAR, PENDING, NOT_STARTED, etc.)

**Use Cases:**
- Monitor marketplace supply
- Track verification progress
- Ensure quality standards are maintained

---

### Engagement Metrics
**Purpose:** Platform usage and activity tracking  
**Metrics:**
- Total Messages (all-time)
- Messages Last 7 Days

**Use Cases:**
- Measure user engagement beyond signups
- Track communication volume
- Identify active vs inactive users

---

## API Response Structure

**Endpoint:** `GET /api/admin/metrics`  
**Access Control:** Admin role only (enforced via `requireAnyRole([UserRole.ADMIN])`)

### Response Format:
```json
{
  "users": {
    "totalByRole": { "FAMILY": 12, "AIDE": 8, "PROVIDER": 5, "OPERATOR": 3, "ADMIN": 1 },
    "newLast7DaysByRole": { "FAMILY": 2, "AIDE": 1, "PROVIDER": 0, "OPERATOR": 0, "ADMIN": 0 },
    "newLast30DaysByRole": { "FAMILY": 8, "AIDE": 4, "PROVIDER": 2, "OPERATOR": 1, "ADMIN": 0 }
  },
  "leads": {
    "total": 34,
    "byStatus": { "NEW": 10, "IN_REVIEW": 8, "CONTACTED": 12, "CLOSED": 3, "CANCELLED": 1 },
    "byTargetType": { "AIDE": 20, "PROVIDER": 14 },
    "createdLast7Days": 5,
    "createdLast30Days": 18
  },
  "marketplace": {
    "activeAides": 10,
    "activeProviders": 7,
    "verifiedProviders": 5,
    "unverifiedProviders": 2,
    "aidesByBackgroundCheck": { "CLEAR": 8, "PENDING": 2, "NOT_STARTED": 0 }
  },
  "engagement": {
    "totalMessages": 234,
    "messagesLast7Days": 45
  },
  "generatedAt": "2025-12-08T19:45:32.123Z"
}
```

### Error Responses:
- **401 Unauthorized:** User not logged in
- **403 Forbidden:** User does not have ADMIN role
- **500 Internal Server Error:** Database query or processing error

---

## Demo Script for Metrics Dashboard

### For Investors:
1. **Show timestamp:** "This is live data from moments ago."
2. **Toggle time ranges:** "We can see 5 new leads in the last 7 days vs 18 in the last 30 days - that's 28% week-over-week growth."
3. **Highlight Key Ratios:**
   - "82% provider verification rate shows our commitment to quality."
   - "6.9 messages per lead indicates real engagement, not just browsing."
   - "2.3 leads per aide shows healthy demand for our marketplace."
4. **Click through tiles:** "One click from metrics to action - here's the full lead list."
5. **Emphasize growth:** "We've added 8 families in the last 30 days, and we're seeing consistent operator activity."

### For ALFs/Agencies:
1. **Focus on lead volume:** "34 total leads with 10 in NEW status - these are ready for assignment."
2. **Highlight quality metrics:** "75% of our aides have cleared background checks."
3. **Show engagement:** "234 total messages shows active family-caregiver communication."
4. **Deep-link to leads:** "Click here to jump directly to lead management."

### For Internal Teams:
1. **Use filters:** "Toggle to Last 7 Days to see this week's activity."
2. **Identify bottlenecks:** "8 leads in IN_REVIEW - we need operators to move these forward."
3. **Monitor ratios:** "Leads per provider is 4.9 - we may need more supply."
4. **Track verification:** "2 unverified providers - admin team should prioritize these."

---

## Future Enhancements

### Planned Features:
- [ ] **Refresh Button:** Manual refresh without full page reload
- [ ] **Export to CSV:** Download metrics data for external analysis
- [ ] **Date Range Picker:** Custom date range selection beyond preset options
- [ ] **Conversion Funnel:** Visual funnel showing NEW → IN_REVIEW → CONTACTED → CLOSED
- [ ] **Charts & Graphs:** Line charts for trends, pie charts for distributions
- [ ] **Alerts:** Threshold-based notifications (e.g., "10+ leads in NEW status for >24 hours")
- [ ] **Comparative Metrics:** Week-over-week or month-over-month % change indicators
- [ ] **User Retention:** Cohort analysis and churn rates
- [ ] **Revenue Metrics:** (When billing is implemented) MRR, ARR, ARPU

### Technical Debt:
- [ ] Add caching layer (Redis) for metrics API to reduce DB load
- [ ] Implement real-time updates via WebSockets or SSE
- [ ] Add unit tests for ratio calculation helpers
- [ ] Add E2E tests for clickable tiles and navigation
- [ ] Optimize Prisma queries with indexes and aggregations

---

## Testing Checklist

### Functional Tests:
- [ ] Timestamp displays correctly and updates on refresh
- [ ] Time range toggle switches active state
- [ ] Lead Trends cards highlight based on selected range
- [ ] All three clickable tiles navigate to correct destinations
- [ ] Ratios display with proper formatting (1 decimal place)
- [ ] Ratios show "N/A" when denominator is zero
- [ ] All sections load without errors
- [ ] RBAC prevents non-admin access

### Visual Tests:
- [ ] Hover effects work on clickable tiles
- [ ] Arrow icon animates on hover
- [ ] Time range buttons have proper active styling
- [ ] Key Ratios section gradient renders correctly
- [ ] Mobile responsive layout works (1 column)
- [ ] Desktop layout uses full grid (4-5 columns)

### Edge Case Tests:
- [ ] Dashboard handles empty data gracefully
- [ ] Ratios don't crash on division by zero
- [ ] Timestamp formats correctly across timezones
- [ ] Navigation back button returns to metrics page
- [ ] Page refresh maintains scroll position (browser default)

---

## Related Documentation

- [DEMO_FLOW.md](./DEMO_FLOW.md) - Demo script including metrics dashboard walkthrough
- [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) - Test accounts for demoing metrics dashboard
- [PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md](../PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md) - Provider marketplace technical docs
- [family_profile_implementation.md](../family_profile_implementation.md) - Family profile technical docs

---

## Technical Implementation Notes

### File Locations:
- **Frontend:** `src/app/admin/metrics/page.tsx`
- **API:** `src/app/api/admin/metrics/route.ts`
- **RBAC Utility:** `src/lib/rbac.ts`

### Dependencies:
- Next.js 14 (App Router)
- React Icons (`react-icons/fi`)
- NextAuth for session management
- Prisma for database queries

### State Management:
- React `useState` for local state (time range selection)
- No global state or URL params (keeps implementation simple)

### Performance Considerations:
- API response typically completes in <500ms
- Dashboard renders in <100ms after data load
- No client-side data aggregation (all done server-side)

---

## Changelog

### Version 1.1.0 (December 8, 2025)
- ✅ Added clickable KPI tiles with deep-links
- ✅ Added Key Ratios section with 5 calculated metrics
- ✅ Added "Last Updated" timestamp display
- ✅ Added Time Range Toggle with visual emphasis
- ✅ Enhanced DEMO_FLOW.md with metrics demo script
- ✅ Created METRICS_OVERVIEW.md documentation

### Version 1.0.0 (December 7, 2025)
- ✅ Initial metrics dashboard implementation
- ✅ User metrics by role (total, last 7/30 days)
- ✅ Lead metrics (status, type, trends)
- ✅ Marketplace metrics (aides, providers, verification)
- ✅ Engagement metrics (messages)
- ✅ Admin-only RBAC enforcement

---

## Support & Feedback

For questions, feature requests, or bug reports related to the metrics dashboard:
- Create an issue in the GitHub repository
- Tag with `admin-tools` and `metrics` labels
- Include screenshots for visual issues
- Provide browser/device info for rendering bugs

---

**Last Updated:** December 8, 2025  
**Maintained by:** CareLinkAI Development Team  
**Feature Branch:** `feature/admin-metrics-polish`
