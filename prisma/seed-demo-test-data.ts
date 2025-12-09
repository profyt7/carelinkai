/**
 * Comprehensive Test Data Seed Script for Demo Accounts
 * 
 * Creates all necessary test data to support the Playwright RBAC test suite:
 * - Homes for operators
 * - Residents with various statuses
 * - Caregiver assignments
 * - Family-resident relationships
 * - Sample assessments, incidents, compliance items, and family contacts
 * 
 * Run with: npx tsx prisma/seed-demo-test-data.ts
 */

import { PrismaClient, UserRole, ResidentStatus, AssessmentType, IncidentType, IncidentSeverity, ComplianceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo test data seed...\n');

  // Get demo users
  const demoAdmin = await prisma.user.findUnique({
    where: { email: 'demo.admin@carelinkai.test' },
  });

  const demoOperator = await prisma.user.findUnique({
    where: { email: 'demo.operator@carelinkai.test' },
    include: { operator: true },
  });

  const demoCaregiver = await prisma.user.findUnique({
    where: { email: 'demo.aide@carelinkai.test' },
    include: { caregiver: true },
  });

  const demoFamily = await prisma.user.findUnique({
    where: { email: 'demo.family@carelinkai.test' },
    include: { family: true },
  });

  if (!demoAdmin || !demoOperator || !demoCaregiver || !demoFamily) {
    throw new Error('Demo users not found. Please run create-demo-users.js first.');
  }

  console.log('✅ Found all demo users');

  // Create or get Operator entity
  let operatorEntity = demoOperator.operator;
  if (!operatorEntity) {
    operatorEntity = await prisma.operator.create({
      data: {
        userId: demoOperator.id,
        companyName: 'Demo Care Operations',
      },
    });
    console.log('✅ Created operator entity');
  } else {
    console.log('✅ Operator entity already exists');
  }

  // Create or get Caregiver entity
  let caregiverEntity = demoCaregiver.caregiver;
  if (!caregiverEntity) {
    caregiverEntity = await prisma.caregiver.create({
      data: {
        userId: demoCaregiver.id,
        hourlyRate: 18.50,
        specialties: ['CNA', 'First Aid'],
        bio: 'Experienced caregiver with 5+ years in elderly care',
      },
    });
    console.log('✅ Created caregiver entity');
  } else {
    console.log('✅ Caregiver entity already exists');
  }

  // Create or get Family entity
  let familyEntity = demoFamily.family;
  if (!familyEntity) {
    familyEntity = await prisma.family.create({
      data: {
        userId: demoFamily.id,
        relationshipToRecipient: 'Daughter',
        phone: '+1-555-0150',
      },
    });
    console.log('✅ Created family entity');
  } else {
    console.log('✅ Family entity already exists');
  }

  // Create test homes
  const home1 = await prisma.assistedLivingHome.upsert({
    where: { id: 'test-home-001' },
    update: {},
    create: {
      id: 'test-home-001',
      name: 'Test Home 1',
      description: 'A comfortable and caring assisted living facility for seniors',
      operatorId: operatorEntity.id,
      capacity: 10,
      currentOccupancy: 3,
      careLevel: ['INDEPENDENT', 'ASSISTED'],
      amenities: ['Meals', 'Activities', '24/7 Staff'],
    },
  });

  const home2 = await prisma.assistedLivingHome.upsert({
    where: { id: 'test-home-002' },
    update: {},
    create: {
      id: 'test-home-002',
      name: 'Test Home 2',
      description: 'Premium assisted living with specialized memory care',
      operatorId: operatorEntity.id,
      capacity: 8,
      currentOccupancy: 2,
      careLevel: ['ASSISTED', 'MEMORY_CARE'],
      amenities: ['Meals', 'Activities', 'Medical Care'],
    },
  });

  console.log('✅ Created test homes');

  // Assign caregiver to operator
  const caregiverAssignment = await prisma.caregiverEmployment.upsert({
    where: { id: 'test-employment-001' },
    update: {},
    create: {
      id: 'test-employment-001',
      caregiverId: caregiverEntity.id,
      operatorId: operatorEntity.id,
      position: 'Certified Nursing Assistant',
      startDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  console.log('✅ Created caregiver assignment');

  // Create test residents
  const resident1 = await prisma.resident.upsert({
    where: { id: 'test-resident-001' },
    update: {},
    create: {
      id: 'test-resident-001',
      firstName: 'Test',
      lastName: 'Resident',
      dateOfBirth: new Date('1950-01-15'),
      gender: 'FEMALE',
      status: ResidentStatus.ACTIVE,
      familyId: familyEntity.id,
      homeId: home1.id,
      admissionDate: new Date('2024-01-15'),
      medicalConditions: 'Hypertension, Diabetes Type 2',
      medications: 'Lisinopril 10mg, Metformin 500mg',
      notes: 'Needs assistance with medications',
    },
  });

  const resident2 = await prisma.resident.upsert({
    where: { id: 'test-resident-002' },
    update: {},
    create: {
      id: 'test-resident-002',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: new Date('1945-06-20'),
      gender: 'FEMALE',
      status: ResidentStatus.ACTIVE,
      familyId: familyEntity.id,
      homeId: home1.id,
      admissionDate: new Date('2024-02-01'),
      medicalConditions: 'Arthritis',
      medications: 'Ibuprofen 400mg',
      notes: 'Requires wheelchair access',
    },
  });

  const resident3 = await prisma.resident.upsert({
    where: { id: 'test-resident-003' },
    update: {},
    create: {
      id: 'test-resident-003',
      firstName: 'Robert',
      lastName: 'Johnson',
      dateOfBirth: new Date('1948-03-10'),
      gender: 'MALE',
      status: ResidentStatus.ACTIVE,
      familyId: familyEntity.id,
      homeId: home2.id,
      admissionDate: new Date('2024-03-01'),
      medicalConditions: 'Heart disease, High cholesterol',
      medications: 'Atorvastatin 20mg, Aspirin 81mg',
      notes: 'Regular cardiology checkups',
    },
  });

  console.log('✅ Created test residents');

  // Create assessments
  const assessment1 = await prisma.assessment.upsert({
    where: { id: 'test-assessment-001' },
    update: {},
    create: {
      id: 'test-assessment-001',
      residentId: resident1.id,
      type: AssessmentType.FUNCTIONAL,
      date: new Date('2024-11-01'),
      assessmentScore: 85,
      notes: 'Good mobility, independent with most ADLs',
      recommendations: 'Continue current care plan',
      status: 'COMPLETED',
      createdById: demoCaregiver.id,
    },
  });

  const assessment2 = await prisma.assessment.upsert({
    where: { id: 'test-assessment-002' },
    update: {},
    create: {
      id: 'test-assessment-002',
      residentId: resident1.id,
      type: AssessmentType.COGNITIVE,
      date: new Date('2024-11-15'),
      assessmentScore: 72,
      notes: 'Mild cognitive decline noted',
      recommendations: 'Increase mental stimulation activities',
      status: 'COMPLETED',
      createdById: demoOperator.id,
    },
  });

  const assessment3 = await prisma.assessment.upsert({
    where: { id: 'test-assessment-003' },
    update: {},
    create: {
      id: 'test-assessment-003',
      residentId: resident2.id,
      type: AssessmentType.FUNCTIONAL,
      date: new Date('2024-12-01'),
      assessmentScore: 90,
      notes: 'Excellent progress in physical therapy',
      recommendations: 'Continue current exercises',
      status: 'COMPLETED',
      createdById: demoCaregiver.id,
    },
  });

  console.log('✅ Created assessments');

  // Create incidents
  const incident1 = await prisma.incident.upsert({
    where: { id: 'test-incident-001' },
    update: {},
    create: {
      id: 'test-incident-001',
      residentId: resident1.id,
      type: IncidentType.FALL,
      severity: IncidentSeverity.MINOR,
      description: 'Resident slipped in bathroom, no injuries',
      date: new Date('2024-11-20'),
      time: '14:30',
      location: 'Bathroom',
      actionsTaken: 'Assisted resident up, checked for injuries, monitored for 24 hours',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      reportedById: demoCaregiver.id,
    },
  });

  const incident2 = await prisma.incident.upsert({
    where: { id: 'test-incident-002' },
    update: {},
    create: {
      id: 'test-incident-002',
      residentId: resident1.id,
      type: IncidentType.MEDICATION_ERROR,
      severity: IncidentSeverity.MODERATE,
      description: 'Medication given 2 hours late',
      date: new Date('2024-12-01'),
      time: '12:00',
      location: 'Resident room',
      actionsTaken: 'Medication administered, physician notified, incident report filed',
      status: 'UNDER_REVIEW',
      priority: 'HIGH',
      reportedById: demoCaregiver.id,
    },
  });

  const incident3 = await prisma.incident.upsert({
    where: { id: 'test-incident-003' },
    update: {},
    create: {
      id: 'test-incident-003',
      residentId: resident2.id,
      type: IncidentType.BEHAVIORAL,
      severity: IncidentSeverity.MINOR,
      description: 'Resident refused morning medication',
      date: new Date('2024-12-05'),
      time: '08:30',
      location: 'Dining room',
      actionsTaken: 'Offered medication later, resident accepted at 10:00 AM',
      status: 'RESOLVED',
      priority: 'LOW',
      reportedById: demoCaregiver.id,
    },
  });

  console.log('✅ Created incidents');

  // Create compliance items
  const compliance1 = await prisma.residentComplianceItem.upsert({
    where: { id: 'test-compliance-001' },
    update: {},
    create: {
      id: 'test-compliance-001',
      residentId: resident1.id,
      type: 'MEDICAL_RECORDS',
      title: 'Annual Physical Examination',
      status: ComplianceStatus.CURRENT,
      issuedDate: new Date('2024-01-15'),
      expiryDate: new Date('2025-01-15'),
      documentUrl: 'https://example.com/docs/physical-2024.pdf',
      verifiedBy: demoOperator.id,
      verifiedAt: new Date('2024-01-16'),
    },
  });

  const compliance2 = await prisma.residentComplianceItem.upsert({
    where: { id: 'test-compliance-002' },
    update: {},
    create: {
      id: 'test-compliance-002',
      residentId: resident1.id,
      type: 'INSURANCE',
      title: 'Medicare Card',
      status: ComplianceStatus.EXPIRING_SOON,
      issuedDate: new Date('2023-12-01'),
      expiryDate: new Date('2025-01-31'),
      documentUrl: 'https://example.com/docs/medicare.pdf',
      verifiedBy: demoOperator.id,
      verifiedAt: new Date('2023-12-05'),
    },
  });

  const compliance3 = await prisma.residentComplianceItem.upsert({
    where: { id: 'test-compliance-003' },
    update: {},
    create: {
      id: 'test-compliance-003',
      residentId: resident2.id,
      type: 'MEDICAL_RECORDS',
      title: 'TB Test',
      status: ComplianceStatus.CURRENT,
      issuedDate: new Date('2024-06-01'),
      expiryDate: new Date('2025-06-01'),
      verifiedBy: demoOperator.id,
      verifiedAt: new Date('2024-06-02'),
    },
  });

  console.log('✅ Created compliance items');

  // Create family contacts
  const familyContact1 = await prisma.familyContact.upsert({
    where: { id: 'test-family-contact-001' },
    update: {},
    create: {
      id: 'test-family-contact-001',
      residentId: resident1.id,
      name: 'Demo Family',
      relationship: 'Daughter',
      phone: '+1-555-0150',
      email: 'demo.family@carelinkai.test',
      isPrimaryContact: true,
      permissionLevel: 'FULL_ACCESS',
      contactPreference: 'EMAIL',
      lastContactDate: new Date('2024-12-01'),
    },
  });

  const familyContact2 = await prisma.familyContact.upsert({
    where: { id: 'test-family-contact-002' },
    update: {},
    create: {
      id: 'test-family-contact-002',
      residentId: resident1.id,
      name: 'John Doe',
      relationship: 'Son',
      phone: '+1-555-0160',
      email: 'john.doe@example.com',
      isPrimaryContact: false,
      permissionLevel: 'LIMITED_ACCESS',
      contactPreference: 'PHONE',
      lastContactDate: new Date('2024-11-15'),
    },
  });

  const familyContact3 = await prisma.familyContact.upsert({
    where: { id: 'test-family-contact-003' },
    update: {},
    create: {
      id: 'test-family-contact-003',
      residentId: resident2.id,
      name: 'John Smith',
      relationship: 'Son',
      phone: '+1-555-0151',
      email: 'john.smith@example.com',
      isPrimaryContact: true,
      permissionLevel: 'FULL_ACCESS',
      contactPreference: 'ANY',
      lastContactDate: new Date('2024-12-05'),
    },
  });

  console.log('✅ Created family contacts');

  console.log('\n✨ Demo test data seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Homes: 2');
  console.log('  - Residents: 3');
  console.log('  - Caregiver Assignments: 1');
  console.log('  - Family Links: 1');
  console.log('  - Assessments: 3');
  console.log('  - Incidents: 3');
  console.log('  - Compliance Items: 3');
  console.log('  - Family Contacts: 3');
  console.log('\n🧪 Test suite is now ready to run!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
