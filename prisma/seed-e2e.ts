/**
 * E2E Test Database Seed Script for CareLinkAI
 * 
 * This script ensures specific test users exist in the database for e2e tests:
 * - operator1@example.com with an operator profile and at least one home
 * - caregiver1@example.com with a caregiver profile
 * 
 * Run with: npx ts-node --transpile-only prisma/seed-e2e.ts
 */

import { PrismaClient, UserRole, UserStatus, HomeStatus, CareLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting E2E test data seeding...');

  // Hash passwords
  const operatorPasswordHash = await bcrypt.hash('Operator123!', 12);
  const caregiverPasswordHash = await bcrypt.hash('Caregiver123!', 12);

  // Upsert operator user
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator1@example.com' },
    update: {
      passwordHash: operatorPasswordHash,
      status: UserStatus.ACTIVE
    },
    create: {
      email: 'operator1@example.com',
      passwordHash: operatorPasswordHash,
      firstName: 'Operator1',
      lastName: 'User',
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      phone: '555-123-4567',
    }
  });
  console.log(`✅ Upserted operator user: ${operatorUser.email}`);

  // Ensure operator profile exists
  const operator = await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {},
    create: {
      userId: operatorUser.id,
      companyName: 'E2E Test Company',
    }
  });
  console.log(`✅ Ensured operator profile exists for: ${operatorUser.email}`);

  // Check if operator has any homes
  const existingHomes = await prisma.assistedLivingHome.findMany({
    where: { operatorId: operator.id },
    take: 1
  });

  // Create a home if none exists
  if (existingHomes.length === 0) {
    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: operator.id,
        name: 'E2E Test Home',
        description: 'Test home for E2E testing',
        status: HomeStatus.ACTIVE,
        careLevel: [CareLevel.ASSISTED],
        capacity: 50,
        currentOccupancy: 40,
        priceMin: 3000,
        priceMax: 5000,
        amenities: ['Private Rooms', 'Dining Room', 'Activity Room'],
        address: {
          create: {
            street: '123 Test Street',
            city: 'Testville',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
            latitude: 34.0522,
            longitude: -118.2437
          }
        }
      }
    });
    console.log(`✅ Created new home for operator: ${home.name}`);
  } else {
    console.log(`✅ Operator already has ${existingHomes.length} home(s)`);
  }

  // Upsert caregiver user
  const caregiverUser = await prisma.user.upsert({
    where: { email: 'caregiver1@example.com' },
    update: {
      passwordHash: caregiverPasswordHash,
      status: UserStatus.ACTIVE
    },
    create: {
      email: 'caregiver1@example.com',
      passwordHash: caregiverPasswordHash,
      firstName: 'Caregiver1',
      lastName: 'User',
      role: UserRole.CAREGIVER,
      status: UserStatus.ACTIVE,
      phone: '555-987-6543',
    }
  });
  console.log(`✅ Upserted caregiver user: ${caregiverUser.email}`);

  // Ensure caregiver profile exists
  const caregiver = await prisma.caregiver.upsert({
    where: { userId: caregiverUser.id },
    update: {},
    create: {
      userId: caregiverUser.id,
      bio: 'E2E test caregiver profile',
      yearsExperience: 5,
      hourlyRate: 25,
      availability: {
        monday: { morning: true, afternoon: true, evening: true, night: false },
        tuesday: { morning: true, afternoon: true, evening: true, night: false },
        wednesday: { morning: true, afternoon: true, evening: true, night: false },
        thursday: { morning: true, afternoon: true, evening: true, night: false },
        friday: { morning: true, afternoon: true, evening: true, night: false },
        saturday: { morning: false, afternoon: false, evening: false, night: false },
        sunday: { morning: false, afternoon: false, evening: false, night: false }
      }
    }
  });
  console.log(`✅ Ensured caregiver profile exists for: ${caregiverUser.email}`);

  console.log('✅ E2E test data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding E2E test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
