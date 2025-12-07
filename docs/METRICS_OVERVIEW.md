# CareLinkAI Metrics Overview

## Introduction

This document provides a comprehensive overview of the analytics and metrics system implemented in CareLinkAI. The metrics dashboard gives administrators visibility into platform usage, growth trends, and key performance indicators.

## Access

**URL:** `/admin/metrics`

**Permission Required:** ADMIN role only

Non-admin users will be redirected to the dashboard if they attempt to access this page.

## Available Metrics

### 1. User Metrics

These metrics track user growth and distribution across different roles in the platform.

#### Total Users by Role
- **Description:** Count of all registered users, broken down by role
- **Roles Tracked:**
  - FAMILY: Family members searching for care
  - CAREGIVER: Individual caregivers/aides
  - PROVIDER: Service provider organizations
  - OPERATOR: Assisted living facility operators
  - ADMIN: Platform administrators
  - STAFF: Platform staff members
  - AFFILIATE: Affiliate partners

#### New Users (Last 7 Days)
- **Description:** Number of new user registrations in the past 7 days, by role
- **Use Case:** Track recent growth and identify which user types are signing up most frequently

#### New Users (Last 30 Days)
- **Description:** Number of new user registrations in the past 30 days, by role
- **Use Case:** Monitor monthly growth trends and compare to previous periods

### 2. Lead/Inquiry Metrics

These metrics track the inquiry pipeline from families seeking care services.

#### Total Leads
- **Description:** Total number of active (non-deleted) leads in the system
- **Note:** Excludes soft-deleted leads

#### Leads by Status
Breakdown of leads by their current status:
- **NEW:** Recently created, not yet reviewed
- **IN_REVIEW:** Being reviewed by operators
- **CONTACTED:** Family has been contacted
- **CLOSED:** Lead successfully resolved
- **CANCELLED:** Lead cancelled or abandoned

**Use Case:** Identify bottlenecks in the lead follow-up process

#### Leads by Target Type
Distribution of leads by service type:
- **AIDE:** Inquiries about individual caregivers
- **PROVIDER:** Inquiries about service provider organizations

**Use Case:** Understand which services are in higher demand

#### Leads Created (Last 7 Days)
- **Description:** Number of new leads created in the past week
- **Use Case:** Track lead generation velocity

#### Leads Created (Last 30 Days)
- **Description:** Number of new leads created in the past month
- **Use Case:** Monitor monthly lead volume trends

### 3. Marketplace Metrics

These metrics provide insights into the supply side of the marketplace.

#### Active Aides
- **Description:** Number of caregivers/aides who are visible in the marketplace
- **Criteria:** `isVisibleInMarketplace = true`
- **Use Case:** Ensure adequate supply of caregivers

#### Active Providers
- **Description:** Number of service provider organizations currently active
- **Criteria:** `isActive = true`
- **Use Case:** Monitor provider engagement

#### Verified Providers
- **Description:** Number of providers who have completed verification
- **Criteria:** `isVerified = true`
- **Use Case:** Track verification progress and quality

#### Unverified Providers
- **Description:** Number of providers awaiting verification
- **Criteria:** `isVerified = false`
- **Use Case:** Identify verification backlog

#### Aide Background Check Status
Breakdown of caregivers by background check status:
- **NOT_STARTED:** Background check not initiated
- **PENDING:** Check in progress
- **CLEAR:** Passed background check
- **CONSIDER:** Results require review
- **EXPIRED:** Previous clearance has expired
- **FAILED:** Did not pass background check

**Use Case:** Monitor compliance and identify caregivers needing attention

### 4. Engagement Metrics

These metrics track user interaction and platform activity.

#### Total Messages
- **Description:** Total number of messages sent through the platform
- **Use Case:** Measure overall platform engagement

#### Messages (Last 7 Days)
- **Description:** Number of messages sent in the past week
- **Use Case:** Track recent activity levels and engagement trends

## Dashboard Sections

The admin metrics dashboard is organized into the following sections:

### Overview Cards
Four prominent cards showing key totals:
- Total Users (all roles combined)
- Total Leads
- Active Aides
- Active Providers

### User Metrics Section
- Table showing users by role with growth indicators
- Columns: Role, Total, Last 7 Days, Last 30 Days

### Lead Metrics Section
- Cards showing leads by status
- Cards showing leads by target type
- Trend indicators (7-day and 30-day lead creation)

### Marketplace Metrics Section
- Cards for active aides and providers
- Verification status breakdown
- Background check status grid for aides

