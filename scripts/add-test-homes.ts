#!/usr/bin/env tsx
/**
 * Add test assisted living homes for discharge planner testing
 */

import { PrismaClient, CareLevel, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();

const testHomes = [
  {
    name: "Sunny Meadows Memory Care",
    description: "Specialized memory care facility with 24/7 nursing staff and secure outdoor walking paths. Our team is trained in dementia care techniques.",
    careLevel: [CareLevel.MEMORY_CARE],
    capacity: 30,
    currentOccupancy: 22,
    priceMin: 5500,
    priceMax: 7500,
    genderRestriction: null,
    amenities: [
      "24/7 Nursing",
      "Secure Unit",
      "Memory Garden",
      "Music Therapy",
      "Pet Therapy",
      "Physical Therapy",
      "Medication Management",
    ],
    address: {
      street: "123 Memory Lane",
      city: "Boston",
      state: "MA",
      zipCode: "02101",
      country: "USA",
    },
  },
  {
    name: "Harbor View Assisted Living",
    description: "Waterfront assisted living community offering independent and assisted living services. Beautiful harbor views and active social programs.",
    careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT],
    capacity: 50,
    currentOccupancy: 35,
    priceMin: 3500,
    priceMax: 5500,
    genderRestriction: null,
    amenities: [
      "Private Rooms",
      "Restaurant-Style Dining",
      "Fitness Center",
      "Transportation",
      "Activities Program",
      "WiFi",
      "Pet-Friendly",
      "Beauty Salon",
    ],
    address: {
      street: "456 Harbor Drive",
      city: "Miami",
      state: "FL",
      zipCode: "33101",
      country: "USA",
    },
  },
  {
    name: "Golden Years Skilled Nursing",
    description: "Comprehensive skilled nursing facility with post-acute care, rehabilitation services, and long-term care. Medicare and Medicaid accepted.",
    careLevel: [CareLevel.SKILLED_NURSING, CareLevel.ASSISTED],
    capacity: 80,
    currentOccupancy: 65,
    priceMin: 8000,
    priceMax: 12000,
    genderRestriction: null,
    amenities: [
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "24/7 Nursing",
      "Wound Care",
      "IV Therapy",
      "Respite Care",
      "Medicare Certified",
    ],
    address: {
      street: "789 Healthcare Blvd",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      country: "USA",
    },
  },
  {
    name: "Peaceful Pines Senior Living",
    description: "Nestled in the mountains, offering assisted living and memory care in a peaceful setting. Family-owned and operated with personalized care.",
    careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
    capacity: 40,
    currentOccupancy: 28,
    priceMin: 4500,
    priceMax: 6500,
    genderRestriction: null,
    amenities: [
      "Hiking Trails",
      "Mountain Views",
      "Organic Gardens",
      "Pet-Friendly",
      "WiFi",
      "Chapel",
      "Library",
      "Family Visits Welcome",
    ],
    address: {
      street: "321 Pine Mountain Road",
      city: "Denver",
      state: "CO",
      zipCode: "80201",
      country: "USA",
    },
  },
  {
    name: "Veterans Care Home",
    description: "Specialized care for veterans with PTSD, TBI, and other service-related conditions. VA benefits accepted. Honor our heroes.",
    careLevel: [CareLevel.ASSISTED, CareLevel.SKILLED_NURSING],
    capacity: 25,
    currentOccupancy: 18,
    priceMin: 4000,
    priceMax: 7000,
    genderRestriction: null,
    amenities: [
      "VA Benefits Accepted",
      "PTSD Support",
      "Group Therapy",
      "Recreational Activities",
      "Memorial Garden",
      "24/7 Nursing",
      "Private Rooms",
      "Pet Therapy",
    ],
    address: {
      street: "555 Liberty Avenue",
      city: "San Diego",
      state: "CA",
      zipCode: "92101",
      country: "USA",
    },
  },
  {
    name: "Rose Garden Women's Home",
    description: "Exclusive assisted living for women, offering a safe and nurturing environment. Private and semi-private rooms available.",
    careLevel: [CareLevel.ASSISTED, CareLevel.INDEPENDENT],
    capacity: 30,
    currentOccupancy: 25,
    priceMin: 4000,
    priceMax: 6000,
    genderRestriction: "Female",
    amenities: [
      "Women Only",
      "Beauty Salon",
      "Craft Room",
      "Garden Club",
      "Book Club",
      "Private Rooms",
      "Fitness Classes",
      "Social Activities",
    ],
    address: {
      street: "888 Rose Avenue",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      country: "USA",
    },
  },
  {
    name: "Lakeside Rehabilitation Center",
    description: "Short-term rehabilitation and post-surgery care with a focus on getting residents back home. Medicare and private pay accepted.",
    careLevel: [CareLevel.SKILLED_NURSING, CareLevel.ASSISTED],
    capacity: 60,
    currentOccupancy: 45,
    priceMin: 7000,
    priceMax: 10000,
    genderRestriction: null,
    amenities: [
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Post-Surgery Care",
      "Stroke Recovery",
      "Medicare Certified",
      "Lake Views",
      "Private Rooms",
    ],
    address: {
      street: "777 Lakeshore Drive",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      country: "USA",
    },
  },
  {
    name: "Comfort Care Home",
    description: "Compassionate care in a home-like setting. Specialized services with 24/7 support for residents and families.",
    careLevel: [CareLevel.SKILLED_NURSING, CareLevel.MEMORY_CARE],
    capacity: 20,
    currentOccupancy: 14,
    priceMin: 9000,
    priceMax: 15000,
    genderRestriction: null,
    amenities: [
      "24/7 Nursing Care",
      "Pain Management",
      "Spiritual Support",
      "Family Support",
      "Private Rooms",
      "24/7 Nursing",
      "Grief Counseling",
      "Medicare Certified",
    ],
    address: {
      street: "999 Peaceful Way",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      country: "USA",
    },
  },
];

