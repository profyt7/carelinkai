/**
 * Seed script matching prompt requirements for Residents feature.
 * Assumptions logged inline:
 * - "Facilities" = AssistedLivingHome. We create 2 homes under a demo Operator.
 * - "Rooms" and "Payer types" are not first-class fields on Resident; stored in Resident.careNeeds JSON as { roomNumber, payerType }.
 * - "ComplianceRecord per facility" mapped to facility-level Inspections (3 per home) and at least one ResidentComplianceItem per home tied to a resident.
 * - "AdmissionFitScore" mapped to AIMatchingData entries (homeId+residentId, matchScore). Last one has recent createdAt; others backdated.
 */
import { PrismaClient, UserRole, UserStatus, ResidentStatus, ComplianceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertOperatorWithHomes() {
  const pwd = await bcrypt.hash('Operator123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'operator+seed@carelinkai.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: pwd, firstName: 'Olivia', lastName: 'Operator' },
    create: {
      email: 'operator+seed@carelinkai.com',
      firstName: 'Olivia',
      lastName: 'Operator',
      passwordHash: pwd,
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
    },
  });
  const operator = await prisma.operator.upsert({
    where: { userId: user.id },
    update: { companyName: 'CareLink Seed Ops' },
    create: { userId: user.id, companyName: 'CareLink Seed Ops' },
  });
  const existingA = await prisma.assistedLivingHome.findFirst({ where: { name: 'Sunrise Villa' } });
  const homeA = existingA ?? await prisma.assistedLivingHome.create({
    data: {
      operatorId: operator.id,
      name: 'Sunrise Villa',
      description: 'Seeded facility A',
      capacity: 50,
      currentOccupancy: 10,
      amenities: ['Meals', '24/7 Care', 'Garden'],
      careLevel: ['ASSISTED'],
    },
  });

  const existingB = await prisma.assistedLivingHome.findFirst({ where: { name: 'Maple Grove' } });
  const homeB = existingB ?? await prisma.assistedLivingHome.create({
    data: {
      operatorId: operator.id,
      name: 'Maple Grove',
      description: 'Seeded facility B',
      capacity: 40,
      currentOccupancy: 8,
      amenities: ['Activities', 'Laundry', 'Transportation'],
      careLevel: ['ASSISTED', 'MEMORY_CARE'],
    },
  });
  return { user, operator, homeA, homeB };
}

async function upsertFamilies() {
  const pwd = await bcrypt.hash('Family123!', 10);
  const emails = ['family.seed1@carelinkai.com', 'family.seed2@carelinkai.com', 'family.seed3@carelinkai.com'];
  const families = [] as Array<{ userId: string; id: string }>;
  for (const email of emails) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: pwd, status: UserStatus.ACTIVE, role: UserRole.FAMILY },
      create: { email, firstName: 'Family', lastName: email.split('@')[0]!, passwordHash: pwd, role: UserRole.FAMILY, status: UserStatus.ACTIVE },
    });
    const f = await prisma.family.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    families.push(f);
  }
  return families;
}

function randomChoice<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx]!;
}

async function createResidents(homes: [string, string], families: { id: string }[]) {
  const [homeAId, homeBId] = homes;
  if (!families.length) throw new Error('No families available to assign residents');
  const statuses: ResidentStatus[] = [ResidentStatus.ACTIVE, ResidentStatus.DISCHARGED, ResidentStatus.PENDING, ResidentStatus.INQUIRY];
  const genders = ['MALE', 'FEMALE', 'OTHER'] as const;
  const payerTypes = ['PRIVATE_PAY', 'MEDICAID', 'MEDICARE', 'LTC_INSURANCE'] as const;
  const names: Array<[string, string]> = [
    ['Alice','Morgan'],['Ben','Lee'],['Carla','Rodriguez'],['Daniel','Ng'],['Ella','Chen'],
    ['Frank','Ibrahim'],['Grace','Kim'],['Hector','Garcia'],['Isla','Patel'],['Jack','Olsen'],['Kara','Singh'],['Leo','Mendes']
  ];

  const created: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const [firstName, lastName] = names[i]!;
    const fam = families[i % families.length]!;
    const homeId = i % 2 === 0 ? homeAId : homeBId;
    const status = i < 8 ? ResidentStatus.ACTIVE : ResidentStatus.DISCHARGED; // mix
    const roomNumber = `${i % 2 === 0 ? 'A' : 'B'}-${100 + i}`;
    const payerType = payerTypes[i % payerTypes.length]!;
    const dob = new Date(1940, (i % 12), 1 + (i % 28));
    const admissionDate = status === ResidentStatus.ACTIVE ? new Date(Date.now() - (30 - i) * 86400000) : new Date(Date.now() - (200 + i) * 86400000);
    const dischargeDate = status === ResidentStatus.DISCHARGED ? new Date(Date.now() - (10 + i) * 86400000) : null;

    const r = await prisma.resident.create({
      data: {
        familyId: fam.id,
        homeId,
        firstName,
        lastName,
        dateOfBirth: dob,
        gender: randomChoice(genders),
        status,
        careNeeds: { roomNumber, payerType },
        admissionDate: admissionDate as any,
        dischargeDate: dischargeDate as any,
      },
    });

    // Create a booking record to reflect room/dates and billing context
    await prisma.booking.create({
      data: {
        familyId: fam.id,
        homeId,
        residentId: r.id,
        status: 'CONFIRMED',
        moveInDate: admissionDate as any,
        moveOutDate: dischargeDate as any,
        monthlyRate: 3000 + (i * 50) as any,
        notes: `Room ${roomNumber} - ${payerType}`,
      },
    });

    created.push(r.id);
  }
  return created;
}

