# CareLinkAI Demo Accounts

## Overview

This document lists all demo accounts created by the `seed:demo` script for live walkthroughs with ALFs, agencies, and investors.

## Running the Seed Script

```bash
npm run seed:demo
```

**Prerequisites:**
- PostgreSQL database running and accessible via `DATABASE_URL`
- Prisma schema migrated to the latest version (`npm run prisma:migrate`)

## Demo Accounts

All demo accounts use the same password: **DemoUser123!**

### Account Table

| Role | Email | Password | Name | Purpose |
|------|-------|----------|------|---------|
| **FAMILY** | demo.family@carelinkai.test | DemoUser123! | Jennifer Martinez | Demonstrates family member looking for care for mother with Alzheimer's |
| **OPERATOR** | demo.operator@carelinkai.test | DemoUser123! | Michael Chen | Demonstrates lead management and care coordination |
| **CAREGIVER** | demo.aide@carelinkai.test | DemoUser123! | Sarah Thompson | Demonstrates aide profile, credentials, and messaging |
| **PROVIDER** | demo.provider@carelinkai.test | DemoUser123! | Robert Williams (Golden Years Home Care) | Demonstrates provider profile, services, and inquiries |
| **ADMIN** | demo.admin@carelinkai.test | DemoUser123! | Admin User | Demonstrates admin tools for provider/aide verification |

## Account Details

### 1. Family Member (Jennifer Martinez)

**Email:** demo.family@carelinkai.test  
**Role:** FAMILY  
**Care Context:**
- Primary contact for 82-year-old mother
- Mother has early-stage Alzheimer's disease
- Needs 20-25 hours/week of care
- Looking for compassionate, experienced caregiver

**Pre-created Data:**
- 4 leads (inquiries to aides and providers)
- 5 message threads (with operator, aides, providers)
- Care context profile fully filled out

**Key Demo URLs:**
- `/settings/family` - Care context and profile
- `/marketplace/aides` - Browse caregivers
- `/marketplace/providers` - Browse providers
- `/favorites` - Saved favorites
- `/messages` - View conversations

---

### 2. Operator (Michael Chen)

**Email:** demo.operator@carelinkai.test  
**Role:** OPERATOR  
**Company:** CareLink Services Inc.

**Pre-created Data:**
- Assigned to 2 leads (IN_REVIEW and CONTACTED status)
- 3 message threads (with family, aides, providers)

**Key Demo URLs:**
- `/operator/leads` - Lead management dashboard
- `/operator/leads/[id]` - Lead detail view
- `/messages` - Coordinate with families and providers
- `/dashboard` - Overview dashboard

---

### 3. Aide/Caregiver (Sarah Thompson)

**Email:** demo.aide@carelinkai.test  
**Role:** CAREGIVER  
**Experience:** 7 years, specializing in Alzheimer's care  
**Rate:** $32/hour

**Pre-created Data:**
- 1 lead from demo.family (NEW status)
- 2 message threads (with operator and family)
- Complete profile with skills and availability
- Background check: CLEAR

**Key Demo URLs:**
- `/settings/aide` - Caregiver profile
- `/settings/credentials` - Credentials management
- `/messages` - View inquiries
- `/dashboard` - Overview

---

### 4. Provider (Robert Williams - Golden Years Home Care)

**Email:** demo.provider@carelinkai.test  
**Role:** PROVIDER  
**Business:** Golden Years Home Care  
**Experience:** 15 years in business  
**Services:** Personal Care, Companionship, Medication Management, Dementia Care, Respite Care

**Pre-created Data:**
- 2 leads from demo.family (IN_REVIEW and NEW status)
- 2 message threads (with operator and family)
- Complete provider profile with coverage area and credentials
- Verified status: TRUE

**Key Demo URLs:**
- `/settings/provider` - Provider profile
- `/settings/credentials` - License and insurance management
- `/messages` - View inquiries
- `/dashboard` - Overview

---

### 5. Admin (Admin User)

