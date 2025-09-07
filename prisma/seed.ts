// @ts-nocheck
/**
 * Database Seed Script for CareLinkAI
 * Seeds marketplace taxonomy only.
 */
import { PrismaClient, CategoryType, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
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

/**
 * Ensure a development ADMIN user exists
 */
async function upsertAdminUser() {
  // Read credentials from env or fall back to sensible defaults
  const email = process.env.ADMIN_EMAIL ?? 'admin@carelinkai.com';
  const rawPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';

  // Hash password (bcrypt, 10 rounds)
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Admin user ready: ${admin.email} (${admin.id})`);
}

async function main() {
  console.log('Starting database seed process...');
  await seedMarketplaceTaxonomy();
  await upsertAdminUser();
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error('Error during seeding:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
