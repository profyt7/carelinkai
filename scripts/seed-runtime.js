// Runtime-friendly seed script (no ts-node required)
// Usage: node scripts/seed-runtime.js

// Minimal .env loader (avoid adding deps). Only sets if not already defined.
(() => {
  if (process.env.DATABASE_URL) return;
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) return;
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
    }
  } catch (_) {}
})();
const { PrismaClient, UserRole, HomeStatus, CareLevel, InquiryStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser({ email, firstName, lastName, role, password }) {
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      role,
      ...(passwordHash ? { passwordHash } : {}),
      status: 'ACTIVE',
    },
    create: {
      email,
      firstName,
      lastName,
      role,
      status: 'ACTIVE',
      passwordHash,
    },
  });
  return user;
}

async function ensureOperatorForUser(userId, companyName) {
  let operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) {
    operator = await prisma.operator.create({
      data: {
        userId,
        companyName,
      },
    });
  }
  return operator;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function createHomeWithAddress(operatorId, idx) {
  const cities = [
    { city: 'San Francisco', state: 'CA', zip: '94103' },
    { city: 'Oakland', state: 'CA', zip: '94607' },
    { city: 'San Jose', state: 'CA', zip: '95112' },
    { city: 'Berkeley', state: 'CA', zip: '94704' },
    { city: 'San Mateo', state: 'CA', zip: '94401' },
    { city: 'Palo Alto', state: 'CA', zip: '94301' },
  ];
  const amenitiesSets = [
    ['WiFi', 'Garden', 'Meals Included'],
    ['Pet-friendly', 'Physical Therapy'],
    ['24/7 Care', 'Transportation'],
    ['Pool', 'Gym'],
  ];
  const careCombos = [
    [CareLevel.ASSISTED],
    [CareLevel.MEMORY_CARE],
    [CareLevel.INDEPENDENT],
    [CareLevel.SKILLED_NURSING],
    [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
  ];

  const priceMin = 3500 + idx * 100;
  const priceMax = priceMin + 1200;
  const capacity = 25 + (idx % 10);
  const currentOccupancy = Math.max(0, capacity - (5 + (idx % 4)));

  const home = await prisma.assistedLivingHome.create({
    data: {
      operatorId,
      name: `Bay Area Care Home ${idx + 1}`,
      description: `Comfortable community ${idx + 1} with personalized care and amenities.`,
      status: HomeStatus.ACTIVE,
      careLevel: pick(careCombos, idx),
      capacity,
      currentOccupancy,
      genderRestriction: 'ALL',
      priceMin: priceMin,
      priceMax: priceMax,
      amenities: pick(amenitiesSets, idx),
      address: {
        create: {
          street: `${100 + idx} Main St`,
          city: pick(cities, idx).city,
          state: pick(cities, idx).state,
          zipCode: pick(cities, idx).zip,
        },
      },
    },
    include: { address: true },
  });

  // Optional primary photo (local fallback images will be used by search route if URL invalid)
  await prisma.homePhoto.create({
    data: {
      homeId: home.id,
      url: `/images/homes/${(idx % 12) + 1}.jpg`,
      isPrimary: true,
      caption: 'Exterior',
      sortOrder: 0,
    },
  }).catch(() => {});

  // Basic license and inspection for compliance demo
  const now = new Date();
  await prisma.license.create({
    data: {
      homeId: home.id,
      type: 'Assisted Living',
      licenseNumber: `AL-${String(idx + 1).padStart(4, '0')}`,
      issueDate: new Date(now.getFullYear(), 0, 1),
      expirationDate: new Date(now.getFullYear(), 11, 31),
      status: 'ACTIVE',
    },
  });
  await prisma.inspection.create({
    data: {
      homeId: home.id,
      inspectionDate: new Date(now.getFullYear(), Math.min(idx % 12, 11), 15),
      inspectionType: 'Annual',
      inspector: 'State Health Dept',
      result: 'PASS',
      findings: null,
    },
  });

  return home;
}

async function seed() {
  console.log('Seeding runtime demo data...');

  // 1) Operator user and profile
  const operatorUser = await upsertUser({
    email: 'operator@carelinkai.com',
    firstName: 'Olivia',
    lastName: 'Operator',
    role: UserRole.OPERATOR,
    password: 'Operator123!',
  });
  const operator = await ensureOperatorForUser(operatorUser.id, 'Bay Area Care Group');

  // 2) Create demo homes if none exist
  const existingHomes = await prisma.assistedLivingHome.count({ where: { operatorId: operator.id } });
  const targetHomes = 12;
  if (existingHomes < targetHomes) {
    const toCreate = targetHomes - existingHomes;
    for (let i = 0; i < toCreate; i++) {
      await createHomeWithAddress(operator.id, i);
    }
  }

  // 3) Create a few inquiries for analytics
  const homes = await prisma.assistedLivingHome.findMany({ where: { operatorId: operator.id }, take: 3 });
  for (const [i, home] of homes.entries()) {
    // create a temporary family and inquiry
    const familyUser = await upsertUser({
      email: `family${i + 1}@example.com`,
      firstName: 'Family',
      lastName: `${i + 1}`,
      role: UserRole.FAMILY,
      password: null,
    });
    const family = await prisma.family.upsert({
      where: { userId: familyUser.id },
      update: {},
      create: { userId: familyUser.id },
    });
    await prisma.inquiry.create({
      data: {
        familyId: family.id,
        homeId: home.id,
        status: i % 2 === 0 ? InquiryStatus.TOUR_SCHEDULED : InquiryStatus.CONTACTED,
        message: 'Looking for availability next month',
        aiMatchScore: 0.72,
      },
    });
  }

  console.log('Done. Operator login: operator@carelinkai.com / Operator123!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
