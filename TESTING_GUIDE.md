# Pipeline Dashboard Testing Guide
**Service URL:** https://carelinkai.onrender.com  
**Test Date:** December 19, 2025

---

## 🚀 Quick Start (5-Minute Test)

### Prerequisites
1. Access to CareLinkAI application
2. OPERATOR or ADMIN role credentials
3. Modern web browser (Chrome, Firefox, Edge)

### Step 1: Access the Dashboard
```
URL: https://carelinkai.onrender.com/operator/inquiries/pipeline
```

**Expected Result:**  
- ✅ Page loads without errors
- ✅ Login screen appears (if not authenticated)
- ✅ Dashboard displays after login

**If it fails:**  
- Check if you're logged in
- Check browser console for errors (F12)
- Verify you have OPERATOR/ADMIN role

---

## 🧪 CORE FUNCTIONALITY TESTS

### Test 1: Dashboard Access & Layout
**Steps:**
1. Navigate to `/operator/inquiries/pipeline`
2. Observe the page layout

**Expected:**
- [ ] Page loads in < 3 seconds
- [ ] Analytics cards display at top
- [ ] Kanban board with 7 stages displays:
  - NEW
  - CONTACTED
  - QUALIFIED
  - TOUR_SCHEDULED
  - TOUR_COMPLETED
  - PROPOSAL_SENT
  - CLOSED
- [ ] View toggle buttons (Kanban/List) present
- [ ] "New Inquiry" button visible
- [ ] Search and filter controls visible

**If it fails:**
- Check browser console for errors
- Check network tab for failed API calls
- Take screenshot and note the error

---

### Test 2: Analytics Cards
**Steps:**
1. Look at the analytics cards at the top

**Expected:**
- [ ] "Total Inquiries" shows a number
- [ ] "New This Week" shows a number
- [ ] "Requires Attention" shows a number
- [ ] "Conversion Rate" shows percentage
- [ ] "Pending Follow-ups" shows a number

**Note:** Numbers may be 0 if no data exists (this is OK)

---

### Test 3: Create New Inquiry
**Steps:**
1. Click "New Inquiry" button
2. Fill out the form:
   - **Contact Name:** Test User $(date +%s)
   - **Contact Email:** test$(date +%s)@example.com
   - **Contact Phone:** +15551234567
   - **Care Recipient Name:** Test Recipient
   - **Care Recipient Age:** 75
   - **Care Needs:** Select "Memory Care"
   - **Urgency:** Select "HIGH"
   - **Source:** Select "WEBSITE"
   - **Preferred Contact:** Select "EMAIL"
3. Click "Create Inquiry"

**Expected:**
- [ ] Modal opens successfully
- [ ] Form validation works (try submitting empty form first)
- [ ] After submit, modal closes
- [ ] Success toast notification appears
- [ ] New inquiry appears in "NEW" stage
- [ ] Inquiry card shows correct information

**If it fails:**
- Check console for API errors
- Note which fields are causing issues
- Take screenshot of error message

---

### Test 4: Drag-and-Drop (Kanban)
**Steps:**
1. Find the inquiry you just created (should be in "NEW" stage)
2. Click and hold the inquiry card
3. Drag it to "CONTACTED" stage
4. Release (drop)
5. Wait for confirmation

**Expected:**
- [ ] Card moves smoothly during drag
- [ ] Drop zones highlight when dragging
- [ ] Success toast appears: "Inquiry moved to CONTACTED"
- [ ] Card appears in "CONTACTED" stage
- [ ] **CRITICAL:** Refresh page and verify card is still in "CONTACTED"

**If it fails:**
- Try a different browser
- Check if drag events are being captured
- Check console for errors

---

### Test 5: Inquiry Detail Modal
**Steps:**
1. Click on any inquiry card
2. Modal should open
3. Explore all tabs:
   - Overview
   - Communication
   - Follow-ups

**Expected:**
- [ ] Modal opens with inquiry details
- [ ] "Overview" tab shows:
  - Contact information
  - Care recipient information
  - Care needs
  - Urgency badge
  - Source
  - Timestamps
- [ ] "Communication" tab shows:
  - Response history (may be empty)
  - "Generate AI Response" button
- [ ] "Follow-ups" tab shows:
  - Follow-ups list (may be empty)
  - "Schedule Follow-up" button
- [ ] Close button (X) works
- [ ] Clicking outside modal closes it

**If it fails:**
- Note which tab is failing
- Check for missing data vs. UI errors
- Take screenshots

---

### Test 6: Search & Filters
**Steps:**
1. **Test Search:**
   - Enter "Test" in search box
   - Only matching inquiries should display
   - Clear search

2. **Test Urgency Filter:**
   - Select "HIGH" from urgency dropdown
   - Only HIGH urgency inquiries display
   - Clear filter

3. **Test Stage Filter:**
   - Select "NEW" from stage dropdown
   - Only NEW stage inquiries display
   - Clear filter

4. **Test Source Filter:**
   - Select "WEBSITE" from source dropdown
   - Only WEBSITE source inquiries display
   - Clear filter

5. **Test Clear All:**
   - Apply multiple filters
   - Click "Clear All Filters"
   - All inquiries display again

**Expected:**
- [ ] Search filters results correctly
- [ ] Each filter works independently
- [ ] Multiple filters work together (AND logic)
- [ ] Clear All resets everything
- [ ] URL updates with filter params

**If it fails:**
- Note which filter is not working
- Check if it's a display issue or data issue

---

