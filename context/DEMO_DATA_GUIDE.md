---
type: reference
created: 2026-05-09
migrated_from: [CAREGIVER_DEMO_DATA.md, RESIDENT_DEMO_DATA.md]
---

# Demo Data Guide

This document describes the demo caregiver and resident profiles seeded
into the CareLinkAI platform for development and testing.

## Seed scripts

- `prisma/seed-caregiver-demo-data.ts` — seeds caregiver certifications, assignments, and documents
- `prisma/seed-resident-demo-data.ts` — seeds resident profiles, assessments, incidents, and family contacts

**Run order** (dependencies):

```bash
npm run seed              # main seed — demo users, homes, operator
npm run seed:caregivers   # caregiver certifications, assignments, documents
npm run seed:residents    # resident profiles, assessments, incidents, family contacts
```

Both scripts are **idempotent** — they clear their own demo data before
re-seeding, so re-running is safe.

## Caregiver profiles

8 demo caregivers with varied experience levels. **~90 records across 3
tables** — ~30 certifications, ~25 assignments, ~35 documents.

### Caregiver 1 — Care Giver (senior profile)
- **Certifications (5, all CURRENT):** CNA, CPR, First Aid, Dementia Care, Medication Administration
- **Assignments:** 2 primary, 1 secondary, 1 historical
- **Documents:** Employment Contract 2024, CNA License, Criminal Background Check, CPR Training Certificate, Professional Reference

### Caregiver 2 — Sarah Thompson (home health aide)
- **Certifications (3, mixed):** HHA, CPR (EXPIRING SOON), Alzheimer's Care
- **Assignments:** 1 primary, 2 secondary
- **Documents:** Employment Agreement, Home Health Aide Certificate, Background Verification, Dementia Care Training

### Caregiver 3 — Maria Garcia (newer, CPR expired)
- **Certifications (3):** CNA (CURRENT), CPR (EXPIRED), First Aid (CURRENT)
- **Assignments:** 3 primary, 1 secondary, 2 historical
- **Documents:** New Hire Employment Contract, CNA Certification, Pre-Employment Background Check

### Caregiver 4 — James Wilson (hospice specialist)
- **Certifications (4, all CURRENT):** CNA, Hospice Care, CPR, Wound Care
- **Assignments:** 1 primary
- **Documents:** Senior Caregiver Employment Contract, Multiple State Licenses, FBI Background Check, Advanced Care Training, Medication Administration Training, Professional References (3)

### Caregiver 5 — Lisa Anderson (dementia care specialist)
- **Certifications (4):** HHA, Dementia Care, Alzheimer's Care, CPR (EXPIRING SOON)
- **Assignments:** 2 primary, 1 secondary, 1 historical
- **Documents:** Employment Contract, State Certification, Driver License Copy, Background Check Report

### Caregiver 6 — David Nguyen (IV therapy specialist)
- **Certifications (4, all CURRENT):** CNA, IV Therapy, CPR, Medication Administration
- **Assignments:** 2 primary, 2 secondary, 3 historical
- **Documents:** Full-Time Employment Agreement, Professional Certifications, Criminal & Employment History Check, Hospice Care Training, Employment References, TB Test Results

### Caregiver 7 — Emily Brown (mixed renewals needed)
- **Certifications (4):** CNA (CURRENT), CPR (EXPIRED), First Aid (EXPIRING SOON), Dementia Care (CURRENT)
- **Assignments:** 1 primary, 1 secondary
- **Documents:** Part-Time Employment Contract, Basic Certification, Background Check

### Caregiver 8 — Antonio Rodriguez (newer caregiver)
- **Certifications (2, all CURRENT):** CNA, CPR
- **Assignments:** 2 primary, 1 secondary, 1 historical
- **Documents:** Employment Contract 2023, State License, Background Verification Report, Fall Prevention Training, Infection Control Training

### Certification status distribution
- **CURRENT** (~70%): Valid, future expiry dates
- **EXPIRING_SOON** (~20%): Expiring within 30 days
- **EXPIRED** (~10%): Past expiry date

