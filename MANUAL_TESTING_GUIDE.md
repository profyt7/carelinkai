# Manual Testing Guide - Pipeline Dashboard

## Prerequisites
- Browser: Chrome, Firefox, or Safari
- Login credentials: OPERATOR or ADMIN role
- Developer Tools open (F12) - Console tab
- Deployment URL: https://carelinkai.onrender.com

---

## Quick Test (5 minutes)

This quick test validates the core functionality of the Pipeline Dashboard.

### Test 1: Access Dashboard ✅
**Steps:**
1. Go to: https://carelinkai.onrender.com/operator/inquiries/pipeline
2. You should be redirected to login page
3. Login with OPERATOR or ADMIN credentials
4. You should be redirected back to pipeline dashboard

**Expected Results:**
- ✅ Login redirect works correctly
- ✅ Pipeline dashboard page loads without errors
- ✅ Analytics cards display at top (Total Inquiries, New This Week, etc.)
- ✅ Kanban view displays with all stages (NEW, CONTACTED, QUALIFIED, etc.)
- ✅ No console errors in browser DevTools

**Check Console:**
- Open DevTools (F12) → Console tab
- Should see no red errors
- WebSocket connection may show (optional feature)

---

### Test 2: View Existing Inquiries ✅
**Steps:**
1. Look at the Kanban board columns
2. Check if any inquiry cards are displayed
3. Verify card information is visible

**Expected Results:**
- ✅ Inquiry cards display in appropriate stage columns
- ✅ Each card shows: Contact name, care recipient, urgency badge
- ✅ Urgency colors work: RED (Urgent), ORANGE (High), YELLOW (Medium), GREEN (Low)
- ✅ Cards are styled properly with hover effects

---

### Test 3: Create New Inquiry ✅
**Steps:**
1. Click "New Inquiry" button (top right)
2. Fill out the form with test data:
   - **Contact Name:** Test User
   - **Contact Email:** test@example.com
   - **Contact Phone:** +15551234567
   - **Care Recipient Name:** Test Recipient
   - **Care Recipient Age:** 75
   - **Care Needs:** Select "Memory Care"
   - **Urgency:** Select "HIGH"
   - **Source:** Select "WEBSITE"
   - **Preferred Contact:** Select "EMAIL"
   - **Additional Info:** "Test inquiry from manual testing"
3. Click "Create Inquiry"

**Expected Results:**
- ✅ Form validation works (required fields highlighted if missing)
- ✅ Submit button disables during submission
- ✅ Toast notification appears: "Inquiry created successfully"
- ✅ New inquiry card appears in "NEW" stage
- ✅ Modal closes automatically

**If Fails:**
- Check console for errors
- Verify all required fields are filled
- Check network tab for API response

---

### Test 4: Open Inquiry Details ✅
**Steps:**
1. Find the inquiry you just created (should be in NEW stage)
2. Click on the inquiry card

**Expected Results:**
- ✅ Modal opens showing inquiry details
- ✅ Overview tab displays all inquiry information
- ✅ Tabs are visible: Overview, Communication, Follow-ups, Activity
- ✅ Close button (X) works
- ✅ Can close by clicking outside modal

---

### Test 5: Navigate Inquiry Tabs ✅
**Steps:**
1. Open an inquiry detail modal (from Test 4)
2. Click on "Communication" tab
3. Click on "Follow-ups" tab
4. Click on "Activity" tab
5. Click back to "Overview" tab

**Expected Results:**
- ✅ Each tab switches correctly
- ✅ Tab content displays (may be empty for new inquiries)
- ✅ Active tab is highlighted
- ✅ No errors in console

---

### Test 6: Filters & Search ✅
**Steps:**
1. In the search box (top of pipeline), type the contact name from your test inquiry
2. Click "Clear All Filters" button

**Expected Results:**
- ✅ Search filters inquiries in real-time
- ✅ Only matching inquiries display
- ✅ "Clear All Filters" resets the view
- ✅ All inquiries reappear

---

## Comprehensive Test (30 minutes)

For thorough testing of all features.

---

## Feature Checklist

