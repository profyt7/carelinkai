import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus, ResidentStatus, ComplianceStatus } from '@prisma/client';

function randomChoice<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx]!;
}

export async function runDemoSeed() {
  const pwdOp = await bcrypt.hash('Operator123!', 10);
  const opUser = await prisma.user.upsert({
    where: { email: 'operator+seed@carelinkai.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: pwdOp, firstName: 'Olivia', lastName: 'Operator' },
    create: { email: 'operator+seed@carelinkai.com', firstName: 'Olivia', lastName: 'Operator', passwordHash: pwdOp, role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
  });
  const operator = await prisma.operator.upsert({ where: { userId: opUser.id }, update: { companyName: 'CareLink Seed Ops' }, create: { userId: opUser.id, companyName: 'CareLink Seed Ops' } });

  const homeA = (await prisma.assistedLivingHome.findFirst({ where: { name: 'Sunrise Villa', operatorId: operator.id } })) ??
    await prisma.assistedLivingHome.create({ data: { operatorId: operator.id, name: 'Sunrise Villa', description: 'Seeded facility A', capacity: 50, currentOccupancy: 10, amenities: ['Meals','24/7 Care','Garden'], careLevel: ['ASSISTED'] } });
  const homeB = (await prisma.assistedLivingHome.findFirst({ where: { name: 'Maple Grove', operatorId: operator.id } })) ??
    await prisma.assistedLivingHome.create({ data: { operatorId: operator.id, name: 'Maple Grove', description: 'Seeded facility B', capacity: 40, currentOccupancy: 8, amenities: ['Activities','Laundry','Transportation'], careLevel: ['ASSISTED','MEMORY_CARE'] } });

  // Families
  const pwdFam = await bcrypt.hash('Family123!', 10);
  const emails = ['family.seed1@carelinkai.com','family.seed2@carelinkai.com','family.seed3@carelinkai.com'];
  const families: Array<{ id: string }> = [];
  for (const email of emails) {
    const u = await prisma.user.upsert({ where: { email }, update: { passwordHash: pwdFam, status: UserStatus.ACTIVE, role: UserRole.FAMILY }, create: { email, firstName: 'Family', lastName: email.split('@')[0]!, passwordHash: pwdFam, role: UserRole.FAMILY, status: UserStatus.ACTIVE } });
    const f = await prisma.family.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    families.push({ id: f.id });
  }

  // Residents (12)
  const genders = ['MALE','FEMALE','OTHER'] as const;
  const payerTypes = ['PRIVATE_PAY','MEDICAID','MEDICARE','LTC_INSURANCE'] as const;
  const names: Array<[string,string]> = [['Alice','Morgan'],['Ben','Lee'],['Carla','Rodriguez'],['Daniel','Ng'],['Ella','Chen'],['Frank','Ibrahim'],['Grace','Kim'],['Hector','Garcia'],['Isla','Patel'],['Jack','Olsen'],['Kara','Singh'],['Leo','Mendes']];
  const residentIds: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const [firstName, lastName] = names[i]!;
    const fam = families[i % families.length]!;
    const homeId = i % 2 === 0 ? homeA.id : homeB.id;
    const status = i < 8 ? ResidentStatus.ACTIVE : ResidentStatus.DISCHARGED;
    const roomNumber = `${i % 2 === 0 ? 'A' : 'B'}-${100 + i}`;
    const payerType = payerTypes[i % payerTypes.length]!;
    const dob = new Date(1940, (i % 12), 1 + (i % 28));
    const admissionDate = status === ResidentStatus.ACTIVE ? new Date(Date.now() - (30 - i) * 86400000) : new Date(Date.now() - (200 + i) * 86400000);
    const dischargeDate = status === ResidentStatus.DISCHARGED ? new Date(Date.now() - (10 + i) * 86400000) : null;

    const r = await prisma.resident.create({ data: { familyId: fam.id, homeId, firstName, lastName, dateOfBirth: dob, gender: randomChoice(genders), status, careNeeds: { roomNumber, payerType }, admissionDate: admissionDate as any, dischargeDate: dischargeDate as any } });
    await prisma.booking.create({ data: { familyId: fam.id, homeId, residentId: r.id, status: 'CONFIRMED', moveInDate: admissionDate as any, moveOutDate: dischargeDate as any, monthlyRate: 3000 + (i * 50) as any, notes: `Room ${roomNumber} - ${payerType}` } });
    residentIds.push(r.id);
  }

  // Assessments (first 6 residents 1-2)
  for (let i = 0; i < Math.min(6, residentIds.length); i++) {
    const residentId = residentIds[i]!;
    await prisma.assessmentResult.create({ data: { residentId, type: 'ADL', score: 10 + i, data: { ambulation: i % 2 ? 'assisted' : 'independent' } } });
    if (i % 2 === 0) {
      await prisma.assessmentResult.create({ data: { residentId, type: 'FALL_RISK', score: 3 + (i % 5), data: { history: i % 3 ? 'none' : 'prior fall' } } });
    }
  }

  // Incidents (next 4)
  const severities = ['LOW','MEDIUM','HIGH','SEVERE'];
  for (let i = 6; i < Math.min(10, residentIds.length); i++) {
    const residentId = residentIds[i]!;
    await prisma.residentIncident.create({ data: { residentId, type: 'Fall', severity: severities[i % severities.length]!, occurredAt: new Date(Date.now() - (i + 1) * 86400000), description: 'Seeded incident record' } });
  }

  // Facility compliance (3 per home) + 1 resident compliance per home
  for (const homeId of [homeA.id, homeB.id]) {
    for (let i = 0; i < 3; i++) {
      await prisma.inspection.create({ data: { homeId, inspectionDate: new Date(Date.now() - (60 - i) * 86400000), inspectionType: i % 2 ? 'ANNUAL' : 'FOLLOW_UP', inspector: 'State Health Dept', result: i % 2 ? 'PASS' : 'PASS_WITH_NOTES', findings: i % 2 ? null : 'Minor documentation issues' } });
    }
    const anyResident = randomChoice(residentIds);
    await prisma.residentComplianceItem.create({ data: { residentId: anyResident, type: 'CARE_PLAN_REVIEW', title: 'Quarterly Care Plan Review', status: ComplianceStatus.CURRENT, expiryDate: new Date(Date.now() + 14 * 86400000) } });
  }

  // Admission fit scores (6 pairs)
  const pairs: Array<[string,string]> = [
    [residentIds[0]!, homeA.id],
    [residentIds[1]!, homeB.id],
    [residentIds[2]!, homeA.id],
    [residentIds[3]!, homeB.id],
    [residentIds[4]!, homeA.id],
    [residentIds[5]!, homeB.id],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const [residentId, homeId] = pairs[i]!;
    await prisma.aIMatchingData.create({ data: { residentId, homeId, matchScore: 0.5 + i * 0.08, matchReason: 'Seeded AdmissionFitScore', metadata: { source: 'seed', kind: 'AdmissionFitScore' }, createdAt: i < pairs.length - 1 ? new Date(Date.now() - (pairs.length - i) * 86400000) : new Date() } });
  }

  return { operatorId: operator.id, homes: [{ id: homeA.id, name: homeA.name }, { id: homeB.id, name: homeB.name }], residents: residentIds };
}
