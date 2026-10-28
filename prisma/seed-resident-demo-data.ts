/**
 * Comprehensive Demo Data Seed Script for Residents Module
 * Creates 8-10 demo residents with complete assessments, incidents, family members, and caregiver assignments
 * 
 * Run with: npm run seed:residents
 * or: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-resident-demo-data.ts
 */

import { PrismaClient, ResidentStatus, ComplianceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to calculate date from years ago
function yearsAgo(years: number, monthOffset = 0): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  if (monthOffset) {
    date.setMonth(date.getMonth() - monthOffset);
  }
  return date;
}

// Helper function to get days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Helper function to get months ago
function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

async function main() {
  console.log('🏥 Starting Comprehensive Resident Demo Data Seed...\n');

  // Get existing operator and home
  const operator = await prisma.operator.findFirst({
    include: { user: true }
  });

  if (!operator) {
    throw new Error('❌ No operator found. Please run main seed first.');
  }

  const home = await prisma.assistedLivingHome.findFirst({
    where: { operatorId: operator.id }
  });

  if (!home) {
    throw new Error('❌ No home found for operator. Please run main seed first.');
  }

  // Get existing caregivers
  const caregivers = await prisma.caregiver.findMany({
    take: 8,
    include: { user: true }
  });

  if (caregivers.length === 0) {
    throw new Error('❌ No caregivers found. Please run caregiver seed first.');
  }

  console.log(`👥 Found ${caregivers.length} caregivers for assignments`);

  // Get or create family users
  const familyUser = await prisma.user.findFirst({
    where: { role: 'FAMILY' }
  });

  if (!familyUser) {
    throw new Error('❌ No family user found. Please run main seed first.');
  }

  const family = await prisma.family.findFirst({
    where: { userId: familyUser.id }
  });

  if (!family) {
    throw new Error('❌ No family found. Please run main seed first.');
  }

  // Clear existing demo data (for idempotency)
  console.log('🧹 Clearing existing demo resident data...\n');
  
  const existingResidents = await prisma.resident.findMany({
    where: {
      familyId: family.id
    }
  });

  for (const resident of existingResidents) {
    await prisma.caregiverAssignment.deleteMany({ where: { residentId: resident.id } });
    await prisma.familyContact.deleteMany({ where: { residentId: resident.id } });
    await prisma.residentIncident.deleteMany({ where: { residentId: resident.id } });
    await prisma.assessmentResult.deleteMany({ where: { residentId: resident.id } });
    await prisma.residentComplianceItem.deleteMany({ where: { residentId: resident.id } });
    await prisma.residentContact.deleteMany({ where: { residentId: resident.id } });
    await prisma.residentNote.deleteMany({ where: { residentId: resident.id } });
    await prisma.careTimelineEvent.deleteMany({ where: { residentId: resident.id } });
  }

  await prisma.resident.deleteMany({
    where: { familyId: family.id }
  });

  console.log('✅ Existing data cleared\n');

  // Track counts
  let residentCount = 0;
  let assessmentCount = 0;
  let incidentCount = 0;
  let familyContactCount = 0;
  let assignmentCount = 0;

  // ============================================================
  // RESIDENT 1: Margaret "Maggie" Thompson
  // ============================================================
  console.log('👵 Creating Resident 1: Margaret "Maggie" Thompson...');
  
  const maggie = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Margaret',
      lastName: 'Thompson',
      dateOfBirth: yearsAgo(82),
      gender: 'FEMALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: yearsAgo(2),
      photoUrl: 'https://i.pravatar.cc/300?img=45',
      medicalConditions: 'Mild arthritis, well-controlled hypertension',
      medications: 'Lisinopril 10mg daily, Ibuprofen 400mg PRN',
      allergies: 'None known',
      dietaryRestrictions: 'No restrictions',
      careNeeds: {
        careLevel: 'Independent Living',
        roomNumber: '101',
        mobilityAids: 'None',
        notes: 'Very active, leads book club, participates in all activities'
      }
    }
  });
  residentCount++;

  // Maggie's Assessments (5)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: maggie.id,
        type: 'ADL',
        score: 24,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(15),
        notes: 'Excellent independence in all activities of daily living. No assistance required.',
        recommendations: 'Continue current activity level. Encourage continued participation in social activities.',
        data: { bathing: 'independent', dressing: 'independent', eating: 'independent', toileting: 'independent', ambulation: 'independent' }
      },
      {
        residentId: maggie.id,
        type: 'COGNITIVE',
        score: 28,
        status: 'COMPLETED',
        conductedBy: 'Dr. Emily Watson',
        conductedAt: daysAgo(30),
        notes: 'Excellent cognitive function. Sharp memory, oriented to person, place, and time.',
        recommendations: 'Continue mental stimulation activities. No concerns at this time.'
      },
      {
        residentId: maggie.id,
        type: 'FALL_RISK',
        score: 5,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(45),
        notes: 'Low fall risk. Good balance and gait. No mobility issues.',
        recommendations: 'Continue regular exercise routine. Annual reassessment.'
      },
      {
        residentId: maggie.id,
        type: 'NUTRITIONAL',
        score: 22,
        status: 'COMPLETED',
        conductedBy: 'Lisa Martinez, RD',
        conductedAt: daysAgo(20),
        notes: 'Excellent nutritional status. Maintains healthy weight. Good appetite.',
        recommendations: 'Continue current diet. No modifications needed.'
      },
      {
        residentId: maggie.id,
        type: 'SOCIAL',
        score: 25,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(10),
        notes: 'Highly engaged socially. Leads book club and participates in all group activities.',
        recommendations: 'Continue facilitating social engagement opportunities.'
      }
    ]
  });
  assessmentCount += 5;

  // Maggie's Incidents (0 - excellent record)

  // Maggie's Family Contacts (1)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: maggie.id,
        name: 'Susan Thompson-Reed',
        relationship: 'Daughter',
        phone: '(555) 234-5678',
        email: 'susan.reed@email.com',
        address: '123 Maple Street, Springfield, IL 62701',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits every Sunday. Very attentive and involved.',
        lastContactDate: daysAgo(7)
      }
    ]
  });
  familyContactCount += 1;

  // Maggie's Caregiver Assignment (1)
  await prisma.caregiverAssignment.create({
    data: {
      caregiverId: caregivers[0].id,
      residentId: maggie.id,
      isPrimary: true,
      startDate: yearsAgo(2),
      notes: 'Check-in weekly, minimal assistance needed',
      assignedBy: operator.userId
    }
  });
  assignmentCount += 1;

  // ============================================================
  // RESIDENT 2: Robert "Bob" Chen
  // ============================================================
  console.log('👴 Creating Resident 2: Robert "Bob" Chen...');
  
  const bob = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Robert',
      lastName: 'Chen',
      dateOfBirth: yearsAgo(78),
      gender: 'MALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: yearsAgo(1),
      photoUrl: 'https://i.pravatar.cc/300?img=12',
      medicalConditions: 'Type 2 diabetes, early-stage Parkinson\'s disease',
      medications: 'Metformin 1000mg twice daily, Carbidopa-Levodopa 25-100mg three times daily',
      allergies: 'Penicillin',
      dietaryRestrictions: 'Diabetic diet, low sodium',
      careNeeds: {
        careLevel: 'Assisted Living',
        roomNumber: '205',
        mobilityAids: 'Walker',
        notes: 'Requires assistance with bathing and dressing. Uses walker for mobility.'
      }
    }
  });
  residentCount++;

  // Bob's Assessments (4)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: bob.id,
        type: 'ADL',
        score: 18,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(10),
        notes: 'Moderate assistance needed for bathing and dressing. Independent with eating and toileting.',
        recommendations: 'Continue assistance with ADLs. Monitor for any decline in function.',
        data: { bathing: 'assisted', dressing: 'assisted', eating: 'independent', toileting: 'independent', ambulation: 'walker' }
      },
      {
        residentId: bob.id,
        type: 'MEDICATION',
        score: 20,
        status: 'COMPLETED',
        conductedBy: 'Emily Rodriguez, PharmD',
        conductedAt: daysAgo(25),
        notes: 'Requires medication reminders. All medications administered by staff.',
        recommendations: 'Continue current medication management protocol.'
      },
      {
        residentId: bob.id,
        type: 'FALL_RISK',
        score: 12,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(90),
        notes: 'Moderate fall risk due to Parkinson\'s tremors and balance issues.',
        recommendations: 'Continue use of walker. Physical therapy twice weekly for balance training.'
      },
      {
        residentId: bob.id,
        type: 'NUTRITIONAL',
        score: 19,
        status: 'COMPLETED',
        conductedBy: 'Lisa Martinez, RD',
        conductedAt: daysAgo(35),
        notes: 'Following diabetic diet well. Blood sugar levels stable.',
        recommendations: 'Continue diabetic meal plan. Monitor blood glucose daily.'
      }
    ]
  });
  assessmentCount += 4;

  // Bob's Incidents (1)
  await prisma.residentIncident.create({
    data: {
      residentId: bob.id,
      type: 'FALL_NO_INJURY',
      severity: 'MINOR',
      status: 'RESOLVED',
      occurredAt: monthsAgo(3),
      description: 'Resident lost balance while reaching for water glass. No injuries sustained.',
      location: 'Dining room',
      reportedBy: 'Mary Thompson, CNA',
      reportedAt: monthsAgo(3),
      witnessedBy: 'Mary Thompson, CNA; John Davis, resident',
      actionsTaken: 'Assisted resident to sitting position. Full assessment completed. No injuries found. Reminded to use call button.',
      followUpRequired: false,
      resolutionNotes: 'No injuries. Resident reminded to ask for assistance. Walker positioned closer.',
      resolvedAt: monthsAgo(3),
      resolvedBy: 'Sarah Johnson, RN'
    }
  });
  incidentCount += 1;

  // Bob's Family Contacts (1)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: bob.id,
        name: 'David Chen',
        relationship: 'Son',
        phone: '(555) 345-6789',
        email: 'david.chen@email.com',
        address: '456 Oak Avenue, Chicago, IL 60614',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Lives out of state. Visits monthly. Prefers email updates.',
        lastContactDate: daysAgo(30)
      }
    ]
  });
  familyContactCount += 1;

  // Bob's Caregiver Assignments (2)
  await prisma.caregiverAssignment.createMany({
    data: [
      {
        caregiverId: caregivers[1].id,
        residentId: bob.id,
        isPrimary: true,
        startDate: yearsAgo(1),
        notes: 'Primary caregiver for ADL assistance',
        assignedBy: operator.userId
      },
      {
        caregiverId: caregivers[2].id,
        residentId: bob.id,
        isPrimary: false,
        startDate: yearsAgo(1),
        notes: 'Backup caregiver for medication administration',
        assignedBy: operator.userId
      }
    ]
  });
  assignmentCount += 2;

  // ============================================================
  // RESIDENT 3: Dorothy Williams
  // ============================================================
  console.log('👵 Creating Resident 3: Dorothy Williams...');
  
  const dorothy = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Dorothy',
      lastName: 'Williams',
      dateOfBirth: yearsAgo(89),
      gender: 'FEMALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(6),
      photoUrl: 'https://i.pravatar.cc/300?img=47',
      medicalConditions: 'Alzheimer\'s disease (moderate stage), hypertension',
      medications: 'Donepezil 10mg daily, Amlodipine 5mg daily, Memantine 10mg twice daily',
      allergies: 'Sulfa drugs',
      dietaryRestrictions: 'Regular diet, finger foods preferred',
      careNeeds: {
        careLevel: 'Memory Care',
        roomNumber: '301',
        mobilityAids: 'None',
        notes: 'Memory care unit. Requires 24/7 supervision. Structured daily routine essential.'
      }
    }
  });
  residentCount++;

  // Dorothy's Assessments (5)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: dorothy.id,
        type: 'COGNITIVE',
        score: 12,
        status: 'COMPLETED',
        conductedBy: 'Dr. Emily Watson',
        conductedAt: daysAgo(14),
        notes: 'Moderate cognitive decline. Difficulty with recent memory. Oriented to self but not consistently to place or time.',
        recommendations: 'Continue memory care program. Maintain structured routine. Family photos and familiar items in room.'
      },
      {
        residentId: dorothy.id,
        type: 'ADL',
        score: 14,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(20),
        notes: 'Requires assistance with most ADLs. Can feed self with supervision.',
        recommendations: 'Continue full assistance with bathing, dressing, and toileting. Supervise meals.',
        data: { bathing: 'full_assist', dressing: 'full_assist', eating: 'supervised', toileting: 'assisted', ambulation: 'supervised' }
      },
      {
        residentId: dorothy.id,
        type: 'BEHAVIORAL',
        score: 15,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(7),
        notes: 'Occasional agitation in the evenings (sundowning). Responds well to redirection and calming activities.',
        recommendations: 'Implement sundowning protocol. Music therapy in evenings. Maintain calm environment.'
      },
      {
        residentId: dorothy.id,
        type: 'FALL_RISK',
        score: 10,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(25),
        notes: 'Moderate fall risk due to confusion and wandering behavior.',
        recommendations: 'Close supervision. Non-slip footwear. Bed alarm at night.'
      },
      {
        residentId: dorothy.id,
        type: 'SOCIAL',
        score: 10,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(15),
        notes: 'Participates in structured activities with staff guidance. Enjoys music and simple crafts.',
        recommendations: 'Continue structured activities. Music therapy twice weekly.'
      }
    ]
  });
  assessmentCount += 5;

  // Dorothy's Incidents (3)
  await prisma.residentIncident.createMany({
    data: [
      {
        residentId: dorothy.id,
        type: 'BEHAVIORAL_WANDERING',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: daysAgo(45),
        description: 'Resident found attempting to exit facility through side door. Appeared confused and anxious.',
        location: 'West wing exit',
        reportedBy: 'Security Staff',
        reportedAt: daysAgo(45),
        witnessedBy: 'Security Officer James Wilson',
        actionsTaken: 'Gently redirected to activity room. Offered snack and music therapy. Remained calm.',
        followUpRequired: false,
        resolutionNotes: 'Enhanced monitoring implemented. Door alarm checked and functional.',
        resolvedAt: daysAgo(45),
        resolvedBy: 'Sarah Johnson, RN'
      },
      {
        residentId: dorothy.id,
        type: 'BEHAVIORAL_WANDERING',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: daysAgo(30),
        description: 'Resident entered another resident\'s room. No distress observed.',
        location: 'Room 305',
        reportedBy: 'Mary Thompson, CNA',
        reportedAt: daysAgo(30),
        witnessedBy: 'Mary Thompson, CNA',
        actionsTaken: 'Gently redirected to own room. Engaged in activity.',
        followUpRequired: false,
        resolutionNotes: 'Room identification enhanced with familiar photos.',
        resolvedAt: daysAgo(30),
        resolvedBy: 'Emily Rodriguez, RN'
      },
      {
        residentId: dorothy.id,
        type: 'BEHAVIORAL_AGITATION',
        severity: 'MINOR',
        status: 'RESOLVED',
        occurredAt: daysAgo(12),
        description: 'Resident became agitated during evening hours (sundowning). Refused care.',
        location: 'Room 301',
        reportedBy: 'Emily Rodriguez, RN',
        reportedAt: daysAgo(12),
        witnessedBy: 'Emily Rodriguez, RN',
        actionsTaken: 'Staff stepped back. Calming music played. Offered favorite snack. Resident calmed within 15 minutes.',
        followUpRequired: false,
        resolutionNotes: 'Sundowning protocol effective. Family notified.',
        resolvedAt: daysAgo(12),
        resolvedBy: 'Emily Rodriguez, RN'
      }
    ]
  });
  incidentCount += 3;

  // Dorothy's Family Contacts (3)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: dorothy.id,
        name: 'Patricia Williams-Stone',
        relationship: 'Daughter',
        phone: '(555) 456-7890',
        email: 'patricia.stone@email.com',
        address: '789 Elm Street, Springfield, IL 62702',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits 3-4 times per week. Primary decision maker. Healthcare POA.',
        lastContactDate: daysAgo(2)
      },
      {
        residentId: dorothy.id,
        name: 'Robert Williams Jr.',
        relationship: 'Son',
        phone: '(555) 567-8901',
        email: 'rob.williams@email.com',
        address: '234 Pine Road, Decatur, IL 62521',
        isPrimaryContact: false,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Visits weekly. Handles financial matters.',
        lastContactDate: daysAgo(7)
      },
      {
        residentId: dorothy.id,
        name: 'Jennifer Stone',
        relationship: 'Granddaughter',
        phone: '(555) 678-9012',
        email: 'jenny.stone@email.com',
        isPrimaryContact: false,
        permissionLevel: 'VIEW_ONLY',
        contactPreference: 'TEXT',
        notes: 'Visits on weekends. Very close relationship with grandmother.',
        lastContactDate: daysAgo(4)
      }
    ]
  });
  familyContactCount += 3;

  // Dorothy's Caregiver Assignment (1)
  await prisma.caregiverAssignment.create({
    data: {
      caregiverId: caregivers[3].id,
      residentId: dorothy.id,
      isPrimary: true,
      startDate: monthsAgo(6),
      notes: 'Memory care specialist. Full ADL assistance.',
      assignedBy: operator.userId
    }
  });
  assignmentCount += 1;

  // ============================================================
  // RESIDENT 4: James "Jim" Martinez
  // ============================================================
  console.log('👴 Creating Resident 4: James "Jim" Martinez...');
  
  const jim = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'James',
      lastName: 'Martinez',
      dateOfBirth: yearsAgo(85),
      gender: 'MALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(3),
      photoUrl: 'https://i.pravatar.cc/300?img=11',
      medicalConditions: 'Post-stroke (6 months ago), Type 2 diabetes, Congestive heart failure',
      medications: 'Aspirin 81mg daily, Metformin 1000mg twice daily, Furosemide 40mg daily, Lisinopril 20mg daily, Atorvastatin 40mg daily, Carvedilol 12.5mg twice daily, Insulin glargine 20 units at bedtime, Insulin lispro sliding scale',
      allergies: 'None known',
      dietaryRestrictions: 'Low sodium, diabetic diet, heart-healthy',
      careNeeds: {
        careLevel: 'Skilled Nursing',
        roomNumber: '402',
        mobilityAids: 'Wheelchair',
        notes: 'Wheelchair-bound. High care needs. Requires frequent monitoring. Left-sided weakness from stroke.'
      }
    }
  });
  residentCount++;

  // Jim's Assessments (5)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: jim.id,
        type: 'ADL',
        score: 8,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(5),
        notes: 'Total dependence for all ADLs. Left-sided weakness limits participation.',
        recommendations: 'Full assistance required. Continue physical therapy for strengthening. Pressure ulcer prevention protocol.',
        data: { bathing: 'full_assist', dressing: 'full_assist', eating: 'assisted', toileting: 'full_assist', ambulation: 'wheelchair' }
      },
      {
        residentId: jim.id,
        type: 'MEDICATION',
        score: 15,
        status: 'COMPLETED',
        conductedBy: 'Emily Rodriguez, PharmD',
        conductedAt: daysAgo(10),
        notes: 'Complex medication regimen. All medications administered by nursing staff. Blood glucose monitoring 4 times daily.',
        recommendations: 'Continue current medication management. Weekly pharmacy review.'
      },
      {
        residentId: jim.id,
        type: 'FALL_RISK',
        score: 18,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(15),
        notes: 'High fall risk due to wheelchair dependence and left-sided weakness. Requires assistance for all transfers.',
        recommendations: 'Two-person assist for transfers. Wheelchair positioned for safety. Bed alarm at night.'
      },
      {
        residentId: jim.id,
        type: 'SKIN_INTEGRITY',
        score: 16,
        status: 'COMPLETED',
        conductedBy: 'Lisa Thompson, WOCN',
        conductedAt: daysAgo(7),
        notes: 'Small pressure ulcer on left heel (Stage 2). Treatment in progress.',
        recommendations: 'Continue pressure ulcer treatment protocol. Reposition every 2 hours. Pressure-relieving mattress in use.'
      },
      {
        residentId: jim.id,
        type: 'NUTRITIONAL',
        score: 14,
        status: 'COMPLETED',
        conductedBy: 'Lisa Martinez, RD',
        conductedAt: daysAgo(12),
        notes: 'Requires assistance with feeding. Appetite fair. Weight stable.',
        recommendations: 'Continue assistance with meals. High-protein supplements. Monitor weight weekly.'
      }
    ]
  });
  assessmentCount += 5;

  // Jim's Incidents (2)
  await prisma.residentIncident.createMany({
    data: [
      {
        residentId: jim.id,
        type: 'MEDICATION_ERROR_MISSED_DOSE',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: monthsAgo(1),
        description: 'Morning insulin dose not documented. Unable to confirm if administered.',
        location: 'Room 402',
        reportedBy: 'Emily Rodriguez, RN',
        reportedAt: monthsAgo(1),
        witnessedBy: null,
        actionsTaken: 'Blood glucose checked immediately (180 mg/dL). Physician notified. Dose administered per MD order. Extra monitoring for 24 hours.',
        followUpRequired: false,
        resolutionNotes: 'Blood glucose remained stable. Additional staff training on documentation completed. Incident reviewed with entire nursing staff.',
        resolvedAt: monthsAgo(1),
        resolvedBy: 'Dr. Michael Patterson'
      },
      {
        residentId: jim.id,
        type: 'SKIN_BREAKDOWN',
        severity: 'MODERATE',
        status: 'UNDER_REVIEW',
        occurredAt: daysAgo(21),
        description: 'Small pressure ulcer noted on left heel (Stage 2).',
        location: 'Room 402',
        reportedBy: 'Mary Thompson, CNA',
        reportedAt: daysAgo(21),
        witnessedBy: 'Mary Thompson, CNA',
        actionsTaken: 'WOCN consulted. Treatment protocol initiated. Heel off-loading boot applied. Repositioning schedule enhanced.',
        followUpRequired: true,
        resolutionNotes: null,
        resolvedAt: null,
        resolvedBy: null
      }
    ]
  });
  incidentCount += 2;

  // Jim's Family Contacts (2)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: jim.id,
        name: 'Maria Martinez',
        relationship: 'Spouse',
        phone: '(555) 789-0123',
        email: 'maria.martinez@email.com',
        address: '567 Cedar Lane, Springfield, IL 62703',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits daily. Healthcare POA. Very involved in care decisions.',
        lastContactDate: daysAgo(1)
      },
      {
        residentId: jim.id,
        name: 'Carlos Martinez',
        relationship: 'Son',
        phone: '(555) 890-1234',
        email: 'carlos.martinez@email.com',
        address: '890 Birch Avenue, Peoria, IL 61602',
        isPrimaryContact: false,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Visits 2-3 times per week. Handles financial matters.',
        lastContactDate: daysAgo(3)
      }
    ]
  });
  familyContactCount += 2;

  // Jim's Caregiver Assignments (2)
  await prisma.caregiverAssignment.createMany({
    data: [
      {
        caregiverId: caregivers[4].id,
        residentId: jim.id,
        isPrimary: true,
        startDate: monthsAgo(3),
        notes: 'Primary skilled nursing care. Medication management.',
        assignedBy: operator.userId
      },
      {
        caregiverId: caregivers[5].id,
        residentId: jim.id,
        isPrimary: false,
        startDate: monthsAgo(3),
        notes: 'Physical therapy and mobility assistance.',
        assignedBy: operator.userId
      }
    ]
  });
  assignmentCount += 2;

  // ============================================================
  // RESIDENT 5: Eleanor "Ellie" Johnson
  // ============================================================
  console.log('👵 Creating Resident 5: Eleanor "Ellie" Johnson...');
  
  const ellie = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Eleanor',
      lastName: 'Johnson',
      dateOfBirth: yearsAgo(76),
      gender: 'FEMALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(8),
      photoUrl: 'https://i.pravatar.cc/300?img=44',
      medicalConditions: 'COPD (Chronic Obstructive Pulmonary Disease), Osteoporosis',
      medications: 'Albuterol inhaler PRN, Tiotropium inhaler daily, Calcium 600mg with Vitamin D daily, Alendronate 70mg weekly',
      allergies: 'Latex',
      dietaryRestrictions: 'No restrictions, calcium-rich foods encouraged',
      careNeeds: {
        careLevel: 'Assisted Living',
        roomNumber: '208',
        mobilityAids: 'Cane',
        notes: 'Requires assistance with some ADLs. Oxygen PRN for shortness of breath. Enjoys gardening and art classes.'
      }
    }
  });
  residentCount++;

  // Ellie's Assessments (4)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: ellie.id,
        type: 'ADL',
        score: 19,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(18),
        notes: 'Requires minimal to moderate assistance. Independent with most activities except bathing.',
        recommendations: 'Continue assistance as needed. Encourage independence where safe.',
        data: { bathing: 'assisted', dressing: 'independent', eating: 'independent', toileting: 'independent', ambulation: 'cane' }
      },
      {
        residentId: ellie.id,
        type: 'RESPIRATORY',
        score: 16,
        status: 'COMPLETED',
        conductedBy: 'Dr. Sarah Williams, Pulmonologist',
        conductedAt: daysAgo(30),
        notes: 'COPD stable. Occasional dyspnea with exertion. Using rescue inhaler 2-3 times per week.',
        recommendations: 'Continue current medication regimen. Encourage participation in activities within tolerance. Oxygen available PRN.'
      },
      {
        residentId: ellie.id,
        type: 'FALL_RISK',
        score: 9,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(40),
        notes: 'Moderate fall risk due to osteoporosis and cane use. Good safety awareness.',
        recommendations: 'Continue cane use. Non-slip footwear. Physical therapy for strength and balance.'
      },
      {
        residentId: ellie.id,
        type: 'SOCIAL',
        score: 22,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(20),
        notes: 'Very socially engaged. Participates in gardening club and art classes. Positive mood.',
        recommendations: 'Continue facilitating creative activities. Very good social integration.'
      }
    ]
  });
  assessmentCount += 4;

  // Ellie's Incidents (0 - no incidents)

  // Ellie's Family Contacts (1)
  await prisma.familyContact.create({
    data: {
      residentId: ellie.id,
      name: 'Laura Johnson-Peters',
      relationship: 'Niece',
      phone: '(555) 901-2345',
      email: 'laura.peters@email.com',
      address: '345 Willow Drive, Bloomington, IL 61701',
      isPrimaryContact: true,
      permissionLevel: 'FULL_ACCESS',
      contactPreference: 'EMAIL',
      notes: 'Primary contact and healthcare POA. Visits twice monthly. Very supportive.',
      lastContactDate: daysAgo(14)
    }
  });
  familyContactCount += 1;

  // Ellie's Caregiver Assignment (1)
  await prisma.caregiverAssignment.create({
    data: {
      caregiverId: caregivers[6].id,
      residentId: ellie.id,
      isPrimary: true,
      startDate: monthsAgo(8),
      notes: 'Assistance with bathing and activities.',
      assignedBy: operator.userId
    }
  });
  assignmentCount += 1;

  // ============================================================
  // RESIDENT 6: Harold Peterson
  // ============================================================
  console.log('👴 Creating Resident 6: Harold Peterson...');
  
  const harold = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Harold',
      lastName: 'Peterson',
      dateOfBirth: yearsAgo(91),
      gender: 'MALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(18),
      photoUrl: 'https://i.pravatar.cc/300?img=13',
      medicalConditions: 'Advanced dementia, Coronary artery disease, Hypertension, Chronic pain',
      medications: 'Memantine 20mg daily, Aspirin 81mg daily, Metoprolol 50mg twice daily, Amlodipine 10mg daily, Acetaminophen 650mg every 6 hours PRN, Morphine 5mg every 4 hours PRN for breakthrough pain',
      allergies: 'Codeine',
      dietaryRestrictions: 'Pureed diet, thickened liquids (nectar consistency)',
      careNeeds: {
        careLevel: 'Skilled Nursing',
        roomNumber: '405',
        mobilityAids: 'Bed-bound',
        notes: 'Total care. Palliative focus. Bed-bound. Non-verbal. Comfort care measures in place.'
      }
    }
  });
  residentCount++;

  // Harold's Assessments (4)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: harold.id,
        type: 'ADL',
        score: 0,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(8),
        notes: 'Total dependence for all ADLs. Bed-bound. Requires full assistance.',
        recommendations: 'Continue total care. Turn and reposition every 2 hours. Maintain skin integrity.',
        data: { bathing: 'full_assist', dressing: 'full_assist', eating: 'full_assist', toileting: 'full_assist', ambulation: 'bed_bound' }
      },
      {
        residentId: harold.id,
        type: 'COGNITIVE',
        score: 2,
        status: 'COMPLETED',
        conductedBy: 'Dr. Emily Watson',
        conductedAt: daysAgo(60),
        notes: 'Advanced dementia. Non-verbal. No response to verbal stimuli. End-stage.',
        recommendations: 'Continue comfort care measures. Maintain dignity and respect.'
      },
      {
        residentId: harold.id,
        type: 'PAIN',
        score: 18,
        status: 'COMPLETED',
        conductedBy: 'Dr. Robert Thompson, Palliative Care',
        conductedAt: daysAgo(10),
        notes: 'Chronic pain managed with scheduled and PRN medications. Non-verbal pain indicators monitored.',
        recommendations: 'Continue current pain management protocol. Monitor for non-verbal pain cues. Palliative care consult ongoing.'
      },
      {
        residentId: harold.id,
        type: 'SKIN_INTEGRITY',
        score: 12,
        status: 'COMPLETED',
        conductedBy: 'Lisa Thompson, WOCN',
        conductedAt: daysAgo(14),
        notes: 'Skin intact. High risk for pressure ulcers due to immobility.',
        recommendations: 'Continue pressure ulcer prevention protocol. Specialty mattress in use. Reposition every 2 hours. Skin barrier cream applied.'
      }
    ]
  });
  assessmentCount += 4;

  // Harold's Incidents (4)
  await prisma.residentIncident.createMany({
    data: [
      {
        residentId: harold.id,
        type: 'MEDICAL_RESPIRATORY',
        severity: 'SEVERE',
        status: 'RESOLVED',
        occurredAt: monthsAgo(4),
        description: 'Resident experienced respiratory distress. Oxygen saturation dropped to 85%.',
        location: 'Room 405',
        reportedBy: 'Emily Rodriguez, RN',
        reportedAt: monthsAgo(4),
        witnessedBy: 'Emily Rodriguez, RN',
        actionsTaken: 'Oxygen applied immediately. Physician notified. Respiratory therapy consulted. Chest x-ray ordered.',
        followUpRequired: false,
        resolutionNotes: 'Diagnosed with pneumonia. Treated with antibiotics. Oxygen continued. Family updated. Resident stabilized.',
        resolvedAt: monthsAgo(4),
        resolvedBy: 'Dr. Michael Patterson'
      },
      {
        residentId: harold.id,
        type: 'FALL_FROM_BED',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: monthsAgo(8),
        description: 'Resident found on floor next to bed. Bed rails were up.',
        location: 'Room 405',
        reportedBy: 'Mary Thompson, CNA',
        reportedAt: monthsAgo(8),
        witnessedBy: 'Unwitnessed',
        actionsTaken: 'Full assessment completed. No visible injuries. X-rays negative. Bed alarm installed.',
        followUpRequired: false,
        resolutionNotes: 'Low bed and floor mats implemented. Bed alarm functional. Family notified.',
        resolvedAt: monthsAgo(8),
        resolvedBy: 'Sarah Johnson, RN'
      },
      {
        residentId: harold.id,
        type: 'BEHAVIORAL_AGITATION',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: monthsAgo(2),
        description: 'Resident became agitated during care. Resisted repositioning.',
        location: 'Room 405',
        reportedBy: 'John Davis, CNA',
        reportedAt: monthsAgo(2),
        witnessedBy: 'John Davis, CNA',
        actionsTaken: 'Care paused. Calming music played. Pain medication administered. Resumed care after 30 minutes.',
        followUpRequired: false,
        resolutionNotes: 'Pain management optimized. Care approach adjusted to minimize discomfort.',
        resolvedAt: monthsAgo(2),
        resolvedBy: 'Emily Rodriguez, RN'
      },
      {
        residentId: harold.id,
        type: 'CHOKING_ASPIRATION',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: monthsAgo(6),
        description: 'Resident coughed during feeding. Possible aspiration.',
        location: 'Room 405',
        reportedBy: 'Mary Thompson, CNA',
        reportedAt: monthsAgo(6),
        witnessedBy: 'Mary Thompson, CNA',
        actionsTaken: 'Feeding stopped immediately. Resident positioned upright. Suction available. Vital signs monitored.',
        followUpRequired: false,
        resolutionNotes: 'Speech therapy consulted. Diet consistency reviewed and adjusted. Slower feeding pace implemented.',
        resolvedAt: monthsAgo(6),
        resolvedBy: 'Sarah Johnson, RN'
      }
    ]
  });
  incidentCount += 4;

  // Harold's Family Contacts (2)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: harold.id,
        name: 'Linda Peterson-Hayes',
        relationship: 'Daughter',
        phone: '(555) 012-3456',
        email: 'linda.hayes@email.com',
        address: '678 Spruce Street, Springfield, IL 62704',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits weekly. Healthcare POA. Understands palliative care plan.',
        lastContactDate: daysAgo(5)
      },
      {
        residentId: harold.id,
        name: 'Thomas Peterson',
        relationship: 'Son',
        phone: '(555) 123-4567',
        email: 'thomas.peterson@email.com',
        address: '901 Ash Avenue, St. Louis, MO 63101',
        isPrimaryContact: false,
        permissionLevel: 'LIMITED_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Lives out of state. Calls regularly. Visits quarterly.',
        lastContactDate: daysAgo(30)
      }
    ]
  });
  familyContactCount += 2;

  // Harold's Caregiver Assignments (2)
  await prisma.caregiverAssignment.createMany({
    data: [
      {
        caregiverId: caregivers[0].id,
        residentId: harold.id,
        isPrimary: true,
        startDate: monthsAgo(18),
        notes: 'Primary skilled nursing care. Total care. Palliative focus.',
        assignedBy: operator.userId
      },
      {
        caregiverId: caregivers[1].id,
        residentId: harold.id,
        isPrimary: false,
        startDate: monthsAgo(18),
        notes: 'Backup nursing care and pain management.',
        assignedBy: operator.userId
      }
    ]
  });
  assignmentCount += 2;

  // ============================================================
  // RESIDENT 7: Patricia "Pat" Davis
  // ============================================================
  console.log('👵 Creating Resident 7: Patricia "Pat" Davis...');
  
  const pat = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'Patricia',
      lastName: 'Davis',
      dateOfBirth: yearsAgo(73),
      gender: 'FEMALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(4),
      photoUrl: 'https://i.pravatar.cc/300?img=48',
      medicalConditions: 'Mild cognitive impairment (well-controlled), Hypertension',
      medications: 'Amlodipine 5mg daily, Low-dose aspirin 81mg daily, Multivitamin daily',
      allergies: 'None known',
      dietaryRestrictions: 'No restrictions',
      careNeeds: {
        careLevel: 'Independent Living',
        roomNumber: '105',
        mobilityAids: 'None',
        notes: 'Very active and independent. Volunteers in activity programs. Exercises daily. Excellent health for age.'
      }
    }
  });
  residentCount++;

  // Pat's Assessments (3)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: pat.id,
        type: 'ADL',
        score: 25,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(22),
        notes: 'Fully independent in all activities of daily living. Excellent functional status.',
        recommendations: 'Continue current activity level. No assistance needed.',
        data: { bathing: 'independent', dressing: 'independent', eating: 'independent', toileting: 'independent', ambulation: 'independent' }
      },
      {
        residentId: pat.id,
        type: 'COGNITIVE',
        score: 26,
        status: 'COMPLETED',
        conductedBy: 'Dr. Emily Watson',
        conductedAt: daysAgo(35),
        notes: 'Mild cognitive impairment stable. Memory strategies effective. Oriented and engaged.',
        recommendations: 'Continue cognitive stimulation activities. Annual monitoring.'
      },
      {
        residentId: pat.id,
        type: 'PHYSICAL',
        score: 24,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(50),
        notes: 'Excellent physical fitness. Exercises daily. Strong balance and endurance.',
        recommendations: 'Continue current exercise routine. Role model for other residents.'
      }
    ]
  });
  assessmentCount += 3;

  // Pat's Incidents (0 - excellent record)

  // Pat's Family Contacts (2)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: pat.id,
        name: 'Michael Davis',
        relationship: 'Son',
        phone: '(555) 234-5678',
        email: 'michael.davis@email.com',
        address: '456 Cherry Lane, Springfield, IL 62705',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits 2-3 times per week. Very close relationship.',
        lastContactDate: daysAgo(3)
      },
      {
        residentId: pat.id,
        name: 'Sarah Davis-Martinez',
        relationship: 'Daughter',
        phone: '(555) 345-6789',
        email: 'sarah.martinez@email.com',
        address: '789 Maple Court, Champaign, IL 61820',
        isPrimaryContact: false,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Visits monthly. Calls weekly.',
        lastContactDate: daysAgo(28)
      }
    ]
  });
  familyContactCount += 2;

  // Pat's Caregiver Assignment (1)
  await prisma.caregiverAssignment.create({
    data: {
      caregiverId: caregivers[2].id,
      residentId: pat.id,
      isPrimary: true,
      startDate: monthsAgo(4),
      notes: 'Weekly wellness check-ins. Minimal assistance needed.',
      assignedBy: operator.userId
    }
  });
  assignmentCount += 1;

  // ============================================================
  // RESIDENT 8: William "Bill" Anderson
  // ============================================================
  console.log('👴 Creating Resident 8: William "Bill" Anderson...');
  
  const bill = await prisma.resident.create({
    data: {
      familyId: family.id,
      homeId: home.id,
      firstName: 'William',
      lastName: 'Anderson',
      dateOfBirth: yearsAgo(87),
      gender: 'MALE',
      status: 'ACTIVE' as ResidentStatus,
      admissionDate: monthsAgo(10),
      photoUrl: 'https://i.pravatar.cc/300?img=14',
      medicalConditions: 'Vascular dementia, Hypertension, Type 2 diabetes',
      medications: 'Donepezil 10mg daily, Amlodipine 10mg daily, Metformin 1000mg twice daily',
      allergies: 'Shellfish',
      dietaryRestrictions: 'Diabetic diet, no shellfish',
      careNeeds: {
        careLevel: 'Memory Care',
        roomNumber: '305',
        mobilityAids: 'None',
        notes: 'Memory care unit. Requires structured activities and supervision. Wanders occasionally.'
      }
    }
  });
  residentCount++;

  // Bill's Assessments (5)
  await prisma.assessmentResult.createMany({
    data: [
      {
        residentId: bill.id,
        type: 'COGNITIVE',
        score: 15,
        status: 'COMPLETED',
        conductedBy: 'Dr. Emily Watson',
        conductedAt: daysAgo(16),
        notes: 'Moderate cognitive impairment due to vascular dementia. Memory deficits and confusion present.',
        recommendations: 'Continue structured routine. Memory care activities. Minimize environmental changes.'
      },
      {
        residentId: bill.id,
        type: 'ADL',
        score: 16,
        status: 'COMPLETED',
        conductedBy: 'Sarah Johnson, RN',
        conductedAt: daysAgo(20),
        notes: 'Requires moderate assistance with ADLs. Can perform some tasks with cueing.',
        recommendations: 'Continue assistance as needed. Use simple, step-by-step instructions.',
        data: { bathing: 'assisted', dressing: 'supervised', eating: 'supervised', toileting: 'assisted', ambulation: 'supervised' }
      },
      {
        residentId: bill.id,
        type: 'BEHAVIORAL',
        score: 17,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(12),
        notes: 'Occasional wandering behavior. Generally calm but can become confused. Responds well to redirection.',
        recommendations: 'Structured daily routine. Regular activities. Monitor for triggers of agitation.'
      },
      {
        residentId: bill.id,
        type: 'FALL_RISK',
        score: 11,
        status: 'COMPLETED',
        conductedBy: 'Michael Chen, PT',
        conductedAt: daysAgo(28),
        notes: 'Moderate fall risk due to confusion and wandering. Good physical mobility.',
        recommendations: 'Close supervision. Non-slip footwear. Clear pathways. Bed alarm at night.'
      },
      {
        residentId: bill.id,
        type: 'SOCIAL',
        score: 14,
        status: 'COMPLETED',
        conductedBy: 'Jennifer Parks, MSW',
        conductedAt: daysAgo(18),
        notes: 'Participates in structured activities. Enjoys music and simple games.',
        recommendations: 'Continue group activities. Music therapy beneficial.'
      }
    ]
  });
  assessmentCount += 5;

  // Bill's Incidents (4)
  await prisma.residentIncident.createMany({
    data: [
      {
        residentId: bill.id,
        type: 'BEHAVIORAL_WANDERING',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: daysAgo(60),
        description: 'Resident found attempting to leave building through emergency exit. Appeared confused.',
        location: 'Emergency exit, east wing',
        reportedBy: 'Security Staff',
        reportedAt: daysAgo(60),
        witnessedBy: 'Security Officer',
        actionsTaken: 'Gently redirected to activity room. Offered snack. Door alarm verified functional.',
        followUpRequired: false,
        resolutionNotes: 'Enhanced supervision implemented. Wander-alert system activated.',
        resolvedAt: daysAgo(60),
        resolvedBy: 'Emily Rodriguez, RN'
      },
      {
        residentId: bill.id,
        type: 'BEHAVIORAL_WANDERING',
        severity: 'MODERATE',
        status: 'RESOLVED',
        occurredAt: daysAgo(45),
        description: 'Resident entered another resident\'s room and became confused.',
        location: 'Room 307',
        reportedBy: 'Mary Thompson, CNA',
        reportedAt: daysAgo(45),
        witnessedBy: 'Mary Thompson, CNA',
        actionsTaken: 'Gently redirected to own room. Oriented to surroundings.',
        followUpRequired: false,
        resolutionNotes: 'Room identification enhanced with photos and name sign.',
        resolvedAt: daysAgo(45),
        resolvedBy: 'Sarah Johnson, RN'
      },
      {
        residentId: bill.id,
        type: 'BEHAVIORAL_WANDERING',
        severity: 'MINOR',
        status: 'RESOLVED',
        occurredAt: daysAgo(22),
        description: 'Resident found in wrong hallway, looking for dining room.',
        location: 'North hallway',
        reportedBy: 'John Davis, CNA',
        reportedAt: daysAgo(22),
        witnessedBy: 'John Davis, CNA',
        actionsTaken: 'Escorted to dining room. No distress noted.',
        followUpRequired: false,
        resolutionNotes: 'Routine maintained. No further intervention needed.',
        resolvedAt: daysAgo(22),
        resolvedBy: 'John Davis, CNA'
      },
      {
        residentId: bill.id,
        type: 'FALL_NO_INJURY',
        severity: 'MINOR',
        status: 'RESOLVED',
        occurredAt: daysAgo(75),
        description: 'Resident tripped over own feet in hallway. No injuries.',
        location: 'Hallway near room 305',
        reportedBy: 'Emily Rodriguez, RN',
        reportedAt: daysAgo(75),
        witnessedBy: 'Emily Rodriguez, RN',
        actionsTaken: 'Assisted to sitting. Full assessment completed. No injuries found.',
        followUpRequired: false,
        resolutionNotes: 'Non-slip footwear provided. No further issues.',
        resolvedAt: daysAgo(75),
        resolvedBy: 'Emily Rodriguez, RN'
      }
    ]
  });
  incidentCount += 4;

  // Bill's Family Contacts (2)
  await prisma.familyContact.createMany({
    data: [
      {
        residentId: bill.id,
        name: 'Steven Anderson',
        relationship: 'Son',
        phone: '(555) 456-7890',
        email: 'steven.anderson@email.com',
        address: '123 Oak Street, Springfield, IL 62706',
        isPrimaryContact: true,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'PHONE',
        notes: 'Visits twice weekly. Healthcare POA. Very involved.',
        lastContactDate: daysAgo(3)
      },
      {
        residentId: bill.id,
        name: 'Karen Anderson-Smith',
        relationship: 'Daughter',
        phone: '(555) 567-8901',
        email: 'karen.smith@email.com',
        address: '456 Pine Road, Bloomington, IL 61701',
        isPrimaryContact: false,
        permissionLevel: 'FULL_ACCESS',
        contactPreference: 'EMAIL',
        notes: 'Visits weekly. Handles financial matters.',
        lastContactDate: daysAgo(7)
      }
    ]
  });
  familyContactCount += 2;

  // Bill's Caregiver Assignment (1)
  await prisma.caregiverAssignment.create({
    data: {
      caregiverId: caregivers[3].id,
      residentId: bill.id,
      isPrimary: true,
      startDate: monthsAgo(10),
      notes: 'Memory care specialist. Supervision and activity support.',
      assignedBy: operator.userId
    }
  });
  assignmentCount += 1;

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n✅ Resident demo data seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • ${residentCount} residents created`);
  console.log(`   • ${assessmentCount} assessments created`);
  console.log(`   • ${incidentCount} incidents created`);
  console.log(`   • ${familyContactCount} family contacts created`);
  console.log(`   • ${assignmentCount} caregiver assignments created`);
  console.log('\n📋 Residents by Care Level:');
  console.log('   • Independent Living: 2 residents (Maggie Thompson, Pat Davis)');
  console.log('   • Assisted Living: 2 residents (Bob Chen, Ellie Johnson)');
  console.log('   • Memory Care: 2 residents (Dorothy Williams, Bill Anderson)');
  console.log('   • Skilled Nursing: 2 residents (Jim Martinez, Harold Peterson)');
  console.log('\n🏠 Ready for demo in Operator portal at /operator/residents');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding resident demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
