/**
 * Seed script for Inquiry demo data
 * Creates sample families and inquiries for testing the inquiries module
 */

import { PrismaClient, UserRole, UserStatus, InquiryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding inquiry demo data...');

  // Find or create operator user
  let operatorUser = await prisma.user.findFirst({
    where: { role: UserRole.OPERATOR },
  });

  if (!operatorUser) {
    console.log('Creating operator user...');
    const passwordHash = await bcrypt.hash('Operator123!', 10);
    operatorUser = await prisma.user.create({
      data: {
        email: 'operator@carelinkai.com',
        firstName: 'Demo',
        lastName: 'Operator',
        passwordHash,
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
      },
    });
  }

  // Find or create operator profile
  let operator = await prisma.operator.findUnique({
    where: { userId: operatorUser.id },
  });

  if (!operator) {
    console.log('Creating operator profile...');
    operator = await prisma.operator.create({
      data: {
        userId: operatorUser.id,
        companyName: 'Demo Care Homes',
      },
    });
  }

  // Find or create a home
  let home = await prisma.assistedLivingHome.findFirst({
    where: { operatorId: operator.id },
  });

  if (!home) {
    console.log('Creating assisted living home...');
    home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: operator.id,
        name: 'Sunshine Care Home',
        description: 'A welcoming assisted living home providing compassionate care.',
        capacity: 20,
        currentOccupancy: 15,
        amenities: ['24/7 Care', 'Private Rooms', 'Meal Service', 'Activities'],
        address: {
          create: {
            street: '456 Oak Avenue',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94103',
            country: 'USA',
          },
        },
      },
    });
  }

  // Create family users and inquiries
  const families = [
    {
      email: 'johnson@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      primaryContactName: 'Sarah Johnson',
      phone: '415-555-0101',
      inquiryStatus: InquiryStatus.NEW,
      message: 'Looking for assisted living for my mother who needs daily assistance with medications and meals.',
    },
    {
      email: 'martinez@example.com',
      firstName: 'Carlos',
      lastName: 'Martinez',
      primaryContactName: 'Carlos Martinez',
      phone: '415-555-0102',
      inquiryStatus: InquiryStatus.CONTACTED,
      message: 'Interested in memory care services. My father has early-stage Alzheimer\'s.',
    },
    {
      email: 'chen@example.com',
      firstName: 'Wei',
      lastName: 'Chen',
      primaryContactName: 'Wei Chen',
      phone: '415-555-0103',
      inquiryStatus: InquiryStatus.TOUR_SCHEDULED,
      message: 'Would like to schedule a tour to see the facility and meet the staff.',
      tourDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
    {
      email: 'smith@example.com',
      firstName: 'Michael',
      lastName: 'Smith',
      primaryContactName: 'Michael Smith',
      phone: '415-555-0104',
      inquiryStatus: InquiryStatus.TOUR_COMPLETED,
      message: 'Completed tour last week. Very impressed with the facility.',
      tourDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      email: 'williams@example.com',
      firstName: 'Jennifer',
      lastName: 'Williams',
      primaryContactName: 'Jennifer Williams',
      phone: '415-555-0105',
      inquiryStatus: InquiryStatus.QUALIFIED,
      message: 'Ready to move forward. Need care for my aunt who is moving from out of state.',
    },
    {
      email: 'davis@example.com',
      firstName: 'Robert',
      lastName: 'Davis',
      primaryContactName: 'Robert Davis',
      phone: '415-555-0106',
      inquiryStatus: InquiryStatus.CLOSED_LOST,
      message: 'Looking for specialized medical care that we cannot provide.',
      internalNotes: 'Needs skilled nursing facility, not assisted living. Referred to other providers.',
    },
  ];

  for (const familyData of families) {
    console.log(`Creating family and inquiry for ${familyData.primaryContactName}...`);

    // Create or find family user
    let familyUser = await prisma.user.findUnique({
      where: { email: familyData.email },
    });

    if (!familyUser) {
      const passwordHash = await bcrypt.hash('Family123!', 10);
      familyUser = await prisma.user.create({
        data: {
          email: familyData.email,
          firstName: familyData.firstName,
          lastName: familyData.lastName,
          passwordHash,
          role: UserRole.FAMILY,
          status: UserStatus.ACTIVE,
        },
      });
    }

    // Create family profile
    let family = await prisma.family.findUnique({
      where: { userId: familyUser.id },
    });

    if (!family) {
      family = await prisma.family.create({
        data: {
          userId: familyUser.id,
          primaryContactName: familyData.primaryContactName,
          phone: familyData.phone,
        },
      });
    }

    // Create inquiry
    const existingInquiry = await prisma.inquiry.findFirst({
      where: {
        familyId: family.id,
        homeId: home.id,
      },
    });

    if (!existingInquiry) {
      await prisma.inquiry.create({
        data: {
          familyId: family.id,
          homeId: home.id,
          status: familyData.inquiryStatus,
          message: familyData.message,
          internalNotes: familyData.internalNotes,
          tourDate: familyData.tourDate,
        },
      });
    }
  }

  console.log('✅ Inquiry demo data seeded successfully!');
  console.log(`📊 Created ${families.length} families and inquiries`);
  console.log(`🏠 Home: ${home.name}`);
  console.log(`👤 Operator: ${operatorUser.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding inquiry data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
