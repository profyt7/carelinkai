# Admin Tools Documentation

## Overview

The Admin Tools page at `/admin/tools` provides a clean, purposeful MVP admin control panel for CareLinkAI administrators. This page is restricted to users with the `ADMIN` role and provides access to essential administrative functions.

## Access Control

- **Route**: `/admin/tools`
- **RBAC**: Admin role only (`UserRole.ADMIN`)
- **Unauthorized Behavior**: Redirects to `/dashboard`
- **Unauthenticated Behavior**: Redirects to `/auth/login`
- **Sidebar Visibility**: "Admin Tools" link only appears for users with ADMIN role

## Available Tools

### 1. Admin Metrics & Analytics ⭐

**Purpose**: Access comprehensive platform metrics and analytics.

**Features**:
- Prominent card with visual distinction (gradient background, larger icon)
- Direct link to `/admin/metrics` page
- Displays:
  - User growth by role
  - Lead metrics (total, by status, by target type)
  - Marketplace activity (active aides, verified providers)
  - Engagement metrics (messages, response times)
  - Key ratios (verified provider rate, leads per provider, etc.)

**Navigation**: Click anywhere on the card to navigate to the full metrics dashboard.

---

### 2. Demo Data (Mock Mode)

**Purpose**: Enable/disable demo data across the application for product walkthroughs and testing.

**Features**:
- **Enable/Disable Toggle**: Sets a secure HttpOnly cookie (`carelink_mock_mode`) valid for 7 days
- **Generate Demo Data**: Triggers `/api/admin/seed-demo` to create demo residents and homes
- **Status Display**: Shows current mock mode state (Enabled/Disabled)
- **URL Parameter**: Can also be toggled by appending `?mock=1` to any page URL

**API Endpoints**:
- `GET /api/mock-mode?on={0|1}` - Toggle mock mode
- `POST /api/admin/seed-demo` - Generate demo data

**Use Cases**:
- Product demos and walkthroughs
- Testing marketplace features with realistic data
- Development and QA environments

**Limitations**:
- Demo data seeding may be disabled in production environments
- Mock mode affects marketplace listings and search results

---

### 3. Email & Notifications

**Purpose**: Test email delivery system and verify email configuration.

**Features**:
- **Send Test Email**: Simple form to send a test email to any address
- **System Emails**: Automatic handling of transactional emails (password reset, verification, appointment confirmations)
- **Status Feedback**: Success/error messages for email delivery

**API Endpoint**:
- `POST /api/email/send` - Send test email

**Email Types Handled Automatically**:
- User registration and verification
- Password reset
- Appointment confirmations
- Document sharing notifications
- System notifications

**Note**: The simplified email tool replaced the previous complex EmailDemo component with 6 tabs. For advanced email testing, developers can use the email API directly.

---

### 4. System & Access Management

**Purpose**: Overview of system configuration and access control.

**Current Status**: Coming Soon

**Planned Features** (not yet implemented):
- UI-based user role management
- Permission assignment interface
- Feature flag toggles
- System settings configuration

**Current Implementation**:
- **User Roles & RBAC**: Configured via code and database
- **Feature Flags**: Managed through environment variables
- **Access Control**: Enforced at API and page level through middleware

**Where to Configure**:
- User roles: Database (`User.role` field)
- RBAC: Code-based authorization checks in API routes and pages
- Feature flags: Environment variables (`.env`)

---

## Implementation Details

### Page Structure

The Admin Tools page uses a clean card-based layout:

```tsx
<DashboardLayout title="Admin Tools">
  {/* Header with access restriction badge */}
  <div className="mb-8">
    <h1>Admin Tools</h1>
    <p>Essential administrative tools and utilities</p>
    <Badge>Restricted Area • Administrators Only</Badge>
  </div>

  {/* Cards */}
  <div className="grid grid-cols-1 gap-6">
    {/* 1. Prominent Metrics Card (Link) */}
    <Link href="/admin/metrics">...</Link>

    {/* 2. Demo Data Card */}
    <div>...</div>

    {/* 3. Email Card */}
    <div>...</div>

    {/* 4. System Management Card */}
    <div>...</div>
  </div>
</DashboardLayout>
```

### RBAC Implementation

**Page-Level Protection**:
```tsx
useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/auth/login");
    return;
  }
  const hasAccess = session?.user?.role === UserRole.ADMIN;
  if (!hasAccess) {
    router.push("/dashboard");
  }
}, [session, status, router]);
```

**Sidebar Visibility**:
```tsx
{
  name: "Admin Tools",
  href: "/admin/tools",
  roleRestriction: ["ADMIN"]
}
```

### State Management

