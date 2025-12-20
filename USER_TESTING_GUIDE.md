# User Testing Guide - AI Features

## Quick Test (5 minutes)

Follow these steps to verify all AI features are working:

---

### Step 1: Access Pipeline Dashboard
1. Go to: https://carelinkai.onrender.com/operator/inquiries/pipeline
2. Login with OPERATOR or ADMIN credentials
3. ✅ Verify page loads without errors

---

### Step 2: Test AI Response Generation
1. Click on any inquiry (or create a new one)
2. In the inquiry detail modal, click "Communication" tab
3. Click "Generate Response" button
4. Select response type (e.g., "Initial Response")
5. Select tone (e.g., "Professional")
6. Click "Generate" button
7. ✅ Verify AI generates a personalized response
8. ✅ Verify response includes inquiry details
9. Edit the response if needed
10. Click "Send Email" button
11. ✅ Verify success message appears

---

### Step 3: Check Email
1. Open profyt7@gmail.com
2. ✅ Verify you received the email
3. ✅ Check email formatting looks good
4. ✅ Verify content is personalized

---

### Step 4: Test Follow-up Scheduling
1. In the inquiry detail modal, click "Follow-ups" tab
2. Click "Schedule Follow-up" button
3. Fill in:
   - Type: Email or SMS
   - Scheduled Date: Tomorrow
   - Notes: Test follow-up
4. Click "Schedule"
5. ✅ Verify follow-up appears in list
6. ✅ Verify status shows "Pending"

---

### Step 5: Test Filters
1. Use the search box to search for an inquiry
2. ✅ Verify search works
3. Select urgency filter (e.g., "HIGH")
4. ✅ Verify filtering works
5. Click "Clear All Filters"
6. ✅ Verify all inquiries show again

---

## If All 5 Steps Pass: ✅ SUCCESS!

All AI features are working correctly!

---

## Troubleshooting

### AI Response Not Generating
- Check OpenAI API key is configured
- Check browser console for errors
- Verify inquiry has required fields

### Email Not Sending
- Check SMTP credentials
- Verify profyt7@gmail.com is correct
- Check spam folder

### Follow-up Not Scheduling
- Check form validation
- Verify date is in future
- Check browser console for errors

---

## Need Help?

If you encounter any issues, check:
- Render logs for errors
- Browser console for JavaScript errors
- Network tab for failed API calls
