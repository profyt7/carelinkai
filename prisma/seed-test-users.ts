/**
 * Test Users Seed Script for Playwright E2E Testing
 * 
 * This script creates test users for all roles in the CareLinkAI RBAC system:
 * - ADMIN: Full system access
 * - OPERATOR: Scoped to specific homes
 * - CAREGIVER: Limited access, assigned to residents
 * - FAMILY: View-only access to specific resident
 * 
 * Test Credentials:
 * - admin.test@carelinkai.com / TestAdmin123!
 * - operator.test@carelinkai.com / TestOperator123!
 * - caregiver.test@carelinkai.com / TestCaregiver123!
 * - family.test@carelinkai.com / TestFamily123!
 */

import { PrismaClient, UserRole, UserStatus, HomeStatus, ResidentStatus, CareLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting test users seed...');

  // Hash passwords for test users
  const testPassword = await bcrypt.hash('TestPassword123!', 12);

  // ===== 1. CREATE ADMIN TEST USER =====
  console.log('Creating admin test user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin.test@carelinkai.com' },
    update: {},
    create: {
      email: 'admin.test@carelinkai.com',
      passwordHash: testPassword,
      firstName: 'Admin',
      lastName: 'Test User',
      phone: '+1-555-0100',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      notificationPrefs: {},
      preferences: {},
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // ===== 2. CREATE OPERATOR TEST USER WITH HOME =====
  console.log('Creating operator test user...');
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator.test@carelinkai.com' },
    update: {},
    create: {
      email: 'operator.test@carelinkai.com',
      passwordHash: testPassword,
      firstName: 'Operator',
      lastName: 'Test User',
      phone: '+1-555-0101',
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      notificationPrefs: {},
      preferences: {},
    },
  });

  const operator = await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {},
    create: {
      userId: operatorUser.id,
      companyName: 'Test Care Homes Inc.',
      taxId: 'TEST-TAX-123',
      businessLicense: 'TEST-LICENSE-456',
      preferences: {},
    },
  });

  // Create test home for operator
  const testHome = await prisma.assistedLivingHome.upsert({
    where: { id: 'test-home-001' },
    update: {},
    create: {
      id: 'test-home-001',
      operatorId: operator.id,
      name: 'Test Assisted Living Home',
      description: 'This is a test home for E2E testing',
      status: HomeStatus.ACTIVE,
      careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
      capacity: 50,
      currentOccupancy: 5,
      priceMin: 3000,
      priceMax: 6000,
      amenities: ['Wifi', '24/7 Care', 'Meals Included'],
    },
  });
  console.log(`✅ Operator user created: ${operatorUser.email} with home: ${testHome.name}`);

  // ===== 3. CREATE CAREGIVER TEST USER =====
  console.log('Creating caregiver test user...');
  const caregiverUser = await prisma.user.upsert({
    where: { email: 'caregiver.test@carelinkai.com' },
    update: {},
    create: {
      email: 'caregiver.test@carelinkai.com',
      passwordHash: testPassword,
      firstName: 'Caregiver',
      lastName: 'Test User',
      phone: '+1-555-0102',
      role: UserRole.CAREGIVER,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      notificationPrefs: {},
      preferences: {},
    },
  });

  const caregiver = await prisma.caregiver.upsert({
    where: { userId: caregiverUser.id },
    update: {},
    create: {
      userId: caregiverUser.id,
      bio: 'Experienced caregiver for testing',
      yearsExperience: 5,
      hourlyRate: 25.00,
      availability: { monday: '9am-5pm', tuesday: '9am-5pm' },
      specialties: ['Memory Care', 'Medication Management'],
    },
  });

  // Create employment relationship between caregiver and operator
  await prisma.caregiverEmployment.upsert({
    where: { id: 'test-employment-001' },
    update: {},
    create: {
      id: 'test-employment-001',
      caregiverId: caregiver.id,
      operatorId: operator.id,
      position: 'Caregiver',
      startDate: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log(`✅ Caregiver user created: ${caregiverUser.email} and assigned to operator`);

  // ===== 4. CREATE FAMILY TEST USER WITH RESIDENT =====
  console.log('Creating family test user...');
  const familyUser = await prisma.user.upsert({
    where: { email: 'family.test@carelinkai.com' },
    update: {},
    create: {
      email: 'family.test@carelinkai.com',
      passwordHash: testPassword,
      firstName: 'Family',
      lastName: 'Test User',
      phone: '+1-555-0103',
      role: UserRole.FAMILY,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      notificationPrefs: {},
      preferences: {},
    },
  });

  const family = await prisma.family.upsert({
    where: { userId: familyUser.id },
    update: {},
    create: {
      userId: familyUser.id,
      primaryContactName: 'Family Test User',
      phone: '+1-555-0103',
      relationshipToRecipient: 'Daughter',
      emergencyContact: 'Family Test User',
      emergencyPhone: '+1-555-0103',
    },
  });

  // Create test resident for family
  const testResident = await prisma.resident.upsert({
    where: { id: 'test-resident-001' },
    update: {},
    create: {
      id: 'test-resident-001',
      familyId: family.id,
      homeId: testHome.id,
      firstName: 'Test',
      lastName: 'Resident',
      dateOfBirth: new Date('1950-01-01'),
      gender: 'FEMALE',
      status: ResidentStatus.ACTIVE,
      careNeeds: { mobility: 'Limited', cognitive: 'Good' },
      medicalConditions: 'Arthritis, Hypertension',
      medications: 'Lisinopril 10mg daily',
      allergies: 'Penicillin',
      dietaryRestrictions: 'Low sodium',
      notes: 'Prefers morning activities',
    },
  });

  // Create family contact for the resident
  await prisma.familyContact.upsert({
    where: { id: 'test-family-contact-001' },
    update: {},
    create: {
      id: 'test-family-contact-001',
      residentId: testResident.id,
      name: 'Family Test User',
      relationship: 'Daughter',
      phone: '+1-555-0103',
      email: 'family.test@carelinkai.com',
      isPrimaryContact: true,
      permissionLevel: 'FULL_ACCESS',
      contactPreference: 'EMAIL',
      notes: 'Primary contact for all communications',
    },
  });

  console.log(`✅ Family user created: ${familyUser.email} with resident: ${testResident.firstName} ${testResident.lastName}`);

  // ===== 5. CREATE TEST DATA FOR RESIDENT =====
  console.log('Creating test assessments, incidents, and compliance items...');

  // Create test assessment
  await prisma.assessmentResult.create({
    data: {
      residentId: testResident.id,
      type: 'FUNCTIONAL',
      score: 85,
      conductedBy: caregiverUser.id,
      conductedAt: new Date(),
      notes: 'Resident is doing well overall',
      recommendations: 'Continue current care plan',
      status: 'COMPLETED',
      data: {
        adlScore: 90,
        mobilityScore: 80,
        cognitiveScore: 85,
        behavioralScore: 90,
      },
    },
  });

  // Create test incident
  await prisma.residentIncident.create({
    data: {
      residentId: testResident.id,
      type: 'FALL',
      severity: 'MINOR',
      description: 'Resident had a minor fall in the hallway',
      occurredAt: new Date(),
      reportedBy: caregiverUser.id,
      reportedAt: new Date(),
      status: 'RESOLVED',
      actionsTaken: 'Resident was assessed by nurse, no injuries',
      resolutionNotes: 'No follow-up required',
      resolvedAt: new Date(),
      resolvedBy: operatorUser.id,
      followUpRequired: false,
    },
  });

  // Create test compliance item
  await prisma.residentComplianceItem.create({
    data: {
      residentId: testResident.id,
      type: 'MEDICAL_RECORDS',
      title: 'Annual Physical Exam',
      status: 'CURRENT',
      issuedDate: new Date('2024-01-15'),
      expiryDate: new Date('2025-01-15'),
      documentUrl: 'https://example.com/documents/physical-exam.pdf',
      verifiedBy: operatorUser.id,
      verifiedAt: new Date(),
    },
  });

  console.log('✅ Test data created successfully');

  console.log('\n🎉 Test users seed completed!\n');
  console.log('Test Credentials:');
  console.log('  Admin: admin.test@carelinkai.com / TestPassword123!');
  console.log('  Operator: operator.test@carelinkai.com / TestPassword123!');
  console.log('  Caregiver: caregiver.test@carelinkai.com / TestPassword123!');
  console.log('  Family: family.test@carelinkai.com / TestPassword123!\n');
}

main()
  .catch((e) => {
    console.error('Error seeding test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
