# Operator MVP Testing Checklist

**Last Updated:** December 8, 2025  
**Branch:** feature/operator-final-polish  
**Purpose:** Verify all Operator MVP features are working correctly before merging to main

---

## Prerequisites

- [ ] Application is running locally or on staging environment
- [ ] Database has been seeded with test data (or use mock mode)
- [ ] You have Operator account credentials (or can register a new one)

---

## 1. Authentication & Access

### Sign In / Sign Up
- [ ] Can register a new Operator account at `/auth/register`
- [ ] Can sign in with Operator credentials
- [ ] After sign in, redirected to appropriate dashboard
- [ ] Session persists across page refreshes
- [ ] Can sign out successfully

### Role-Based Access
- [ ] Operator can access `/operator/*` routes
- [ ] Operator **cannot** access `/admin/*` routes (403 or redirect)
- [ ] Admin can access operator pages with scope filtering
- [ ] Non-operator users **cannot** access operator pages

---

## 2. Dashboard (`/operator`)

### Dashboard Overview
- [ ] KPI cards display correct data:
  - [ ] Total Homes count
  - [ ] Active Residents count
  - [ ] Open Inquiries count
  - [ ] Occupancy percentage
- [ ] KPI cards are clickable and deep-link to relevant pages
- [ ] Activity feed shows recent inquiries (last 5)
- [ ] Alerts section shows critical items (expiring licenses, pending actions)
- [ ] Quick action buttons work:
  - [ ] "Create Home" → `/operator/homes/new`
  - [ ] "View Inquiries" → `/operator/inquiries`
  - [ ] "Add Resident" → `/operator/residents/new`

### Loading & Empty States
- [ ] Loading states show while fetching data
- [ ] Empty states display when no data available
- [ ] No console errors

---

## 3. Home Management (`/operator/homes`)

### Home List
- [ ] All homes are displayed as cards
- [ ] Home cards show: name, location, care level, capacity
- [ ] "Add Home" button is visible and clickable
- [ ] Empty state shows if no homes exist
- [ ] Breadcrumbs show: Operator > Homes

### Create Home (`/operator/homes/new`)
- [ ] Form loads successfully
- [ ] All required fields are marked with asterisks
- [ ] Form validates on submit:
  - [ ] Name required
  - [ ] Address required
  - [ ] Care level required
  - [ ] Capacity must be a positive number
- [ ] Can upload photos (drag & drop or click)
- [ ] Can submit form successfully
- [ ] Success message/toast appears
- [ ] Redirected to home list or detail page

### Edit Home (`/operator/homes/[id]/edit`)
- [ ] Form loads with existing home data pre-filled
- [ ] Can edit all fields:
  - [ ] Name
  - [ ] Description
  - [ ] Address (street, city, state, zip)
  - [ ] Care level (multi-select)
  - [ ] Capacity
  - [ ] Pricing (monthly rate)
  - [ ] Status (DRAFT, ACTIVE, INACTIVE)
  - [ ] Gender restriction
  - [ ] Amenities
- [ ] Photo gallery management works:
  - [ ] Can upload new photos
  - [ ] Can delete existing photos (with confirmation)
  - [ ] Can reorder photos (drag & drop)
  - [ ] Can set primary photo
- [ ] Form validates on submit
- [ ] Success message appears after save
- [ ] Changes persist after page refresh

### Home Detail (`/operator/homes/[id]`)
- [ ] Home overview displays all details
- [ ] Photos display correctly
- [ ] Quick actions work:
  - [ ] "Edit Home"
  - [ ] "View Inquiries for this Home"
  - [ ] "Add Resident to this Home"
- [ ] Breadcrumbs show: Operator > Homes > [Home Name]

---

## 4. Inquiry Management (`/operator/inquiries`)