### 🎨 UI/UX Features
- [ ] Page loads without errors
- [ ] Responsive design works on different screen sizes
- [ ] Colors and styling are consistent
- [ ] Buttons have hover effects
- [ ] Loading states display during API calls
- [ ] Toast notifications appear and dismiss correctly
- [ ] Modals open and close smoothly
- [ ] Icons display correctly

### 📊 Analytics Cards
- [ ] Total Inquiries count is accurate
- [ ] New This Week displays correct number
- [ ] Requires Attention shows inquiries with follow-ups due
- [ ] Conversion Rate calculates correctly
- [ ] Pending Follow-ups count is accurate

### 📋 Kanban View
- [ ] All stages display: NEW, CONTACTED, QUALIFIED, TOURING, OFFER, CLOSED_WON, CLOSED_LOST
- [ ] Inquiry cards display in correct stages
- [ ] Cards show all relevant information
- [ ] Urgency badges work (colors and labels)
- [ ] Empty stages show "No inquiries" message
- [ ] Horizontal scrolling works if needed

### 🔍 Search & Filters
- [ ] Search by contact name works
- [ ] Search by email works
- [ ] Search by care recipient name works
- [ ] Urgency filter works (All, LOW, MEDIUM, HIGH, URGENT)
- [ ] Stage filter works
- [ ] Source filter works
- [ ] Filters can be combined
- [ ] Clear all filters resets to default view

### ➕ Create New Inquiry
- [ ] "New Inquiry" button opens modal
- [ ] Form displays all fields correctly
- [ ] Required field validation works
- [ ] Email format validation works
- [ ] Phone format validation works
- [ ] Age validation works (must be a number)
- [ ] Care needs multi-select works
- [ ] Submit button disables during submission
- [ ] Success toast appears on creation
- [ ] New inquiry appears in pipeline immediately
- [ ] Modal closes after successful creation

### 📝 Inquiry Detail Modal
- [ ] Modal opens when clicking inquiry card
- [ ] Close button (X) works
- [ ] Click outside modal to close works
- [ ] All inquiry information displays correctly
- [ ] Tabs are clickable and functional

#### Overview Tab
- [ ] Contact information displays
- [ ] Care recipient information displays
- [ ] Care needs list displays
- [ ] Urgency badge shows
- [ ] Source displays
- [ ] Additional info shows (if provided)
- [ ] Created/Updated timestamps display

#### Communication Tab
- [ ] Previous responses display (if any)
- [ ] Response type badges work
- [ ] Channel badges work (EMAIL, SMS, PHONE)
- [ ] Timestamps display correctly
- [ ] "No responses yet" message shows for new inquiries

#### Follow-ups Tab
- [ ] Scheduled follow-ups display (if any)
- [ ] Follow-up type badges work
- [ ] Status badges work (PENDING, SENT, COMPLETED, CANCELLED, OVERDUE)
- [ ] Overdue follow-ups are highlighted in red
- [ ] "Schedule Follow-up" button works
- [ ] "No follow-ups yet" message shows for new inquiries

#### Activity Tab
- [ ] Activity log displays (if any)
- [ ] Activity entries show timestamps
- [ ] Activity types display correctly
- [ ] "No activity yet" message shows for new inquiries

### 🤖 AI Response Generator
- [ ] "Generate AI Response" button exists
- [ ] Modal opens when clicked
- [ ] Response type selection works (EMAIL, SMS, PHONE_SCRIPT)
- [ ] Template preview generates
- [ ] Edit functionality allows customization
- [ ] "Send" button works (requires SMTP config)
- [ ] "Save as Draft" works
- [ ] Error handling works if OpenAI API not configured

### 📅 Follow-ups Management
- [ ] "Schedule Follow-up" button works
- [ ] Modal opens with form
- [ ] Follow-up type selection works
- [ ] Date/time picker works
- [ ] Subject field validates
- [ ] Content field validates
- [ ] Schedule button creates follow-up
- [ ] New follow-up appears in list
- [ ] Mark complete button works
- [ ] Cancel button works
- [ ] Completed follow-ups are styled differently

### 🎯 Stage Management
- [ ] Inquiry can be moved between stages
- [ ] Stage update saves to database
- [ ] Toast notification confirms stage change
- [ ] Analytics update after stage change
- [ ] Inquiry position updates in Kanban