async function main() {
  console.log('🏥 Adding test assisted living homes...\n');

  // First, find an operator to assign these homes to
  const operator = await prisma.operator.findFirst({
    select: { id: true },
  });

  if (!operator) {
    console.error('❌ No operator found! Please create an operator first.');
    process.exit(1);
  }

  console.log(`✅ Found operator: ${operator.id}\n`);

  // Add each test home
  for (const homeData of testHomes) {
    try {
      // Check if home already exists
      const existing = await prisma.assistedLivingHome.findFirst({
        where: { name: homeData.name },
      });

      if (existing) {
        console.log(`⚠️  Home "${homeData.name}" already exists, skipping...`);
        continue;
      }

      // Create home with address
      const home = await prisma.assistedLivingHome.create({
        data: {
          operatorId: operator.id,
          name: homeData.name,
          description: homeData.description,
          status: HomeStatus.ACTIVE,
          careLevel: homeData.careLevel,
          capacity: homeData.capacity,
          currentOccupancy: homeData.currentOccupancy,
          priceMin: homeData.priceMin,
          priceMax: homeData.priceMax,
          genderRestriction: homeData.genderRestriction,
          amenities: homeData.amenities,
          address: {
            create: homeData.address,
          },
        },
        include: {
          address: true,
        },
      });

      console.log(`✅ Created: ${home.name}`);
      console.log(`   Location: ${home.address?.city}, ${home.address?.state}`);
      console.log(`   Care: ${home.careLevel.join(', ')}`);
      console.log(`   Beds: ${home.capacity - home.currentOccupancy} available (${home.currentOccupancy}/${home.capacity})`);
      console.log(`   Price: $${home.priceMin}-$${home.priceMax}/month\n`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${homeData.name}:`, error.message);
    }
  }

  // Summary
  const totalHomes = await prisma.assistedLivingHome.count();
  console.log(`\n✅ Total homes in database: ${totalHomes}`);

  const homesByState = await prisma.assistedLivingHome.groupBy({
    by: ['careLevel'],
    _count: true,
  });

  console.log('\nHomes by care level:');
  homesByState.forEach((group) => {
    console.log(`  ${group.careLevel.join(', ')}: ${group._count} homes`);
  });
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
