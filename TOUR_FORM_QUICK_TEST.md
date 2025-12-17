# Tour Form - Quick Testing Guide

## 🚀 IMMEDIATE TEST STEPS

### 1. Open Production Site
```
https://carelinkai.onrender.com/homes/1
```

### 2. Open Browser Console
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J`
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Press `Cmd+Option+C`

### 3. Start Tour Booking
- Click **"Schedule a Tour"** button in the right sidebar

### 4. Fill Contact Info
✅ **Correct Way (WILL WORK):**
- Name: Your name
- Email: your@email.com
- **CHECK at least ONE box:**
  - [ ] Assisted Living ✅
  - [ ] Memory Care
  - [ ] Medication Management

❌ **Wrong Way (WILL BLOCK):**
- Name: Your name
- Email: your@email.com
- **Leave ALL boxes unchecked** ← This is the problem!

### 5. Click "Continue to Schedule Tour"

### 6. Check Console Output

**If you see this → Form is BLOCKED:**
```
╔══════════════════════════════════════════════════════════╗
║  ❌ FORM BLOCKED - FIX VALIDATION ERRORS ABOVE          ║
╚══════════════════════════════════════════════════════════╝
```

**If you see this → Form ADVANCED:**
```
╔══════════════════════════════════════════════════════════╗
║  ✅ FORM ADVANCED - Should show tour scheduling now     ║
╚══════════════════════════════════════════════════════════╝
```

## 🔍 WHAT TO LOOK FOR

### Error Message on Screen
When form is blocked, you should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 Please select at least one care service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
- Red background
- Red border around checkboxes
- Alert icon
- Bold text

### Success Behavior
After checking a box and clicking button:
- Form should change to show date/time selection
- Step indicator should move to step 2
- Console logs show validation passed

## ⚡ ONE-MINUTE TEST

```bash
1. Open site
2. Press F12
3. Click "Schedule a Tour"
4. Fill name + email
5. DON'T check any boxes ← This simulates the bug
6. Click "Continue to Schedule Tour"
7. Should see RED ERROR MESSAGE
8. Check one box
9. Click button again
10. Should advance to date selection
```

## 🎯 SUCCESS CRITERIA

✅ **Fix is working if:**
- Error message is VISIBLE and PROMINENT
- Console shows detailed logs
- Form advances after checking a box
- Form blocks when no boxes checked

❌ **Issue still exists if:**
- No error message appears
- Form doesn't advance even with boxes checked
- Console logs don't appear
- Error message is hard to see

## 📞 REPORT RESULTS

**If working correctly:**
- Take screenshot of error message
- Copy console log output
- Test complete tour flow

**If still broken:**
- Copy ALL console output
- Take screenshot of form state
- Note which step failed
- Check network tab for API errors

---

**Quick Links:**
- Production: https://carelinkai.onrender.com
- GitHub: https://github.com/profyt7/carelinkai
- Commit: ed60c5c
