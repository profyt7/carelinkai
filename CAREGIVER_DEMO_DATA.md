# Caregiver Demo Data Documentation

## Overview

This document describes the comprehensive demo data added to the caregivers module, including certifications, resident assignments, and documents.

## What Demo Data Was Added

### 1. Certifications

Each of the 8 demo caregivers has been assigned **2-5 certifications** with varied types and statuses:

#### Certification Types
- **CNA** (Certified Nursing Assistant)
- **HHA** (Home Health Aide)
- **CPR** (Cardiopulmonary Resuscitation)
- **FIRST_AID** (First Aid)
- **MEDICATION_ADMINISTRATION** (Medication Management)
- **DEMENTIA_CARE** (Dementia Care Specialist)
- **ALZHEIMERS_CARE** (Alzheimer's Care)
- **HOSPICE_CARE** (Hospice & Palliative Care)
- **WOUND_CARE** (Wound Care Specialist)
- **IV_THERAPY** (IV Therapy)

#### Certification Statuses
- **CURRENT** (~70%): Valid certifications with future expiry dates
- **EXPIRING_SOON** (~20%): Certifications expiring within 30 days
- **EXPIRED** (~10%): Certifications past their expiry date

#### Certification Profiles by Caregiver

**Caregiver 1** (Care Giver):
- 5 certifications: CNA, CPR, First Aid, Dementia Care, Medication Administration
- All CURRENT status
- Senior caregiver profile

**Caregiver 2** (Sarah Thompson):
- 3 certifications: HHA, CPR (expiring soon), Alzheimer's Care
- Mixed statuses
- Home health aide profile

**Caregiver 3** (Maria Garcia):
- 3 certifications: CNA (current), CPR (expired), First Aid
- Newer caregiver with one expired cert
- Requires CPR renewal

**Caregiver 4** (James Wilson):
- 4 certifications: CNA, Hospice Care, CPR, Wound Care
- Experienced hospice specialist
- All current

**Caregiver 5** (Lisa Anderson):
- 4 certifications: HHA, Dementia Care, Alzheimer's Care, CPR (expiring soon)
- Dementia care specialist
- One cert expiring soon

**Caregiver 6** (David Nguyen):
- 4 certifications: CNA, IV Therapy, CPR, Medication Administration
- IV therapy specialist
- All current

**Caregiver 7** (Emily Brown):
- 4 certifications: CNA, CPR (expired), First Aid (expiring soon), Dementia Care
- Mixed status profile
- Requires renewals

**Caregiver 8** (Antonio Rodriguez):
- 2 certifications: CNA, CPR
- Newer caregiver profile
- All current

### 2. Resident Assignments

Each caregiver has been assigned to **1-5 residents** with a mix of:

#### Assignment Types
- **Primary assignments**: Caregiver is the main responsible person
- **Secondary assignments**: Caregiver provides relief coverage
- **Historical assignments**: Past assignments with end dates

#### Assignment Patterns

- **Caregiver 1**: 2 primary, 1 secondary, 1 historical
- **Caregiver 2**: 1 primary, 2 secondary, 0 historical
- **Caregiver 3**: 3 primary, 1 secondary, 2 historical (busy)
- **Caregiver 4**: 1 primary, 0 secondary, 0 historical (newer)
- **Caregiver 5**: 2 primary, 1 secondary, 1 historical (balanced)
- **Caregiver 6**: 2 primary, 2 secondary, 3 historical (senior)
- **Caregiver 7**: 1 primary, 1 secondary, 0 historical (part-time)
- **Caregiver 8**: 2 primary, 1 secondary, 1 historical (full-time)

#### Assignment Details
- **Current assignments**: `endDate = null`, started 1-6 months ago
- **Historical assignments**: Started 6-18 months ago, ended 1-3 months ago
- **Notes**: Each assignment includes detailed care responsibility notes

### 3. Documents

Each caregiver has **3-6 documents** of various types:

#### Document Types
- **CONTRACT**: Employment contracts and agreements
- **CERTIFICATION**: Certification documents and licenses
- **BACKGROUND_CHECK**: Criminal and employment verification (expires after 12 months)
- **TRAINING**: Training completion certificates
- **IDENTIFICATION**: Government-issued IDs
- **REFERENCE**: Professional references
- **OTHER**: TB tests, health records, etc.

#### Document Sets by Caregiver

**Set 1** (Complete Documentation):
- Employment Contract 2024
- CNA License Certificate (expires in 24 months)
- Criminal Background Check (expires in 12 months)
- CPR Training Certificate (expires in 12 months)
- Professional Reference - Dr. Smith

**Set 2** (Standard Documentation):
- Employment Agreement
- Home Health Aide Certificate (24 months)
- Background Verification (12 months)
- Dementia Care Training (36 months)

**Set 3** (Newer Employee):
- New Hire Employment Contract
- CNA Certification (24 months)
- Pre-Employment Background Check (12 months)

**Set 4** (Experienced):
- Senior Caregiver Employment Contract
- Multiple State Licenses (36 months)
- FBI Background Check (12 months)
- Advanced Care Training (24 months)
- Medication Administration Training (36 months)
- Professional References (3)

**Set 5** (Standard with ID):
- Employment Contract
- State Certification (24 months)
- Driver License Copy (60 months)
- Background Check Report (12 months)

**Set 6** (Comprehensive):
- Full-Time Employment Agreement
- Professional Certifications (24 months)
- Criminal & Employment History Check (12 months)
- Hospice Care Training (24 months)
- Employment References
- TB Test Results (12 months)

**Set 7** (Minimal Documentation):
- Part-Time Employment Contract
- Basic Certification (24 months)
- Background Check (12 months)

**Set 8** (Standard with Extra Training):
- Employment Contract 2023
- State License (24 months)
- Background Verification Report (12 months)
- Fall Prevention Training (24 months)
- Infection Control Training (12 months)

## How to Run the Seed Script

### Method 1: Using NPM Script (Recommended)

```bash
cd /home/ubuntu/carelinkai-project
npm run seed:caregivers
```

### Method 2: Direct Execution

```bash
cd /home/ubuntu/carelinkai-project
npx tsx prisma/seed-caregiver-demo-data.ts
```

### Method 3: Using Node

```bash
cd /home/ubuntu/carelinkai-project
node --loader tsx prisma/seed-caregiver-demo-data.ts
```

## What to Expect in the UI

### Caregivers Overview Page (`/operator/caregivers`)
- All 8 caregivers listed with their basic information
- Certification status indicators:
  - 🟢 **All Current**: Green badge when all certifications are current
  - 🟡 **Expiring Soon**: Yellow badge when certifications expire within 30 days
  - 🔴 **Expired**: Red badge when certifications are expired
- Active resident count displayed

### Individual Caregiver Page (`/operator/caregivers/:id`)

#### **Overview Tab**
- Basic information (name, email, phone, employment status)
- Years of experience
- Employment details
- Quick stats (certifications, assignments, documents)

#### **Certifications Tab**
- Full list of certifications with:
  - Certification type
  - Certification number
  - Issuing organization
  - Issue date & expiry date
  - Status badge (Current/Expiring Soon/Expired)
  - Document download links
  - Verification status
- Ability to add new certifications
- Edit/delete existing certifications

#### **Assignments Tab**
- **Current Assignments** section:
  - Resident name and photo
  - Primary/Secondary badge
  - Start date
  - Assignment notes
  - Quick actions (view resident, edit, end assignment)
- **Historical Assignments** section:
  - Past assignments with end dates
  - Assignment duration
  - Reason for ending

#### **Documents Tab**
- Document grid/list view with:
  - Document type icon
  - Document title
  - Upload date
  - Expiry date (if applicable)
  - Expiry status (current/expiring soon/expired)
  - Download button
  - Delete button
- Ability to upload new documents
- Filter by document type

## How to Reset/Re-Seed

The seed script is **idempotent**, meaning you can run it multiple times safely. It will:

1. **Delete** all existing certifications for demo caregivers
2. **Delete** all existing assignments for demo caregivers
3. **Delete** all existing documents for demo caregivers
4. **Create** fresh demo data

### To Reset and Re-Seed:

```bash
# Simply run the seed script again
npm run seed:caregivers
```

### To Clear Demo Data Only (Without Re-Seeding):

```sql
-- Connect to your database and run:
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

## Data Characteristics

### Realistic Variation
- **Not all caregivers are the same**: Each has a unique profile
- **Different experience levels**: From newer caregivers (2 certs) to senior staff (5-6 certs)
- **Mixed certification statuses**: Some current, some expiring, some expired
- **Varied assignments**: From 1 to 5 residents per caregiver
- **Different document types**: Employment contracts, certifications, background checks, training records

### Temporal Realism
- **Issue dates**: 2-36 months in the past
- **Expiry dates**: Based on certification type (CNA: 24 months, CPR: 12 months, etc.)
- **Assignment dates**: Current assignments started 1-6 months ago, historical 6-18 months ago
- **Document uploads**: 1-18 months in the past

### Compliance Tracking
- **Expiring soon warnings**: Certifications expiring within 30 days
- **Expired alerts**: Certifications past their expiry date
- **Background check expiry**: All background checks expire after 12 months (compliance requirement)
- **Renewal notes**: Automated notes on expired/expiring certifications

## Database Tables Affected

### Tables Populated
1. **CaregiverCertification**: ~30 records (3-5 per caregiver)
2. **CaregiverAssignment**: ~25 records (2-4 per caregiver)
3. **CaregiverDocument**: ~35 records (3-6 per caregiver)

### Total Records Added
**~90 demo records** across 3 tables

## Production Deployment

After running the seed script locally and verifying the data:

### 1. Commit Changes
```bash
git add prisma/seed-caregiver-demo-data.ts
git add CAREGIVER_DEMO_DATA.md
git add package.json
git commit -m "feat: Add comprehensive demo data for caregivers module"
```

### 2. Push to GitHub
```bash
git push origin main
```

### 3. Render Auto-Deploy
- Render will automatically detect the push
- Build and deploy the application
- Run database migrations if any

### 4. Run Seed Script on Production
```bash
# SSH into Render or use Render shell
npm run seed:caregivers
```

Or use Render's dashboard to run:
```bash
npx tsx prisma/seed-caregiver-demo-data.ts
```

## Verification Checklist

After seeding, verify the following:

### In Database
- [ ] CaregiverCertification table has ~30 records
- [ ] CaregiverAssignment table has ~25 records
- [ ] CaregiverDocument table has ~35 records
- [ ] All caregivers have at least 2 certifications
- [ ] All caregivers have at least 1 assignment (if residents exist)
- [ ] All caregivers have at least 3 documents

### In UI - Overview Page
- [ ] Caregivers list displays certification status badges
- [ ] Active resident counts are shown
- [ ] Filtering and sorting work correctly

### In UI - Individual Caregiver Page
- [ ] **Overview tab** shows correct stats
- [ ] **Certifications tab** displays all certifications with status badges
- [ ] **Assignments tab** shows current and historical assignments
- [ ] **Documents tab** displays all documents with expiry tracking

### Functionality Testing
- [ ] Add new certification works
- [ ] Edit certification works
- [ ] Delete certification works (with confirmation)
- [ ] Add new assignment works
- [ ] End assignment works
- [ ] Add new document works
- [ ] Delete document works
- [ ] Export caregiver data works

## Troubleshooting

### Issue: "No caregivers found"
**Solution**: Run the main seed script first to create demo caregivers:
```bash
npm run seed
```

### Issue: "No residents available"
**Solution**: Ensure you have active demo residents:
```bash
npm run seed:residents
```

### Issue: Prisma client out of sync
**Solution**: Regenerate Prisma client:
```bash
npx prisma generate
```

### Issue: Database connection error
**Solution**: Check your DATABASE_URL environment variable:
```bash
echo $DATABASE_URL
```

## Related Documentation

- [Prisma Schema](/prisma/schema.prisma) - Database model definitions
- [Phase 6 Implementation](/PHASE_6_IMPLEMENTATION.md) - Caregiver management feature specs
- [Seed Scripts](/prisma/) - Other demo data seed scripts

## Support

For issues or questions about the demo data:
1. Check this documentation
2. Review the seed script source code
3. Check the Prisma schema for model definitions
4. Test in local environment first before production

---

**Last Updated**: December 11, 2024  
**Script Version**: 1.0  
**Total Demo Records**: ~90 (30 certs + 25 assignments + 35 documents)
