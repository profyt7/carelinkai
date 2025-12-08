/**
 * Residents Demo Seed Script for CareLinkAI
 * - Creates a demo Family and three Residents with basic notes/incidents/assessments
 * - Safe to re-run (upserts by email for family user)
 */
import { PrismaClient, UserRole, UserStatus, ResidentStatus, ComplianceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding residents demo data...');

  // Create a family owner
  const pwd = await bcrypt.hash('Family123!', 10);
  const familyUser = await prisma.user.upsert({
    where: { email: 'family@carelinkai.com' },
    update: { passwordHash: pwd, status: UserStatus.ACTIVE },
    create: {
      email: 'family@carelinkai.com',
      firstName: 'Pat',
      lastName: 'Family',
      passwordHash: pwd,
      role: UserRole.FAMILY,
      status: UserStatus.ACTIVE,
    }
  });
  const family = await prisma.family.upsert({
    where: { userId: familyUser.id },
    update: {},
    create: { userId: familyUser.id }
  });

  // Reuse or create an operator/home to attach residents
  const opUser = await prisma.user.findFirst({ where: { role: UserRole.OPERATOR } });
  let home = await prisma.assistedLivingHome.findFirst();
  if (!home && opUser) {
    const op = await prisma.operator.upsert({ where: { userId: opUser.id }, update: {}, create: { userId: opUser.id, companyName: 'CareLink Demo Ops' } });
    home = await prisma.assistedLivingHome.create({ data: { operatorId: op.id, name: 'CareLink Demo Home', description: 'Demo Home', capacity: 20, currentOccupancy: 5, amenities: [] } });
  }

  // Additional family to meet prompt target
  const familyUser2 = await prisma.user.upsert({
    where: { email: 'family2@carelinkai.com' },
    update: { passwordHash: pwd, status: UserStatus.ACTIVE },
    create: { email: 'family2@carelinkai.com', firstName: 'Alex', lastName: 'Family', passwordHash: pwd, role: UserRole.FAMILY, status: UserStatus.ACTIVE }
  });
  const family2 = await prisma.family.upsert({ where: { userId: familyUser2.id }, update: {}, create: { userId: familyUser2.id } });

  // Demo Residents (8-12 with realistic varied data)
  const demoResidents = [
    // firstName, lastName, gender, status, age (for DOB calculation), roomNumber, payer, photoUrl
    ['Alice','Morgan','FEMALE','ACTIVE', 78, '101', 'Medicare', 'https://placehold.co/200x200/png?text=AM'],
    ['Benjamin','Lee','MALE','INQUIRY', 82, null, 'Private', null],
    ['Carla','Rodriguez','FEMALE','ACTIVE', 75, '205A', 'Medicaid', 'https://placehold.co/200x200/png?text=CR'],
    ['Daniel','Ng','MALE','PENDING', 88, null, 'Medicare', null],
    ['Ella','Chen','FEMALE','ACTIVE', 71, '312', 'Private', 'https://placehold.co/200x200/png?text=EC'],
    ['Frank','Ibrahim','MALE','ACTIVE', 85, 'B-204', 'Medicare', null],
    ['Grace','Kim','FEMALE','DISCHARGED', 92, null, 'Medicaid', null],
    ['Hector','Garcia','MALE','ACTIVE', 79, '118', 'Medicare', 'https://placehold.co/200x200/png?text=HG'],
    ['Isla','Patel','FEMALE','PENDING', 73, null, 'Private', null],
    ['Jack','Olsen','MALE','INQUIRY', 86, null, 'Medicare', null],
    ['Kara','Singh','FEMALE','ACTIVE', 77, '220', 'Private', 'https://placehold.co/200x200/png?text=KS'],
    ['Leo','Mendes','MALE','ACTIVE', 84, '315', 'Medicaid', null],
  ] as const;

  // Sample medical data for variation
  const allergiesSamples = [
    'Penicillin, Shellfish',
    'None known',
    'Sulfa drugs, Latex',
    'Peanuts, Tree nuts',
    null,
    'None',
    'Aspirin',
  ];
  
  const dietarySamples = [
    'Low sodium, Diabetic diet',
    'Pureed texture, Thickened liquids',
    'No restrictions',
    'Vegetarian',
    null,
    'Gluten-free',
    'Low cholesterol, Heart healthy',
  ];

  let toggle = false;
  for (const [firstName, lastName, gender, status, age, roomNumber, payer, photoUrl] of demoResidents) {
    const fam = toggle ? family2 : family;
    toggle = !toggle;
    
    // Calculate DOB based on age (current year - age)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - (age as number);
    const dob = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    // Random medical info selection
    const allergies = allergiesSamples[Math.floor(Math.random() * allergiesSamples.length)];
    const dietary = dietarySamples[Math.floor(Math.random() * dietarySamples.length)];
    
    // Build careNeeds JSON with payer and room info
    const careNeeds: any = {
      payerType: payer,
    };
    if (roomNumber) {
      careNeeds.roomNumber = roomNumber;
    }
    
    const created = await prisma.resident.create({
      data: {
        familyId: fam.id,
        homeId: home?.id ?? null,
        firstName, 
        lastName,
        dateOfBirth: dob,
        gender: gender as any,
        status: status as ResidentStatus,
        admissionDate: (status === 'ACTIVE' ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) : null) as any,
        photoUrl: photoUrl as string | null,
        allergies: allergies || null,
        dietaryRestrictions: dietary || null,
        careNeeds,
      }
    });
    // Contacts
    await prisma.residentContact.createMany({ data: [
      { residentId: created.id, name: `${firstName}'s Daughter`, relationship: 'Daughter', email: `${firstName.toLowerCase()}@family.test`, phone: '555-0100', isPrimary: true },
      { residentId: created.id, name: `${firstName}'s Son`, relationship: 'Son', phone: '555-0101', isPrimary: false },
    ]});
    // Compliance items
    await prisma.residentComplianceItem.createMany({ data: [
      { residentId: created.id, type: 'CARE_PLAN_REVIEW', title: 'Quarterly Care Plan Review', status: 'OPEN' as ComplianceStatus, dueDate: new Date(Date.now()+14*24*60*60*1000) },
      { residentId: created.id, type: 'FLU_SHOT', title: 'Annual Flu Shot', status: 'COMPLETED' as ComplianceStatus, completedAt: new Date() },
    ]});
    // Clinical
    await prisma.assessmentResult.create({ data: { residentId: created.id, type: 'ADL', score: 20, data: { ambulation: 'independent' } } });
    await prisma.residentIncident.create({ data: { residentId: created.id, type: 'Fall', severity: 'LOW', occurredAt: new Date(), description: 'No injury' } });
    await prisma.residentNote.create({ data: { residentId: created.id, content: 'Initial intake complete.', visibility: 'INTERNAL' as any } });
  }

  console.log(`✅ Residents demo data seeded: ${demoResidents.length} residents created with varied ages, medical info, room assignments, and photos.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