**Email:** demo.admin@carelinkai.test  
**Role:** ADMIN

**Key Demo URLs:**
- `/admin/providers` - Provider management and verification
- `/admin/aides` - Caregiver management
- `/dashboard` - Admin dashboard

---

## Additional Test Data

The seed script also creates:

### Additional Caregivers (6)
1. **Maria Garcia** - San Jose, CA - Bilingual (English/Spanish), Post-surgery care
2. **James Wilson** - Oakland, CA - Male caregiver, Nursing background
3. **Lisa Anderson** - San Francisco, CA - Hospice and end-of-life care
4. **David Nguyen** - Berkeley, CA - Mobility assistance and fall prevention
5. **Emily Brown** - Palo Alto, CA - Dementia care specialist
6. **Antonio Rodriguez** - Sacramento, CA - Meal preparation and nutrition

### Additional Providers (5)
1. **Compassion Home Health** - San Francisco, CA
2. **Senior Helpers of the Bay Area** - San Jose, CA
3. **Home Instead Senior Care** - Oakland, CA
4. **Visiting Angels** - Berkeley, CA
5. **Right at Home Bay Area** - Palo Alto, CA

### Pre-created Leads (4)
1. Family → Demo Aide (NEW)
2. Family → Demo Provider (IN_REVIEW, assigned to operator)
3. Family → Maria Garcia (CONTACTED, assigned to operator)
4. Family → Compassion Home Health (NEW)

### Pre-created Message Threads (5)
1. Family ↔ Operator (about care needs)
2. Operator ↔ Demo Aide (about a lead)
3. Operator ↔ Provider (about a lead)
4. Family ↔ Demo Aide (direct inquiry)
5. Family ↔ Provider (direct inquiry)

---

## Testing Workflows

### Family Flow
1. Login as demo.family@carelinkai.test
2. View care context at `/settings/family`
3. Browse marketplace at `/marketplace/aides` and `/marketplace/providers`
4. Check existing leads and messages
5. Submit a new inquiry

### Operator Flow
1. Login as demo.operator@carelinkai.test
2. View leads at `/operator/leads`
3. Open a lead detail page
4. Update lead status and add notes
5. Open conversation with family or provider

### Aide Flow
1. Login as demo.aide@carelinkai.test
2. View profile at `/settings/aide`
3. Check credentials at `/settings/credentials`
4. View messages and respond to inquiries

### Provider Flow
1. Login as demo.provider@carelinkai.test
2. View profile at `/settings/provider`
3. Check credentials at `/settings/credentials`
4. View messages and respond to inquiries

### Admin Flow
1. Login as demo.admin@carelinkai.test
2. View providers at `/admin/providers`
3. Click on a provider to view details
4. Toggle verification status

---

## Notes

- All demo accounts have `emailVerified` set to bypass email verification
- All accounts have `status: ACTIVE`
- Background checks for caregivers are set to `CLEAR`
- Provider verification statuses are set to `TRUE` for verified providers
- Messages have realistic timestamps (spread over the past 3 days)
- Leads have realistic preferred start dates (1-3 weeks in the future)

---

## Troubleshooting

**Issue:** Seed script fails with "unique constraint" error  
**Solution:** The script uses `upsert` for accounts, so it's safe to run multiple times. Clear the database first if needed:
```bash
npm run prisma:migrate reset
npm run seed:demo
```

**Issue:** Can't login after seeding  
**Solution:** Verify password is exactly `DemoUser123!` (case-sensitive, includes exclamation mark)

**Issue:** No data appears in UI  
**Solution:** 
1. Check that seed script completed successfully
2. Verify database connection
3. Clear browser cache and reload
4. Check browser console for errors

---

## Related Documentation

- [DEMO_FLOW.md](./DEMO_FLOW.md) - Scripted demo walkthrough
- [PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md](../PROVIDER_MVP_IMPLEMENTATION_SUMMARY.md) - Provider feature documentation
- [family_profile_implementation.md](../family_profile_implementation.md) - Family feature documentation