### Test 7: AI Response Generator (May Fail)
**Steps:**
1. Open an inquiry detail modal
2. Go to "Communication" tab
3. Click "Generate AI Response"
4. Select response type (e.g., "Initial Response")
5. Click "Generate with AI"

**Expected (if OpenAI is configured):**
- [ ] AI generates a response
- [ ] Preview shows the generated text
- [ ] "Edit Response" allows modifications
- [ ] "Send Response" button works

**Expected (if OpenAI is NOT configured):**
- [ ] Error message appears
- [ ] Error says something about API key or configuration
- [ ] **THIS IS OK FOR NOW!**

**Action if it fails:**
- Document the error message
- Continue with other tests
- We'll fix OpenAI configuration later

---

### Test 8: Schedule Follow-up
**Steps:**
1. Open an inquiry detail modal
2. Go to "Follow-ups" tab
3. Click "Schedule Follow-up"
4. Fill out form:
   - **Type:** Email
   - **Subject:** Test Follow-up
   - **Content:** This is a test follow-up
   - **Scheduled Date:** Tomorrow
   - **Scheduled Time:** 10:00 AM
5. Click "Schedule"

**Expected:**
- [ ] Modal opens successfully
- [ ] Date picker works
- [ ] Time picker works
- [ ] Follow-up is created
- [ ] Follow-up appears in list with "PENDING" status
- [ ] Follow-up shows correct scheduled time

**If it fails:**
- Check console for API errors
- Note validation issues
- Take screenshot

---

### Test 9: List View Toggle
**Steps:**
1. Click "List View" button
2. Observe the change
3. Click "Kanban View" button
4. Observe the change back

**Expected:**
- [ ] View switches from Kanban to table
- [ ] Table shows all inquiries with columns:
  - Contact Name
  - Care Recipient
  - Stage
  - Urgency
  - Source
  - Created Date
- [ ] Table is sortable (click column headers)
- [ ] Switching back to Kanban works
- [ ] State persists across page reloads

**If it fails:**
- Note which view is not working
- Check if it's a display issue

---

### Test 10: Mobile Responsiveness (Optional)
**Steps:**
1. Open browser DevTools (F12)
2. Toggle device emulation (Ctrl+Shift+M)
3. Select a mobile device (e.g., iPhone 12)
4. Test core functionality

**Expected:**
- [ ] Layout adapts to mobile screen
- [ ] Kanban scrolls horizontally
- [ ] Modals are full-screen
- [ ] Buttons are easily tappable
- [ ] No horizontal overflow
- [ ] All features work on mobile

---

## 🐛 ISSUE TRACKING

### Critical Issues ❌
*(Issues that completely break functionality)*

- None found yet

### High Priority Issues ⚠️
*(Issues that significantly impact usability)*

- None found yet

### Medium Priority Issues 📝
*(Issues that are annoying but not blocking)*

- None found yet

### Low Priority Issues ℹ️
*(Nice-to-have fixes or enhancements)*

- None found yet

---

## 📊 TEST RESULTS SUMMARY

### Test Statistics
- **Total Tests:** 10
- **Passed:** ___
- **Failed:** ___
- **Skipped:** ___
- **Blocked:** ___

### Overall Assessment
- [ ] **PASS:** All core features work as expected
- [ ] **PARTIAL:** Some features work, some need fixes
- [ ] **FAIL:** Critical issues prevent testing

### Tester Notes
```
Add any additional observations, questions, or concerns here:

- 
- 
- 
```

---

## 🔧 TROUBLESHOOTING

### Issue: Page doesn't load
**Solutions:**
1. Check if you're logged in with correct role
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private mode
4. Try different browser
5. Check browser console for errors

### Issue: API errors (401/403)
**Solutions:**
1. Verify you're logged in as OPERATOR/ADMIN
2. Check session hasn't expired
3. Try logging out and back in
4. Verify role permissions

### Issue: Drag-and-drop doesn't work
**Solutions:**
1. Try different browser (Chrome recommended)
2. Disable browser extensions
3. Check if mouse events are being blocked
4. Try using keyboard navigation (Tab + Enter)

### Issue: Modal doesn't open
**Solutions:**
1. Check browser console for errors
2. Try clicking different elements
3. Refresh page and try again
4. Check if modal backdrop is blocking

### Issue: Data doesn't persist
**Solutions:**
1. Check network tab for failed API calls
2. Verify database connection
3. Check server logs on Render
4. May indicate backend issue

---

## 📋 TESTING CHECKLIST

Before marking testing as complete, verify:

- [ ] All 10 core tests attempted
- [ ] Issues documented with screenshots
- [ ] Browser console checked for errors
- [ ] Network tab reviewed for API failures
- [ ] Test results recorded in summary
- [ ] Critical issues identified and prioritized
- [ ] Follow-up actions documented

---

## 🚀 NEXT STEPS AFTER TESTING

### If Tests PASS ✅
1. Document successful features
2. Mark Feature #4 as complete
3. Plan deployment of next features
4. Configure remaining external services (OpenAI, SendGrid, Twilio)

### If Tests FAIL ❌
1. Document all failures with details
2. Prioritize fixes (Critical → High → Medium → Low)
3. Fix critical issues first
4. Redeploy and retest
5. Repeat until tests pass

### If Tests PARTIAL ⚠️
1. Document what works and what doesn't
2. Decide if partial deployment is acceptable
3. Create fix plan for remaining issues
4. Continue with lower-priority fixes

---

**Ready to test! Good luck! 🎉**
