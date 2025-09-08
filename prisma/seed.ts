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
  await seedMockCaregivers(12);
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error('Error during seeding:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

/**
 * Seed mock caregiver users & profiles for development/demo
 */
async function seedMockCaregivers(count: number = 12) {
  console.log(`Seeding ${count} mock caregivers...`);

  // Attempt to load specialty slugs for realistic data
  let specialtySlugs: string[] = [];
  try {
    const cats = await prisma.marketplaceCategory.findMany({
      where: { type: 'SPECIALTY', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    specialtySlugs = cats.map((c: any) => c.slug);
  } catch {
    specialtySlugs = [
      'alzheimers-care',
      'dementia-care',
      'diabetes-care',
      'hospice-care',
      'medication-management',
      'mobility-assistance',
    ];
  }

  const firstNames = [
    'Emma','Liam','Olivia','Noah','Ava','William','Sophia','James','Isabella','Logan',
    'Charlotte','Benjamin','Amelia','Mason','Harper','Elijah','Evelyn','Oliver','Abigail','Jacob',
  ];
  const lastNames = [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller',
    'Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez',
    'Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  ];
  const streets = ['123 Main St','45 Oak Ave','78 Pine Rd','233 Maple St','67 Cedar Ln','890 Birch Blvd'];
  const cities = ['San Francisco','Oakland','San Jose','Berkeley','Palo Alto','Mountain View','Sunnyvale'];
  const states = ['CA'];
  const zips   = ['94102','94607','95112','94704','94301','94043','94086'];

  const defaultPassword = process.env.MOCK_USER_PASSWORD ?? 'Care123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  for (let i = 0; i < count; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last  = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${i + 1}@example.com`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName: first,
        lastName: last,
        role: 'CAREGIVER',
        status: 'ACTIVE',
        passwordHash,
      },
      create: {
        email,
        firstName: first,
        lastName: last,
        role: 'CAREGIVER',
        status: 'ACTIVE',
        passwordHash,
      },
    });

    // ensure address exists (ignore duplicate error)
    const addrIdx = Math.floor(Math.random() * cities.length);
    await prisma.address.create({
      data: {
        userId: user.id,
        street: streets[Math.floor(Math.random() * streets.length)],
        city: cities[addrIdx],
        state: states[0],
        zipCode: zips[addrIdx],
        country: 'USA',
      },
    }).catch(() => {});

    // caregiver profile
    await prisma.caregiver.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: 'Compassionate caregiver with experience supporting seniors across various needs.',
        yearsExperience: Math.floor(Math.random() * 15) + 1,
        hourlyRate: Math.floor(Math.random() * 20) + 20, // $20-40/hr
        backgroundCheckStatus: 'CLEAR',
        specialties: (() => {
          const shuffled = [...specialtySlugs].sort(() => 0.5 - Math.random());
          return shuffled.slice(0, Math.min(3, shuffled.length));
        })(),
      },
    });
  }

  console.log('Mock caregivers seeded.');
}
