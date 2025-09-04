// @ts-nocheck
/**
 * Database Seed Script for CareLinkAI
 * 
 * This script populates the database with marketplace taxonomy and sample listings.
 * Run with: npm run seed
 */

import {
  PrismaClient,
  CategoryType,
  MarketplaceListingStatus,
  ApplicationStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed marketplace taxonomy categories
 */
async function seedMarketplaceTaxonomy() {
  console.log('🛒 Seeding marketplace taxonomy...');

  const groups: { type: CategoryType; names: string[] }[] = [
    {
      type: 'SETTING',
      names: [
        'In-home',
        'Assisted Living',
        'Independent Living',
        'Memory Care',
        'Senior Living Community',
      ],
    },
    {
      type: 'CARE_TYPE',
      names: [
        'Companion Care',
        'Personal Care',
        'Dementia/Alzheimer's',
        'Hospice Support',
        'Post-Surgery Support',
        'Special Needs Adult Care',
        'Respite Care',
      ],
    },
    {
      type: 'SERVICE',
      names: [
        'Transportation',
        'Errands',
        'Household Tasks',
        'Medication Prompting',
        'Mobility Assistance',
      ],
    },
    {
      type: 'SPECIALTY',
      names: ['Companionship', 'Dementia Care'],
    },
  ];

  for (const group of groups) {
    let sort = 1;
    for (const name of group.names) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await prisma.marketplaceCategory.upsert({
        where: { slug },
        update: {
          name,
          type: group.type as CategoryType,
          sortOrder: sort,
          isActive: true,
        },
        create: {
          name,
          slug,
          type: group.type as CategoryType,
          sortOrder: sort,
          isActive: true,
        },
      });
      sort += 1;
    }
  }

  console.log('✅ Marketplace taxonomy seeded');
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed process...');
  
  // Seed marketplace taxonomy
  await seedMarketplaceTaxonomy();
  
  console.log('✅ Seed complete');
}

// Execute the main function and handle errors
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma client connection
    await prisma.$disconnect();
  });
