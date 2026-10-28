/**
 * Simplified Test Data Seed for Demo Accounts
 * Creates minimal test data needed for RBAC tests
 */

import { PrismaClient, ResidentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simplified demo test data seed...\n');

  // Get demo users
  const demoAdmin = await prisma.user.findUnique({ where: { email: 'demo.admin@carelinkai.test' } });
  const demoOperator = await prisma.user.findUnique({ where: { email: 'demo.operator@carelinkai.test' }, include: { operator: true } });
  const demoCaregiver = await prisma.user.findUnique({ where: { email: 'demo.aide@carelinkai.test' }, include: { caregiver: true } });
  const demoFamily = await prisma.user.findUnique({ where: { email: 'demo.family@carelinkai.test' }, include: { family: true } });

  if (!demoAdmin || !demoOperator || !demoCaregiver || !demoFamily) {
    throw new Error('Demo users not found');
  }

  console.log('✅ Found all demo users');

  // Create operator entity if needed
  let operatorEntity = demoOperator.operator;
  if (!operatorEntity) {
    operatorEntity = await prisma.operator.create({
      data: { userId: demoOperator.id, companyName: 'Demo Care Operations' },
    });
  }

  // Create caregiver entity if needed
  let caregiverEntity = demoCaregiver.caregiver;
  if (!caregiverEntity) {
    caregiverEntity = await prisma.caregiver.create({
      data: { userId: demoCaregiver.id, hourlyRate: 18.50, specialties: ['CNA'] },
    });
  }

  // Create family entity if needed
  let familyEntity = demoFamily.family;
  if (!familyEntity) {
    familyEntity = await prisma.family.create({
      data: { userId: demoFamily.id, relationshipToRecipient: 'Daughter' },
    });
  }

  console.log('✅ Entities created');

  // Create test homes
  const home1 = await prisma.assistedLivingHome.upsert({
    where: { id: 'test-home-001' },
    update: {},
    create: {
      id: 'test-home-001',
      name: 'Test Home 1',
      description: 'Test assisted living facility',
      operatorId: operatorEntity.id,
      capacity: 10,
      careLevel: ['INDEPENDENT', 'ASSISTED'],
      amenities: ['Meals'],
    },
  });

  console.log('✅ Created test home');

  // Create test resident
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
    },
  });

  console.log('✅ Created test resident');

  console.log('\n✨ Demo test data seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