### Inquiry List
- [ ] All inquiries are displayed in table (desktop) or cards (mobile)
- [ ] Columns/fields show: Family Name, Home, Message, Status, Date
- [ ] Filter by status works (NEW, IN_REVIEW, CONTACTED, CLOSED, CANCELLED)
- [ ] Filter by home works (dropdown populated with operator's homes)
- [ ] Filter by date range works (start date, end date)
- [ ] Sort works (by date, by status)
- [ ] Pagination works (next/prev buttons, page numbers)
- [ ] Result count shows correctly
- [ ] Active filters display as chips/badges
- [ ] "Clear Filters" button works
- [ ] Empty state shows if no inquiries
- [ ] Loading state shows while fetching

### Inquiry Detail (`/operator/inquiries/[id]`)
- [ ] Inquiry details load correctly
- [ ] Shows family contact info (name, email, phone)
- [ ] Shows message from family
- [ ] Shows internal notes section
- [ ] Can update status via dropdown
- [ ] Status updates optimistically (immediate UI update)
- [ ] Can add internal notes
- [ ] Notes save successfully
- [ ] "Message Family" button works (deep-link to `/messages?userId=`)
- [ ] Family name is clickable and links to family profile (if applicable)
- [ ] Breadcrumbs show: Operator > Inquiries > [Inquiry ID]

### RBAC
- [ ] Operator can only see inquiries for their homes
- [ ] Admin can see all inquiries with scope filter

---

## 5. Resident Management (`/operator/residents`)

### Resident List
- [ ] All residents are displayed in table
- [ ] Columns show: Name, Status, Actions
- [ ] Search by name works
- [ ] Filter by status works (INQUIRY, PENDING, ACTIVE, DISCHARGED, DECEASED)
- [ ] Filter by home works
- [ ] Filter by family ID works
- [ ] "New Resident" button works
- [ ] "Export CSV" button works (downloads CSV file)
- [ ] Empty state shows if no residents
- [ ] Pagination works (if many residents)

### Create Resident (`/operator/residents/new`)
- [ ] Form loads successfully
- [ ] All fields are present:
  - [ ] First Name
  - [ ] Last Name
  - [ ] Date of Birth
  - [ ] Medical details (optional)
  - [ ] Home assignment
  - [ ] Family assignment (optional)
- [ ] Form validates on submit
- [ ] Can submit form successfully
- [ ] Success message appears
- [ ] Redirected to resident detail or list

### Resident Detail (`/operator/residents/[id]`)
- [ ] Resident details load correctly
- [ ] Shows personal info (name, DOB, status)
- [ ] Compliance panel shows compliance items
- [ ] Contacts panel shows contacts
- [ ] Documents panel shows documents
- [ ] **Timeline section shows events:**
  - [ ] Events display in chronological order (most recent first)
  - [ ] Event icons and colors are correct
  - [ ] Event descriptions are clear
  - [ ] Scheduled/completed timestamps show when applicable
  - [ ] "Load more" button works if many events
  - [ ] Empty state shows if no timeline events
  - [ ] Loading state shows while fetching
- [ ] **Notes section shows notes:**
  - [ ] Can add new note
  - [ ] Character count shows (max 1000)
  - [ ] Visibility dropdown works (Internal, Care Team, Family)
  - [ ] Notes display with author, timestamp, and content
  - [ ] Can edit own notes (edit button visible only for own notes)
  - [ ] Can delete own notes (delete button visible only for own notes)
  - [ ] Edit/delete require confirmation
  - [ ] Empty state shows if no notes
  - [ ] Loading state shows while fetching
- [ ] Assessments section works
- [ ] Incidents section works
- [ ] "Edit" link works
- [ ] "Open Summary PDF" link works
- [ ] Breadcrumbs show: Operator > Residents > [Resident Name]

### Edit Resident (`/operator/residents/[id]/edit`)
- [ ] Form loads with existing data (if implemented)
- [ ] Can edit fields
- [ ] Form validates and saves

---

## 6. Caregiver Management (`/operator/caregivers`)

### Caregiver Employment List
- [ ] All employment records are displayed in table
- [ ] Columns show: Caregiver Name, Email, Position, Start Date, End Date, Status
- [ ] Active employments show "Active" badge
- [ ] Ended employments show "Ended" badge
- [ ] "End Employment" button works for active employments
- [ ] "New Employment" button works
- [ ] Empty state shows if no employments
- [ ] Loading state shows while fetching

### Create Employment (`/operator/caregivers/new`)
- [ ] Form loads (if implemented)
- [ ] Can create new employment record

---

## 7. Shift Management (`/operator/shifts`)

### Shift List
- [ ] All shifts are displayed in table
- [ ] Columns show: Home, Start Time, End Time, Rate, Caregiver, Status
- [ ] Unassigned shifts show "—" for caregiver
- [ ] "Assign" button shows for unassigned shifts
- [ ] "Reassign" button shows for assigned shifts
- [ ] "Unassign" button works (removes caregiver from shift)
- [ ] "Create Shift" button works
- [ ] "Calendar" button works (if implemented)
- [ ] Empty state shows if no shifts
- [ ] Loading state shows while fetching

### Assign Shift (`/operator/shifts/[id]/assign`)
- [ ] Form loads with shift details
- [ ] Can select caregiver from dropdown
- [ ] Can submit assignment
- [ ] Success message appears
- [ ] Redirected to shift list

---

## 8. Analytics (`/operator/analytics`)

### Analytics Dashboard
- [ ] Occupancy chart displays (doughnut/pie chart)
- [ ] Inquiry funnel chart displays (bar chart)
- [ ] KPI cards show correct data
- [ ] Date range filter works (7d, 30d, 90d)
- [ ] Admin scope filter works (if admin user)
- [ ] "Export CSV" button works for inquiry funnel
- [ ] Charts update when filters change
- [ ] No console errors

---

## 9. Billing (`/operator/billing`)

### Billing Overview
- [ ] Payment history table displays
- [ ] Columns show: Date, Home, Family, Type, Amount, Status
- [ ] 30-day volume summary shows total and count
- [ ] MRR (Monthly Recurring Revenue) shows
- [ ] Admin scope filter works (if admin user)
- [ ] Empty state shows if no payments
- [ ] Loading state shows while fetching

---

## 10. Compliance (`/operator/compliance`)

### Compliance Overview
- [ ] Licenses list displays
- [ ] Shows: Home, License Type, Expiration Date, Status
- [ ] Expiring licenses highlighted (red/amber text)
- [ ] Can upload new license
- [ ] Can download license document
- [ ] Can delete license (with confirmation)
- [ ] Inspections list displays
- [ ] Shows: Home, Inspection Type, Date, Result
- [ ] Can upload new inspection
- [ ] Can download inspection document
- [ ] Can delete inspection (with confirmation)
- [ ] Empty state shows if no licenses/inspections
- [ ] Loading state shows while fetching

---

## 11. Profile Management (`/settings/operator`)

### Operator Profile
- [ ] Form loads with existing data
- [ ] Can edit:
  - [ ] Company Name
  - [ ] Tax ID
  - [ ] Business License Number
  - [ ] Contact Info (email, phone)
  - [ ] Operator Licenses
- [ ] Form validates on submit
- [ ] Success message appears after save
- [ ] Changes persist after page refresh

---

## 12. Messaging Integration

### Messaging from Operator Views
- [ ] "Message Family" button on inquiry detail deep-links to conversation
- [ ] Message button includes context (userId parameter)
- [ ] Conversation loads correctly in `/messages`
- [ ] Can send messages
- [ ] Can receive messages (real-time via SSE)
- [ ] Unread count badge works in header
- [ ] Message threads work

---

## 13. Navigation & Breadcrumbs

### Breadcrumbs
- [ ] Breadcrumbs display on all operator pages
- [ ] Breadcrumbs show correct path (Dashboard > Section > Detail)
- [ ] Breadcrumbs are clickable and navigate correctly
- [ ] Breadcrumbs update dynamically based on current page

### Navigation
- [ ] Dashboard quick-link cards work
- [ ] Header navigation works (if sidebar exists)
- [ ] Back buttons work (browser back or explicit back buttons)
- [ ] No dead-ends (all pages have a way back)

---

## 14. Mobile Responsiveness

### Mobile Testing (375px viewport)
- [ ] Inquiry list shows as cards (not table) on mobile
- [ ] Forms stack vertically and are usable
- [ ] Navigation works (hamburger menu if applicable)
- [ ] Touch interactions work (buttons, links)
- [ ] No horizontal scroll
- [ ] All buttons are touch-friendly (minimum 44px height)
- [ ] Images scale correctly
- [ ] Text is readable (not too small)

---

## 15. UX & Quality

### Empty States
- [ ] All list pages show proper empty states when no data
- [ ] Empty states include:
  - [ ] Icon
  - [ ] Descriptive title
  - [ ] Helpful description
  - [ ] CTA button (when applicable)

### Loading States
- [ ] All pages show loading indicators while fetching data
- [ ] Skeleton loaders or spinners appear
- [ ] Loading states are smooth (no flash of content)
- [ ] Loading states don't block user interaction unnecessarily

### Error Handling
- [ ] Form validation errors display inline
- [ ] API errors show user-friendly messages
- [ ] Error messages are clear and actionable
- [ ] No uncaught exceptions in console
- [ ] 404 pages work for invalid routes
- [ ] 403 pages work for unauthorized access

### Success Feedback
- [ ] Toast notifications appear for successful actions
- [ ] Success messages are clear
- [ ] Success messages auto-dismiss after a few seconds
- [ ] Optimistic updates work where applicable

### Consistency
- [ ] Visual consistency across all operator pages
- [ ] Form patterns are consistent
- [ ] Button styles are consistent
- [ ] Color usage is consistent
- [ ] Typography is consistent

---

## 16. RBAC Testing

### Operator User
- [ ] Can access all `/operator/*` routes
- [ ] Can only see their own homes, inquiries, residents
- [ ] Cannot access other operators' data
- [ ] Cannot access `/admin/*` routes

### Admin User
- [ ] Can access all `/operator/*` routes
- [ ] Can filter by operatorId on relevant pages:
  - [ ] Analytics
  - [ ] Billing
  - [ ] Inquiries (if scope filter exists)
- [ ] Can see all operators' data with filter
- [ ] Can access `/admin/*` routes

### Non-Operator User (Family, Caregiver, Provider)
- [ ] Cannot access `/operator/*` routes (403 or redirect)
- [ ] Error message is clear

---

## 17. Non-Regression Testing

### Other Roles/Features
- [ ] Aide marketplace works: `/marketplace/caregivers`
- [ ] Provider marketplace works: `/marketplace/providers`
- [ ] Family inquiry submission works
- [ ] Admin metrics works: `/admin/metrics`
- [ ] Messaging system works: `/messages`
- [ ] Authentication works: sign in/out

---

## 18. Performance Testing

### Basic Performance Checks
- [ ] Pages load in < 2 seconds
- [ ] No unnecessary re-renders (check React DevTools)
- [ ] Images are optimized (Next.js Image component used)
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Pagination loads quickly
- [ ] Filters respond quickly

---

## 19. Accessibility Testing

### Basic Accessibility Checks
- [ ] All interactive elements have ARIA labels or accessible names
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states are visible
- [ ] Color contrast is sufficient (WCAG AA)
- [ ] Screen reader friendly (test with VoiceOver/NVDA)
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced to screen readers

---

## 20. Automated Checks

### TypeScript & Linting
```bash
npm run type-check  # No TypeScript errors
npm run lint        # No linting errors
```

### Build
```bash
npm run build       # Build succeeds without errors
```

### Browser Console
- [ ] No console errors
- [ ] No console warnings (or only expected warnings)
- [ ] No network errors (except expected 404s for mock data)

---

## Summary

**Total Checks:** ~250+  
**Critical Checks:** Marked with ✅ in sections 1-12  
**Nice-to-Have:** Sections 13-20

---

## Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Result:** ⬜ PASS  ⬜ FAIL  ⬜ PARTIAL  
**Notes:** ___________________

---

## Known Issues / Limitations

*Document any known issues or limitations discovered during testing:*

1. 
2. 
3. 

---

## Next Steps

- [ ] Fix any critical issues found during testing
- [ ] Update documentation based on test results
- [ ] Merge branch to main
- [ ] Deploy to production
- [ ] Monitor for issues post-deployment