### Certification types
CNA, HHA, CPR, FIRST_AID, MEDICATION_ADMINISTRATION, DEMENTIA_CARE,
ALZHEIMERS_CARE, HOSPICE_CARE, WOUND_CARE, IV_THERAPY

## Resident profiles

8 residents. **35 assessments, 18 incidents, 16 family contacts, 12
caregiver assignments.**

### Distribution by care level

| Care Level | Residents |
|---|---|
| Independent Living (2) | Margaret "Maggie" Thompson, Patricia "Pat" Davis |
| Assisted Living (2) | Robert "Bob" Chen, Eleanor "Ellie" Johnson |
| Memory Care (2) | Dorothy Williams, William "Bill" Anderson |
| Skilled Nursing (2) | James "Jim" Martinez, Harold Peterson |

### 1. Margaret "Maggie" Thompson — Room 101
- **Age:** 82 | **Care Level:** Independent Living | **Status:** ACTIVE (2 years)
- **Conditions:** Mild arthritis, well-controlled hypertension
- **Medications:** Lisinopril 10mg daily, Ibuprofen 400mg PRN
- **Allergies:** None | **Mobility:** Independent
- **Assessments:** 5 (all excellent) | **Incidents:** 0 | **Contacts:** 1 (daughter, weekly)
- **Notes:** Role model resident; leads book club; excellent health for age

### 2. Robert "Bob" Chen — Room 205
- **Age:** 78 | **Care Level:** Assisted Living | **Status:** ACTIVE (1 year)
- **Conditions:** Type 2 diabetes, early-stage Parkinson's disease
- **Medications:** Metformin 1000mg twice daily, Carbidopa-Levodopa 25-100mg three times daily
- **Allergies:** Penicillin | **Mobility:** Walker
- **Assessments:** 4 | **Incidents:** 1 (minor fall, resolved) | **Contacts:** 1 (son, monthly)
- **Notes:** Diabetic diet management; fall risk due to Parkinson's

### 3. Dorothy Williams — Room 301
- **Age:** 89 | **Care Level:** Memory Care | **Status:** ACTIVE (6 months)
- **Conditions:** Alzheimer's disease (moderate stage), hypertension
- **Medications:** Donepezil 10mg daily, Amlodipine 5mg daily, Memantine 10mg twice daily
- **Allergies:** Sulfa drugs | **Special Needs:** 24/7 supervision, structured routine
- **Assessments:** 5 | **Incidents:** 3 (2 wandering, 1 sundowning) | **Contacts:** 3 (daughter, son, granddaughter)
- **Notes:** Responds well to music therapy; close family involvement

### 4. James "Jim" Martinez — Room 402
- **Age:** 85 | **Care Level:** Skilled Nursing | **Status:** ACTIVE (3 months)
- **Conditions:** Post-stroke (6 months ago), Type 2 diabetes, Congestive heart failure
- **Medications:** 8+ (cardiac, diabetes, pain management)
- **Allergies:** None | **Mobility:** Wheelchair-bound
- **Assessments:** 5 | **Incidents:** 2 (medication error, pressure ulcer monitoring) | **Contacts:** 2 (spouse daily, son 2-3x/week)
- **Notes:** Total care required; pressure ulcer prevention protocol; devoted family

### 5. Eleanor "Ellie" Johnson — Room 208
- **Age:** 76 | **Care Level:** Assisted Living | **Status:** ACTIVE (8 months)
- **Conditions:** COPD, Osteoporosis
- **Medications:** Albuterol inhaler PRN, Tiotropium inhaler daily, Calcium supplements
- **Allergies:** Latex | **Mobility:** Cane
- **Assessments:** 4 | **Incidents:** 0 | **Contacts:** 1 (niece, twice monthly)
- **Notes:** Enjoys gardening and art; independent with most ADLs; positive attitude

### 6. Harold Peterson — Room 405
- **Age:** 91 | **Care Level:** Skilled Nursing | **Status:** ACTIVE (18 months)
- **Conditions:** Advanced dementia, Coronary artery disease, Hypertension, Chronic pain
- **Medications:** Multiple cardiac meds, morphine PRN
- **Allergies:** Codeine | **Mobility:** Bed-bound
- **Assessments:** 4 | **Incidents:** 4 (respiratory distress, fall from bed, behavioral, aspiration) | **Contacts:** 2
- **Notes:** End-stage dementia; palliative care approach; comfort measures priority

