# Resident Demo Data Documentation

## Overview

This document describes the comprehensive demo data created for the **Residents Module** in CareLinkAI. The seed script creates 8 detailed resident profiles with complete medical histories, assessments, incidents, family contacts, and caregiver assignments.

## Demo Data Summary

- **8 Residents** with varied care levels and medical conditions
- **35 Assessments** covering 8 different assessment types
- **18 Incidents** ranging from minor to severe
- **16 Family Contacts** with varied permission levels
- **12 Caregiver Assignments** linking residents to caregivers

## How to Run

### Prerequisites

1. Ensure you have run the main seed script first:
   ```bash
   npm run seed
   ```

2. Ensure caregiver demo data exists:
   ```bash
   npm run seed:caregivers
   ```

### Running the Seed Script

```bash
npm run seed:residents
```

Or directly:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-resident-demo-data.ts
```

### Resetting Data

The script is **idempotent** - it will clear existing demo data for the family and recreate it. You can safely run it multiple times without creating duplicates.

## Resident Profiles

### 1. Margaret "Maggie" Thompson 👵
- **Age**: 82 years old
- **Care Level**: Independent Living
- **Room**: 101
- **Status**: ACTIVE (2 years)
- **Medical Conditions**: Mild arthritis, well-controlled hypertension
- **Medications**: Lisinopril 10mg daily, Ibuprofen 400mg PRN
- **Allergies**: None known
- **Personality**: Very active, leads book club, participates in all activities
- **Assessments**: 5 (all excellent scores)
- **Incidents**: 0 (excellent record)
- **Family Contacts**: 1 (Daughter - visits weekly)
- **Caregiver Assignments**: 1 (weekly check-ins)

**Key Characteristics**:
- Role model resident
- Highly independent
- Socially engaged
- Excellent health for age

---

### 2. Robert "Bob" Chen 👴
- **Age**: 78 years old
- **Care Level**: Assisted Living
- **Room**: 205
- **Status**: ACTIVE (1 year)
- **Medical Conditions**: Type 2 diabetes, early-stage Parkinson's disease
- **Medications**: Metformin 1000mg twice daily, Carbidopa-Levodopa 25-100mg three times daily
- **Allergies**: Penicillin
- **Mobility**: Walker
- **Assessments**: 4 (moderate assistance needed)
- **Incidents**: 1 (minor fall 3 months ago, resolved)
- **Family Contacts**: 1 (Son - visits monthly)
- **Caregiver Assignments**: 2 (primary + backup)

**Key Characteristics**:
- Requires assistance with bathing and dressing
- Diabetic diet management
- Fall risk due to Parkinson's
- Good medication adherence

---

### 3. Dorothy Williams 👵
- **Age**: 89 years old
- **Care Level**: Memory Care
- **Room**: 301
- **Status**: ACTIVE (6 months)
- **Medical Conditions**: Alzheimer's disease (moderate stage), hypertension
- **Medications**: Donepezil 10mg daily, Amlodipine 5mg daily, Memantine 10mg twice daily
- **Allergies**: Sulfa drugs
- **Special Needs**: 24/7 supervision, structured routine
- **Assessments**: 5 (cognitive decline noted)
- **Incidents**: 3 (2 wandering, 1 behavioral/sundowning)
- **Family Contacts**: 3 (Daughter, Son, Granddaughter - frequent visits)
- **Caregiver Assignments**: 1 (memory care specialist)

**Key Characteristics**:
- Moderate cognitive impairment
- Wandering behavior
- Sundowning in evenings
- Responds well to music therapy
- Close family involvement

---

### 4. James "Jim" Martinez 👴
- **Age**: 85 years old
- **Care Level**: Skilled Nursing
- **Room**: 402
- **Status**: ACTIVE (3 months)
- **Medical Conditions**: Post-stroke (6 months ago), Type 2 diabetes, Congestive heart failure
- **Medications**: 8+ medications (cardiac, diabetes, pain management)
- **Allergies**: None known
- **Mobility**: Wheelchair-bound
- **Assessments**: 5 (high care needs)
- **Incidents**: 2 (medication error, pressure ulcer monitoring)
- **Family Contacts**: 2 (Spouse visits daily, Son visits 2-3x/week)
- **Caregiver Assignments**: 2 (skilled nursing + physical therapy)

**Key Characteristics**:
- Total care required
- Left-sided weakness from stroke
- Complex medication regimen
- Pressure ulcer prevention protocol
- Devoted family support

---

### 5. Eleanor "Ellie" Johnson 👵
- **Age**: 76 years old
- **Care Level**: Assisted Living
- **Room**: 208
- **Status**: ACTIVE (8 months)
- **Medical Conditions**: COPD, Osteoporosis
- **Medications**: Albuterol inhaler PRN, Tiotropium inhaler daily, Calcium supplements
- **Allergies**: Latex
- **Mobility**: Cane
- **Assessments**: 4 (stable condition)
- **Incidents**: 0 (no incidents)
- **Family Contacts**: 1 (Niece - visits twice monthly)
- **Caregiver Assignments**: 1 (assistance with bathing)

**Key Characteristics**:
- Enjoys gardening and art classes
- Respiratory management
- Good social engagement
- Independent with most ADLs
- Positive attitude

---

### 6. Harold Peterson 👴
- **Age**: 91 years old
- **Care Level**: Skilled Nursing
- **Room**: 405
- **Status**: ACTIVE (18 months)
- **Medical Conditions**: Advanced dementia, Coronary artery disease, Hypertension, Chronic pain
- **Medications**: Multiple cardiac meds, pain management (morphine PRN)
- **Allergies**: Codeine
- **Mobility**: Bed-bound
- **Assessments**: 4 (total care, palliative focus)
- **Incidents**: 4 (respiratory distress, fall from bed, behavioral, aspiration)
- **Family Contacts**: 2 (Daughter visits weekly, Son visits quarterly)
- **Caregiver Assignments**: 2 (primary + backup skilled nursing)

**Key Characteristics**:
- End-stage dementia
- Non-verbal
- Total care required
- Palliative care approach
- Comfort measures priority
- Complex medical history

---

### 7. Patricia "Pat" Davis 👵
- **Age**: 73 years old
- **Care Level**: Independent Living
- **Room**: 105
- **Status**: ACTIVE (4 months)
- **Medical Conditions**: Mild cognitive impairment (well-controlled), Hypertension
- **Medications**: Amlodipine 5mg daily, Low-dose aspirin, Multivitamin
- **Allergies**: None known
- **Mobility**: Independent
- **Assessments**: 3 (excellent functional status)
- **Incidents**: 0 (excellent record)
- **Family Contacts**: 2 (Son visits 2-3x/week, Daughter visits monthly)
- **Caregiver Assignments**: 1 (weekly wellness checks)

**Key Characteristics**:
- Very active and independent
- Volunteers in activity programs
- Exercises daily
- Excellent health for age
- Large, supportive family

---

### 8. William "Bill" Anderson 👴
- **Age**: 87 years old
- **Care Level**: Memory Care
- **Room**: 305
- **Status**: ACTIVE (10 months)
- **Medical Conditions**: Vascular dementia, Hypertension, Type 2 diabetes
- **Medications**: Donepezil 10mg daily, Amlodipine 10mg daily, Metformin 1000mg twice daily
- **Allergies**: Shellfish
- **Special Needs**: Structured activities, supervision
- **Assessments**: 5 (moderate cognitive impairment)
- **Incidents**: 4 (3 wandering attempts, 1 fall)
- **Family Contacts**: 2 (Son visits twice weekly, Daughter visits weekly)
- **Caregiver Assignments**: 1 (memory care specialist)

**Key Characteristics**:
- Moderate dementia
- Wandering behavior
- Requires supervision
- Responds well to structured routine
- Enjoys music and simple games
- Involved family

---

## Data Distribution

### By Care Level
| Care Level | Count | Residents |
|------------|-------|-----------|
| **Independent Living** | 2 (25%) | Maggie Thompson, Pat Davis |
| **Assisted Living** | 2 (25%) | Bob Chen, Ellie Johnson |
| **Memory Care** | 2 (25%) | Dorothy Williams, Bill Anderson |
| **Skilled Nursing** | 2 (25%) | Jim Martinez, Harold Peterson |

### By Age Range
| Age Range | Count | Residents |
|-----------|-------|-----------|
| **70-79** | 2 (25%) | Bob Chen (78), Pat Davis (73) |
| **80-89** | 4 (50%) | Maggie (82), Dorothy (89), Jim (85), Bill (87) |
| **90+** | 2 (25%) | Harold (91), Ellie (76) |

### By Gender
| Gender | Count | Percentage |
|--------|-------|------------|
| **Female** | 4 (50%) | Maggie, Dorothy, Ellie, Pat |
| **Male** | 4 (50%) | Bob, Jim, Harold, Bill |

### By Admission Length
| Duration | Count | Residents |
|----------|-------|-----------|
| **0-6 months** | 2 | Jim (3 months), Pat (4 months) |
| **6-12 months** | 3 | Dorothy (6 months), Ellie (8 months), Bill (10 months) |
| **1-2 years** | 2 | Bob (1 year), Harold (18 months) |
| **2+ years** | 1 | Maggie (2 years) |

## Assessment Types

All 8 assessment types are represented across the residents:

1. **ADL (Activities of Daily Living)** - All residents
2. **Cognitive** - Memory care and dementia residents
3. **Nutritional** - Most residents
4. **Medication** - Complex medication regimens
5. **Fall Risk** - Most residents
6. **Pain** - Residents with chronic pain
7. **Social** - Active residents
8. **Physical** - Independent residents
9. **Behavioral** - Memory care residents
10. **Respiratory** - COPD resident (Ellie)
11. **Skin Integrity** - Bed-bound residents

## Incident Types

Realistic incidents across severity levels:

- **FALL_NO_INJURY** - 3 incidents
- **MEDICATION_ERROR_MISSED_DOSE** - 1 incident
- **BEHAVIORAL_WANDERING** - 6 incidents
- **BEHAVIORAL_AGITATION** - 2 incidents
- **SKIN_BREAKDOWN** - 1 incident
- **MEDICAL_RESPIRATORY** - 1 incident
- **FALL_FROM_BED** - 1 incident
- **CHOKING_ASPIRATION** - 1 incident

**Severity Distribution**:
- Minor: 6 (33%)
- Moderate: 11 (61%)
- Severe: 1 (6%)

**Status Distribution**:
- Resolved: 17 (94%)
- Under Review: 1 (6%)

## Family Contact Permission Levels

- **FULL_ACCESS**: 11 contacts (69%)
- **LIMITED_ACCESS**: 2 contacts (12%)
- **VIEW_ONLY**: 3 contacts (19%)

## Testing the Demo Data

### 1. View Residents List
Navigate to `/operator/residents` to see all 8 residents with:
- Profile photos
- Care level badges
- Room numbers
- Status indicators
- Assessment and incident counts

### 2. View Individual Resident
Click any resident to see:
- **Overview Tab**: Complete profile, medical conditions, medications, allergies
- **Assessments Tab**: All assessments with scores and recommendations
- **Incidents Tab**: Incident history with severity and resolution status
- **Family Tab**: Family contacts with permission levels
- **Compliance Tab**: Compliance items with expiry tracking

### 3. Filter and Search
Test filtering by:
- Care Level (Independent, Assisted, Memory Care, Skilled Nursing)
- Status (Active, Inactive, etc.)
- Search by name (e.g., "Thompson", "Bob")

### 4. Caregiver Assignments
Navigate to `/operator/caregivers` to see:
- Caregivers with resident assignments
- Primary vs. backup assignments
- Assignment start dates

## Troubleshooting

### Error: No operator found
Run the main seed script first:
```bash
npm run seed
```

### Error: No caregivers found
Run the caregiver seed script:
```bash
npm run seed:caregivers
```

### Error: No family user found
Ensure the main seed script has created at least one family user.

### Duplicate Data
The script automatically clears existing demo data before creating new records. Simply re-run the script.

## Customization

To modify the demo data:

1. Edit `/home/ubuntu/carelinkai-project/prisma/seed-resident-demo-data.ts`
2. Modify resident profiles, assessments, incidents, or family contacts
3. Re-run the seed script: `npm run seed:residents`

## Next Steps

After seeding the demo data:

1. **Test all resident features** in the operator portal
2. **Verify RBAC permissions** work correctly for different user roles
3. **Test filtering and search** functionality
4. **Review assessment and incident** workflows
5. **Verify family contact** permissions and communication preferences
6. **Test caregiver assignments** and assignment management

## Related Documentation

- [Phase 2 Implementation Summary](./PHASE_2_IMPLEMENTATION_SUMMARY.md) - Assessments and Incidents
- [Phase 3 Implementation Summary](./PHASE_3_IMPLEMENTATION_SUMMARY.md) - Compliance and Family Contacts
- [Caregiver Demo Data](./CAREGIVER_DEMO_DATA.md) - Caregiver seed data documentation
- [Prisma Schema](./prisma/schema.prisma) - Database schema reference

## Support

For issues or questions about the demo data:
1. Check the console output when running the seed script
2. Review the Prisma schema for model relationships
3. Verify all prerequisite seed scripts have been run
4. Check database connections in `.env` file

---

**Last Updated**: December 11, 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