### Engagement Metrics Section
- Total messages count
- Recent message activity (last 7 days)

## API Endpoint

### GET /api/admin/metrics

**Authentication:** Required (NextAuth session)

**Authorization:** ADMIN role only

**Response Format:**
```json
{
  "users": {
    "totalByRole": {
      "FAMILY": 12,
      "CAREGIVER": 8,
      "PROVIDER": 5,
      "OPERATOR": 3,
      "ADMIN": 2
    },
    "newLast7DaysByRole": {
      "FAMILY": 3,
      "CAREGIVER": 2
    },
    "newLast30DaysByRole": {
      "FAMILY": 8,
      "CAREGIVER": 5,
      "PROVIDER": 2
    }
  },
  "leads": {
    "total": 34,
    "byStatus": {
      "NEW": 10,
      "IN_REVIEW": 8,
      "CONTACTED": 12,
      "CLOSED": 3,
      "CANCELLED": 1
    },
    "byTargetType": {
      "AIDE": 20,
      "PROVIDER": 14
    },
    "createdLast7Days": 12,
    "createdLast30Days": 28
  },
  "marketplace": {
    "activeAides": 10,
    "activeProviders": 7,
    "verifiedProviders": 5,
    "unverifiedProviders": 2,
    "aidesByBackgroundCheck": {
      "CLEAR": 8,
      "PENDING": 2
    }
  },
  "engagement": {
    "totalMessages": 234,
    "messagesLast7Days": 45
  },
  "generatedAt": "2025-12-07T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User lacks ADMIN role
- `500 Internal Server Error`: Server-side error

## Performance Considerations

The metrics API uses efficient Prisma aggregation queries:
- `groupBy()` for categorical breakdowns
- `count()` for totals
- Date filtering at the database level

**Query Efficiency:**
- All queries use database indexes
- No data is loaded into memory unnecessarily
- Aggregations are performed by the database engine

**Typical Response Time:** < 500ms (depends on database size)

## Interpreting the Metrics

### Growth Indicators
- Compare 7-day vs 30-day new users to identify acceleration/deceleration
- Monitor which roles are growing fastest

### Lead Health
- High "NEW" count → need more operator capacity
- Low "CLOSED" rate → review follow-up processes
- AIDE vs PROVIDER ratio → understand demand patterns

### Marketplace Supply
- Low active aides/providers → recruitment needed
- High unverified providers → verification bottleneck
- Background check "PENDING" → follow up on checks

### Engagement
- Messages per user (total messages / total users) → engagement depth
- Rising recent messages → healthy activity
- Flat message count → investigate barriers to communication

## Security & Privacy

- **No PII Exposed:** All metrics are aggregate counts only
- **RBAC Enforced:** Strict admin-only access
- **Audit Logging:** All metrics requests are logged
- **Soft Deletes Respected:** Deleted leads are excluded from counts

## Future Enhancements

Potential additions to the metrics system:

1. **Event Logging System**
   - Real-time activity feed
   - Audit trail for key actions

2. **Time Series Data**
   - Historical trend charts
   - Week-over-week / month-over-month comparisons

3. **Conversion Funnels**
   - Lead-to-hire conversion rates
   - Registration-to-active user rates

4. **Cohort Analysis**
   - User retention by signup period
   - Lead quality by source

5. **Export Functionality**
   - CSV/Excel export
   - Scheduled email reports

6. **Custom Date Ranges**
   - User-selectable date filters
   - Comparison between arbitrary periods

7. **Provider Performance**
   - Average response times
   - Lead-to-customer conversion by provider

8. **Financial Metrics**
   - Revenue tracking
   - Payment processing metrics

## Troubleshooting

### Dashboard shows "Loading..." indefinitely
- Check browser console for API errors
- Verify user has ADMIN role
- Ensure `/api/admin/metrics` is accessible

### Metrics appear incorrect
- Verify database connection
- Check for soft-deleted records
- Review Prisma query logic

### Access denied errors
- Confirm user role is ADMIN
- Check NextAuth session validity
- Review RBAC implementation

## Related Documentation

- [RBAC Implementation](../src/lib/auth/rbac.ts)
- [Provider MVP Summary](../PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md)
- [Family Lead Schema](../family_leads_schema_design.md)
- [Demo Flow](./DEMO_FLOW.md)

## Changelog

### v1.0.0 (December 2025)
- Initial metrics dashboard implementation
- User, Lead, Marketplace, and Engagement metrics
- ADMIN-only access with RBAC enforcement
- Efficient Prisma aggregation queries
- Responsive UI with overview cards and detailed sections
