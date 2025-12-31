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

/**
 * Ensure a development DISCHARGE_PLANNER user exists
 */
async function upsertDischargePlannerUser() {
  const email = process.env.DISCHARGE_PLANNER_EMAIL ?? 'demo.discharge@carelinkai.com';
  const rawPassword = process.env.DISCHARGE_PLANNER_PASSWORD ?? 'Demo123!';

  // Hash password (bcrypt, 10 rounds)
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const dischargePlanner = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
    },
    create: {
      email,
      firstName: 'Demo',
      lastName: 'Discharge Planner',
      passwordHash,
      role: UserRole.DISCHARGE_PLANNER,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
    },
  });

  console.log(`Discharge Planner user ready: ${dischargePlanner.email} (${dischargePlanner.id})`);
}

async function main() {
  console.log('Starting database seed process...');
  await seedMarketplaceTaxonomy();
  await upsertAdminUser();
  await upsertDischargePlannerUser();
  await seedMockCaregivers(12);
  // ---------------- Mock family job listings ----------------
  await seedMockFamilyJobs(15);
  // ---------------- Mock caregiver reviews ----------------
  await seedMockCaregiverReviews();
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

    // ------------------ random avatar ------------------
    const gender = Math.random() < 0.5 ? 'women' : 'men';
    const avatarIdx = Math.floor(Math.random() * 90); // 0-89 images available
    const profileImageUrl = `https://randomuser.me/api/portraits/${gender}/${avatarIdx}.jpg`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName: first,
        lastName: last,
        role: 'CAREGIVER',
        status: 'ACTIVE',
        passwordHash,
        profileImageUrl,
      },
      create: {
        email,
        firstName: first,
        lastName: last,
        role: 'CAREGIVER',
        status: 'ACTIVE',
        passwordHash,
        profileImageUrl,
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
      update: {
        specialties: {
          set: (() => {
            const shuffled = [...specialtySlugs].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(3, shuffled.length));
          })(),
        },
        settings: { set: [] },
        careTypes: { set: [] },
      },
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
        settings: [],
        careTypes: [],
      },
    });
  }

  console.log('Mock caregivers seeded.');
}

/**
 * Seed mock family job listings
 */
