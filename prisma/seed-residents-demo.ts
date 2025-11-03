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

  // Residents (~21 across statuses)
  const demoResidents = [
    ['Alice','Morgan','FEMALE','ACTIVE'],['Benjamin','Lee','MALE','INQUIRY'],['Carla','Rodriguez','FEMALE','ACTIVE'],
    ['Daniel','Ng','MALE','PENDING'],['Ella','Chen','FEMALE','ACTIVE'],['Frank','Ibrahim','MALE','ACTIVE'],
    ['Grace','Kim','FEMALE','DISCHARGED'],['Hector','Garcia','MALE','ACTIVE'],['Isla','Patel','FEMALE','PENDING'],
    ['Jack','Olsen','MALE','INQUIRY'],['Kara','Singh','FEMALE','ACTIVE'],['Leo','Mendes','MALE','ACTIVE'],
    ['Mia','Cohen','FEMALE','ACTIVE'],['Nate','Wong','MALE','DISCHARGED'],['Olivia','Diaz','FEMALE','ACTIVE'],
    ['Priya','Rao','FEMALE','PENDING'],['Quinn','Adams','MALE','ACTIVE'],['Rosa','Silva','FEMALE','ACTIVE'],
    ['Sam','Turner','MALE','ACTIVE'],['Tina','Vega','FEMALE','INQUIRY'],['Uma','White','FEMALE','ACTIVE']
  ] as const;

  let toggle = false;
  for (const [firstName,lastName,gender,status] of demoResidents) {
    const fam = toggle ? family2 : family;
    toggle = !toggle;
    const created = await prisma.resident.create({
      data: {
        familyId: fam.id,
        homeId: home?.id ?? null,
        firstName, lastName,
        dateOfBirth: new Date('1940-01-01'),
        gender: gender as any,
        status: status as ResidentStatus,
        admissionDate: (status === 'ACTIVE' ? new Date() : null) as any,
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

  console.log('✅ Residents demo data seeded.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
