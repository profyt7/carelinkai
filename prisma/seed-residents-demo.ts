/**
 * Residents Demo Seed Script for CareLinkAI
 * - Creates a demo Family and three Residents with basic notes/incidents/assessments
 * - Safe to re-run (upserts by email for family user)
 */
import { PrismaClient, UserRole, UserStatus, ResidentStatus } from '@prisma/client';
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

  // Residents
  const residentsData = [
    { firstName: 'Alice', lastName: 'Morgan', gender: 'FEMALE', status: ResidentStatus.ACTIVE },
    { firstName: 'Benjamin', lastName: 'Lee', gender: 'MALE', status: ResidentStatus.INQUIRY },
    { firstName: 'Carla', lastName: 'Rodriguez', gender: 'FEMALE', status: ResidentStatus.ACTIVE },
  ];

  for (const r of residentsData) {
    const created = await prisma.resident.create({
      data: {
        familyId: family.id,
        homeId: home?.id ?? null,
        firstName: r.firstName,
        lastName: r.lastName,
        dateOfBirth: new Date('1940-01-01'),
        gender: r.gender,
        status: r.status,
        admissionDate: r.status === ResidentStatus.ACTIVE ? new Date() : null,
      }
    });
    await prisma.assessmentResult.create({ data: { residentId: created.id, type: 'ADL', score: 20, data: { ambulation: 'independent' } } });
    await prisma.residentIncident.create({ data: { residentId: created.id, type: 'Fall', severity: 'LOW', occurredAt: new Date(), description: 'No injury' } });
    await prisma.residentNote.create({ data: { residentId: created.id, content: 'Initial intake complete.', visibility: 'INTERNAL' as any } });
  }

  console.log('✅ Residents demo data seeded.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