async function addAssessments(residentIds: string[]) {
  // For 6 residents, add 1–2 AssessmentResult (ADL/FallRisk)
  const subset = residentIds.slice(0, 6);
  for (let i = 0; i < subset.length; i++) {
    const residentId = subset[i]!;
    await prisma.assessmentResult.create({ data: { residentId, type: 'ADL', score: 10 + i, data: { ambulation: i % 2 ? 'assisted' : 'independent' } } });
    if (i % 2 === 0) {
      await prisma.assessmentResult.create({ data: { residentId, type: 'FALL_RISK', score: 3 + (i % 5), data: { history: i % 3 ? 'none' : 'prior fall' } } });
    }
  }
}

async function addIncidents(residentIds: string[]) {
  // For 4 residents, add ResidentIncident (mix severities)
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'SEVERE'];
  const subset = residentIds.slice(6, 10);
  for (let i = 0; i < subset.length; i++) {
    const residentId = subset[i]!;
    await prisma.residentIncident.create({
      data: {
        residentId,
        type: 'Fall',
        severity: severities[i % severities.length]!,
        occurredAt: new Date(Date.now() - (i + 1) * 86400000),
        description: 'Seeded incident record',
      },
    });
  }
}

async function addFacilityCompliance(homeIds: string[], residentIds: string[]) {
  // 3 facility-level Inspections per home; plus at least 1 resident compliance per home
  for (const homeId of homeIds) {
    for (let i = 0; i < 3; i++) {
      await prisma.inspection.create({
        data: {
          homeId,
          inspectionDate: new Date(Date.now() - (60 - i) * 86400000),
          inspectionType: i % 2 ? 'ANNUAL' : 'FOLLOW_UP',
          inspector: 'State Health Dept',
          result: i % 2 ? 'PASS' : 'PASS_WITH_NOTES',
          findings: i % 2 ? null : 'Minor documentation issues',
        },
      });
    }
    const anyResident = randomChoice(residentIds);
    await prisma.residentComplianceItem.create({
      data: {
        residentId: anyResident,
        type: 'CARE_PLANS',
        title: 'Quarterly Care Plan Review',
        status: ComplianceStatus.CURRENT,
        issuedDate: new Date(Date.now() - 14 * 86400000),
        expiryDate: new Date(Date.now() + 76 * 86400000),
      },
    });
  }
}

async function addAdmissionFitScores(homeIds: string[], residentIds: string[]) {
  // 6 AIMatchingData rows with last one recent
  const pairs: Array<[string, string]> = [
    [residentIds[0]!, homeIds[0]!],
    [residentIds[1]!, homeIds[1]!],
    [residentIds[2]!, homeIds[0]!],
    [residentIds[3]!, homeIds[1]!],
    [residentIds[4]!, homeIds[0]!],
    [residentIds[5]!, homeIds[1]!],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const [residentId, homeId] = pairs[i]!;
    await prisma.aIMatchingData.create({
      data: {
        residentId,
        homeId,
        matchScore: 0.5 + i * 0.08,
        matchReason: 'Seeded AdmissionFitScore',
        metadata: { source: 'seed', kind: 'AdmissionFitScore' },
        createdAt: i < pairs.length - 1 ? new Date(Date.now() - (pairs.length - i) * 86400000) : new Date(),
      },
    });
  }
}

async function main() {
  console.log('Seeding residents per prompt...');
  const { homeA, homeB } = await upsertOperatorWithHomes();
  const families = await upsertFamilies();
  const residentIds = await createResidents([homeA.id, homeB.id], families);
  await addAssessments(residentIds);
  await addIncidents(residentIds);
  await addFacilityCompliance([homeA.id, homeB.id], residentIds);
  await addAdmissionFitScores([homeA.id, homeB.id], residentIds);
  console.log('✅ Seed complete: 2 facilities, 12 residents, assessments, incidents, facility/resident compliance, admission fit scores.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