async function seedMockFamilyJobs(count: number = 15) {
  console.log(`Seeding ${count} mock family job listings...`);

  // Load marketplace category slugs
  const [settings, careTypes, services, specialties] = await Promise.all([
    prisma.marketplaceCategory.findMany({ where: { type: 'SETTING', isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.marketplaceCategory.findMany({ where: { type: 'CARE_TYPE', isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.marketplaceCategory.findMany({ where: { type: 'SERVICE', isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.marketplaceCategory.findMany({ where: { type: 'SPECIALTY', isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const settingSlugs = settings.map((c: any) => c.slug);
  const careTypeSlugs = careTypes.map((c: any) => c.slug);
  const serviceSlugs = services.map((c: any) => c.slug);
  const specialtySlugs = specialties.map((c: any) => c.slug);

  const titles = [
    'Evening caregiver for mom',
    'Weekend companion needed',
    'Overnight dementia care',
    'Post-surgery recovery assistance',
    'Medication & housekeeping help',
    'Errands and transport support',
    'Part-time daytime caregiver',
    'Memory care support required',
    'Short-term respite care',
    'Daily living assistance',
  ];

  const descriptions = [
    'Looking for a compassionate caregiver to assist with ADLs and companionship.',
    'Seeking experienced caregiver with memory-care background; reliable and patient.',
    'Need help with medication reminders, mobility assistance, and light housekeeping.',
    'Support with bathing, dressing, meals, and transportation to appointments.',
    'Family seeking weekend coverage; flexible hours available.',
  ];

  const cities = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale'];
  const states = ['CA'];

  const rand = (n: number) => Math.floor(Math.random() * n);
  const pick = <T,>(arr: T[]) => (arr.length ? arr[rand(arr.length)] : undefined);
  const pickMany = (arr: string[], k: number) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(k, shuffled.length));
  };

  // Create or reuse a few family users
  const familyUserIds: string[] = [];
  const defaultPassword = process.env.MOCK_USER_PASSWORD ?? 'Care123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const familyCount = Math.max(5, Math.ceil(count / 3));
  for (let i = 0; i < familyCount; i++) {
    const email = `family.demo${i + 1}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'FAMILY', status: 'ACTIVE', passwordHash },
      create: {
        email,
        firstName: 'Family',
        lastName: `Demo${i + 1}`,
        role: 'FAMILY',
        status: 'ACTIVE',
        passwordHash,
      },
    });
    familyUserIds.push(user.id);
  }

  for (let i = 0; i < count; i++) {
    const postedByUserId = pick(familyUserIds)!;

    const city = pick(cities);
    const state = pick(states);

    const hourlyMin = 20 + rand(10); // 20-29
    const hourlyMax = hourlyMin + 5 + rand(10); // +5-+14

    const start = new Date();
    start.setDate(start.getDate() + rand(21) + 2);
    const end = new Date(start);
    end.setDate(start.getDate() + (rand(7) + 1));

    await prisma.marketplaceListing.create({
      data: {
        postedByUserId,
        title: pick(titles) ?? 'Caregiver needed',
        description: pick(descriptions) ?? 'Seeking reliable caregiver.',
        hourlyRateMin: hourlyMin,
        hourlyRateMax: hourlyMax,
        setting: pick(settingSlugs) ?? undefined,
        careTypes: pickMany(careTypeSlugs, 2),
        services: pickMany(serviceSlugs, 2),
        specialties: pickMany(specialtySlugs, 3),
        city,
        state,
        status: 'OPEN',
        startTime: start,
        endTime: end,
      },
    });
  }

  console.log('Mock family job listings seeded.');
}

/**
 * Seed mock caregiver reviews
 * Creates 5-15 reviews for each caregiver with ratings between 3-5 stars
 */
async function seedMockCaregiverReviews() {
  console.log('Seeding mock caregiver reviews...');

  // Fetch all caregivers
  const caregivers = await prisma.caregiver.findMany();
  if (caregivers.length === 0) {
    console.log('No caregivers found, skipping review seeding');
    return;
  }

  // Fetch existing FAMILY users
  let familyUsers = await prisma.user.findMany({
    where: { role: 'FAMILY', status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  });

  // Ensure we have at least 5 FAMILY users
  if (familyUsers.length < 5) {
    console.log(`Only ${familyUsers.length} FAMILY users found, creating additional ones...`);
    const defaultPassword = process.env.MOCK_USER_PASSWORD ?? 'Care123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const neededCount = 5 - familyUsers.length;
    const newFamilyUsers = [];

    for (let i = 0; i < neededCount; i++) {
      const userNumber = familyUsers.length + i + 1;
      const email = `family.reviewer${userNumber}@example.com`;
      
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: { role: 'FAMILY', status: 'ACTIVE' },
          create: {
            email,
            firstName: 'Family',
            lastName: `Reviewer${userNumber}`,
            role: 'FAMILY',
            status: 'ACTIVE',
            passwordHash,
          },
        });
        newFamilyUsers.push({ id: user.id, firstName: user.firstName, lastName: user.lastName });
      } catch (e) {
        console.error(`Failed to create family user ${email}:`, e);
      }
    }

    familyUsers = [...familyUsers, ...newFamilyUsers];
  }

  // Review comments for variety
  const reviewComments = [
    'Excellent caregiver, very attentive and professional.',
    'Provided outstanding care for my parent, highly recommend!',
    'Reliable, punctual, and compassionate. Would hire again.',
    'Very knowledgeable about senior care needs.',
    'Great communication skills and genuinely caring attitude.',
    'Went above and beyond expectations.',
    'My parent really enjoyed their company and care.',
    'Handled challenging situations with patience and grace.',
    'Very responsive and adaptable to changing needs.',
    'Excellent at medication management and reminders.',
    'Kept our home clean and organized while providing care.',
    'Prepared nutritious meals that my parent enjoyed.',
    'Great at engaging in meaningful activities.',
    'Professional demeanor while maintaining a personal touch.',
    'Skilled at mobility assistance and transfer techniques.',
    'Provided peace of mind for our family.',
    'Excellent driving record and transportation assistance.',
    'Very respectful of privacy and dignity.',
    'Good at encouraging independence while providing necessary support.',
    'Handled memory care needs with expertise and compassion.',
  ];

  // Process each caregiver
  for (const caregiver of caregivers) {
    // Generate 5-15 reviews per caregiver
    const reviewCount = 5 + Math.floor(Math.random() * 11); // 5-15 reviews
    const reviewData = [];

    // Create unique family user and date combinations
    const usedCombinations = new Set();
    
    for (let i = 0; i < reviewCount; i++) {
      // Select random family user
      const reviewer = familyUsers[Math.floor(Math.random() * familyUsers.length)];
      
      // Generate random date in the past year
      const daysAgo = Math.floor(Math.random() * 365);
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() - daysAgo);
      
      // Create a unique key for this combination
      const combinationKey = `${caregiver.id}-${reviewer.id}-${reviewDate.toISOString().split('T')[0]}`;
      
      // Skip if this combination already exists
      if (usedCombinations.has(combinationKey)) {
        continue;
      }
      usedCombinations.add(combinationKey);

      // Generate random rating (weighted toward higher ratings)
      // 3 stars: 10%, 4 stars: 30%, 5 stars: 60%
      const ratingRandom = Math.random();
      let rating;
      if (ratingRandom < 0.1) {
        rating = 3;
      } else if (ratingRandom < 0.4) {
        rating = 4;
      } else {
        rating = 5;
      }

      // Select random comment
      const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];

      reviewData.push({
        caregiverId: caregiver.id,
        reviewerId: reviewer.id,
        rating,
        content: comment,
        createdAt: reviewDate,
        updatedAt: reviewDate,
      });
    }

    // Bulk insert reviews
    if (reviewData.length > 0) {
      try {
        await prisma.caregiverReview.createMany({
          data: reviewData,
          skipDuplicates: true,
        });
        console.log(`Created ${reviewData.length} reviews for caregiver ${caregiver.id}`);
      } catch (e) {
        console.error(`Failed to create reviews for caregiver ${caregiver.id}:`, e);
      }
    }
  }

  // Count total reviews created
  const totalReviews = await prisma.caregiverReview.count();
  console.log(`Total caregiver reviews in database: ${totalReviews}`);
}
