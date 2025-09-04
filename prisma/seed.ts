// @ts-nocheck
/**
 * Database Seed Script for CareLinkAI
 * Seeds marketplace taxonomy only.
 */
import { PrismaClient, CategoryType } from '@prisma/client';
const prisma = new PrismaClient();

async function seedMarketplaceTaxonomy() {
  console.log('Seeding marketplace taxonomy...');

  const groups: { type: CategoryType; names: string[] }[] = [
    {
      type: 'SETTING',
      names: ['In-home','Assisted Living','Independent Living','Memory Care','Senior Living Community'],
    },
    {
      type: 'CARE_TYPE',
      names: ['Companion Care','Personal Care',"Dementia/Alzheimer's",'Hospice Support','Post-Surgery Support','Special Needs Adult Care','Respite Care'],
    },
    {
      type: 'SERVICE',
      names: ['Transportation','Errands','Household Tasks','Medication Prompting','Mobility Assistance'],
    },
    {
      type: 'SPECIALTY',
      names: ['Companionship','Dementia Care'],
    },
  ];

  for (const group of groups) {
    let sort = 1;
    for (const name of group.names) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
      await prisma.marketplaceCategory.upsert({
        where: { slug },
        update: { name, type: group.type, sortOrder: sort, isActive: true },
        create: { name, slug, type: group.type, sortOrder: sort, isActive: true },
      });
      sort += 1;
    }
  }
  console.log('Marketplace taxonomy seeded');
}

async function main() {
  console.log('Starting database seed process...');
  await seedMarketplaceTaxonomy();
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error('Error during seeding:', e); process.exit(1); })
  .finally(async () => { await prisma.(); });