### 📱 Mobile Responsiveness
- [ ] Dashboard works on mobile (< 768px width)
- [ ] Kanban scrolls horizontally on mobile
- [ ] Modals are full-screen on mobile
- [ ] All buttons are tappable (44x44px minimum)
- [ ] Touch gestures work
- [ ] Forms are usable on mobile
- [ ] Analytics cards stack vertically on mobile

### 🔐 Security & Permissions
- [ ] Unauthenticated users are redirected to login
- [ ] OPERATOR role can access dashboard
- [ ] ADMIN role can access dashboard
- [ ] FAMILY role cannot access (should be blocked)
- [ ] CAREGIVER role cannot access (should be blocked)

---

## What to Look For

### ✅ Good Signs
- Fast page load (< 3 seconds)
- Smooth animations
- No console errors
- Data loads correctly
- Toast notifications appear
- All buttons respond to clicks
- Forms validate input
- Modals open/close smoothly

### ❌ Issues to Report
- Console errors (F12 → Console)
- Network errors (F12 → Network)
- Blank pages or loading states that don't finish
- Buttons that don't respond
- Forms that don't submit
- Data that doesn't display
- UI elements that overlap or look broken
- Slow performance (> 5 seconds to load)

---

## Troubleshooting

### Issue: Page doesn't load
**Check:**
- Network connection
- Console for errors
- Network tab for failed requests
- URL is correct

### Issue: Can't login
**Check:**
- Credentials are correct
- User role is OPERATOR or ADMIN
- Session hasn't expired

### Issue: New inquiry doesn't appear
**Check:**
- Console for errors
- Network tab for API response
- Refresh the page
- Check if validation failed

### Issue: AI Response doesn't generate
**Check:**
- OpenAI API key is configured (admin check)
- Console for errors
- Error message in UI

### Issue: Email doesn't send
**Check:**
- SMTP is configured (admin check)
- Network tab for API call
- Error message in toast notification

---

## Test Report Template

**Test Date:** ___________  
**Tester Name:** ___________  
**Browser:** ___________  
**Screen Size:** ___________  

### Quick Test Results (✅/❌)
- [ ] Test 1: Access Dashboard
- [ ] Test 2: View Existing Inquiries
- [ ] Test 3: Create New Inquiry
- [ ] Test 4: Open Inquiry Details
- [ ] Test 5: Navigate Inquiry Tabs
- [ ] Test 6: Filters & Search

### Issues Found
1. **Issue Title:**
   - **Severity:** Critical / High / Medium / Low
   - **Description:** 
   - **Steps to Reproduce:**
   - **Expected Behavior:**
   - **Actual Behavior:**
   - **Screenshots:** (if applicable)

2. **Issue Title:**
   - ...

### Overall Status
- [ ] ✅ PASS - All tests passed
- [ ] ⚠️ PASS WITH WARNINGS - Minor issues found
- [ ] ❌ FAIL - Critical issues blocking functionality

### Comments
[Any additional observations or notes]

---

## External Service Testing

If external services are configured, test these features:

### OpenAI (AI Response Generation)
- [ ] AI response generates correctly
- [ ] Response quality is good
- [ ] Edits can be made before sending

### SMTP (Email Sending)
- [ ] Emails send successfully
- [ ] Email content is correct
- [ ] Recipient receives email
- [ ] Email format is professional

### Twilio (SMS)
- [ ] SMS sends successfully
- [ ] Message content is correct
- [ ] Character limit is respected

### Cron Job (Follow-up Processing)
- [ ] Overdue follow-ups are processed
- [ ] Notifications are sent
- [ ] Status updates correctly

---

## Completion Checklist

After completing manual testing:

1. [ ] All quick tests passed
2. [ ] All comprehensive tests reviewed
3. [ ] Issues documented with details
4. [ ] Screenshots captured (if issues found)
5. [ ] Test report filled out
6. [ ] Report shared with development team

---

**Ready to Test!** 🚀

Start with the Quick Test (5 minutes) to validate core functionality, then proceed to the Comprehensive Test (30 minutes) for thorough validation.

Remember to check the browser console (F12) for any errors during testing!