The page uses React hooks for state management:
- `mockEnabled`: Demo mode status (boolean | null)
- `mockLoading`: Loading state for mock mode operations
- `seedLoading`: Loading state for demo data generation
- `emailLoading`: Loading state for email operations
- Error states: `mockError`, `seedError`, `emailError`
- Result states: `seedResult`, `emailResult`

---

## Testing

### As Admin User

1. **Navigate to Admin Tools**:
   - Login as admin user (email: `admin@carelinkai.com`)
   - Click "Admin Tools" in sidebar
   - Verify page loads with all 4 cards

2. **Test Admin Metrics Link**:
   - Click on "Admin Metrics & Analytics" card
   - Should navigate to `/admin/metrics`
   - Verify metrics page displays data

3. **Test Demo Data Controls**:
   - Click "Enable" to enable mock mode
   - Verify status changes to "Enabled"
   - Click "Generate Demo Data"
   - Verify success message appears
   - Navigate to marketplace and verify demo data appears
   - Click "Disable" to turn off mock mode

4. **Test Email System**:
   - Enter a test email address
   - Click "Send Test Email"
   - Verify success message
   - Check email inbox for test email

### As Non-Admin User

1. **Verify Access Restriction**:
   - Login as non-admin user (e.g., `family@carelinkai.com`)
   - Verify "Admin Tools" link does NOT appear in sidebar
   - Try to navigate directly to `/admin/tools`
   - Should be redirected to `/dashboard`

### As Unauthenticated User

1. **Verify Login Required**:
   - Logout completely
   - Navigate to `/admin/tools`
   - Should be redirected to `/auth/login`

---

## Troubleshooting

### Mock Mode Not Working

**Problem**: Mock mode toggle doesn't change status.

**Solutions**:
1. Check browser cookies - clear `carelink_mock_mode` cookie
2. Verify `/api/mock-mode` endpoint is accessible
3. Check admin role permissions
4. Verify database connection

### Demo Data Generation Fails

**Problem**: "Generate Demo Data" button shows error.

**Solutions**:
1. Check if endpoint is disabled in production (`NODE_ENV=production`)
2. Verify database connection and permissions
3. Check Prisma schema for required models (Home, Resident, etc.)
4. Review server logs for detailed error messages

### Email Test Fails

**Problem**: Test email fails to send.

**Solutions**:
1. Verify email service configuration (SendGrid, SMTP)
2. Check environment variables:
   - `SENDGRID_API_KEY` (if using SendGrid)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (if using SMTP)
3. Check rate limits on email service
4. Verify email API endpoint `/api/email/send` is accessible

### Admin Tools Link Not Visible

**Problem**: Admin user doesn't see "Admin Tools" in sidebar.

**Solutions**:
1. Verify user role is exactly `ADMIN` (case-sensitive)
2. Check `DashboardLayout.tsx` role restriction configuration
3. Clear session and re-login
4. Verify JWT token includes correct role claim

---

## Future Enhancements

### Planned Features

1. **User Management UI**:
   - List all users with pagination
   - Edit user roles and permissions
   - Bulk user operations
   - User activity logs

2. **Feature Flag Management**:
   - Toggle feature flags via UI
   - Schedule feature rollouts
   - A/B testing controls

3. **System Health Dashboard**:
   - Real-time system metrics
   - Database performance stats
   - API response times
   - Error rate monitoring

4. **Advanced Email Tools**:
   - Email template editor
   - Bulk email campaigns
   - Email delivery tracking
   - Bounce/complaint handling

5. **Backup & Restore**:
   - Database backup controls
   - Automated backup scheduling
   - One-click restore functionality

6. **Audit Logs**:
   - View all admin actions
   - Filter by user, date, action type
   - Export audit reports

---

## Related Documentation

- [Admin Metrics Dashboard](./admin_metrics.md)
- [Mock Data System](../MOCK_DATA_SYSTEM.md)
- [Email System](./email_system.md)
- [RBAC Implementation](./rbac.md)
- [Persona Dashboards](./DASHBOARDS_OVERVIEW.md)

---

## Changelog

### December 8, 2024 - MVP Cleanup
- **Refactored Admin Tools page** to 4 focused, purposeful cards
- **Added prominent Admin Metrics & Analytics card** with direct link to `/admin/metrics`
- **Simplified Email & Notifications** from 6-tab complex UI to single test form
- **Removed misleading "Coming Soon" cards** (User Management, System Settings, Data Management, Security Controls, Administration Documentation)
- **Consolidated system info** into single "System & Access Management" card
- **Updated RBAC** to restrict to ADMIN role only (removed STAFF)
- **Improved UI/UX** with gradient backgrounds, better visual hierarchy, and clearer calls-to-action

### Previous Versions
- Original implementation with 6 admin tool cards (many non-functional)
- Complex EmailDemo component with 6 tabs
- Mixed admin/staff access permissions