### 7. Patricia "Pat" Davis — Room 105
- **Age:** 73 | **Care Level:** Independent Living | **Status:** ACTIVE (4 months)
- **Conditions:** Mild cognitive impairment (well-controlled), Hypertension
- **Medications:** Amlodipine 5mg daily, low-dose aspirin, multivitamin
- **Allergies:** None | **Mobility:** Independent
- **Assessments:** 3 (excellent) | **Incidents:** 0 | **Contacts:** 2 (son 2-3x/week, daughter monthly)
- **Notes:** Volunteers in activity programs; exercises daily; large supportive family

### 8. William "Bill" Anderson — Room 305
- **Age:** 87 | **Care Level:** Memory Care | **Status:** ACTIVE (10 months)
- **Conditions:** Vascular dementia, Hypertension, Type 2 diabetes
- **Medications:** Donepezil 10mg daily, Amlodipine 10mg daily, Metformin 1000mg twice daily
- **Allergies:** Shellfish | **Special Needs:** Structured activities, supervision
- **Assessments:** 5 | **Incidents:** 4 (3 wandering attempts, 1 fall) | **Contacts:** 2 (son twice weekly, daughter weekly)
- **Notes:** Responds well to structured routine; enjoys music and simple games

### Incident type summary
- BEHAVIORAL_WANDERING: 6 | FALL_NO_INJURY: 3 | BEHAVIORAL_AGITATION: 2
- MEDICATION_ERROR_MISSED_DOSE: 1 | SKIN_BREAKDOWN: 1 | MEDICAL_RESPIRATORY: 1
- FALL_FROM_BED: 1 | CHOKING_ASPIRATION: 1
- **Severity:** Minor 33%, Moderate 61%, Severe 6%
- **Status:** Resolved 94%, Under Review 6%

## SQL snippets for clearing demo data

### Clear caregiver demo data

```sql
DELETE FROM "CaregiverCertification" WHERE "caregiverId" IN (
  SELECT id FROM "Caregiver" WHERE "userId" IN (
    SELECT id FROM "User" WHERE email LIKE '%@carelinkai.%' OR email LIKE '%@test.com'
  )
);

DELETE FROM "CaregiverAssignment" WHERE "caregiverId" IN (
  SELECT id FROM "Caregiver" WHERE "userId" IN (
    SELECT id FROM "User" WHERE email LIKE '%@carelinkai.%' OR email LIKE '%@test.com'
  )
);

DELETE FROM "CaregiverDocument" WHERE "caregiverId" IN (
  SELECT id FROM "Caregiver" WHERE "userId" IN (
    SELECT id FROM "User" WHERE email LIKE '%@carelinkai.%' OR email LIKE '%@test.com'
  )
);
```

### Clear resident demo data
The resident seed script is idempotent — re-running `npm run seed:residents`
clears and recreates all resident demo data automatically. No separate SQL
clear step needed.

## Re-seeding

```bash
# Full re-seed (all demo data):
npm run seed              # recreates users, operator, homes
npm run seed:caregivers   # recreates caregiver certs, assignments, docs
npm run seed:residents    # recreates residents, assessments, incidents, contacts

# Caregiver data only:
npm run seed:caregivers

# Resident data only (requires seed + seed:caregivers first):
npm run seed:residents
```

**Run on Render** via the shell tab:
```bash
npx tsx prisma/seed-caregiver-demo-data.ts
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-resident-demo-data.ts
```

### Troubleshooting

| Error | Fix |
|---|---|
| "No caregivers found" | Run `npm run seed` first |
| "No residents available" | Run `npm run seed` then `npm run seed:caregivers` |
| "No operator found" | Run `npm run seed` first |
| "No family user found" | Run `npm run seed` first |
| Prisma client out of sync | Run `npx prisma generate` |
| Database connection error | Check `DATABASE_URL` env var |
