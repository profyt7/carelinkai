export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/fix-demo-employment
 * Creates CaregiverEmployment records linking all caregivers to the demo operator.
 * Safe to run multiple times (upsert-style: skips existing active records).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find the demo operator
  const demoOpUser = await prisma.user.findUnique({
    where: { email: 'demo.operator@carelinkai.test' },
    include: { operator: true },
  });

  if (!demoOpUser?.operator) {
    return NextResponse.json({ error: 'Demo operator not found. Run the main demo seed first.' }, { status: 404 });
  }

  const operatorId = demoOpUser.operator.id;

  // Get all caregivers
  const caregivers = await prisma.caregiver.findMany({
    select: { id: true },
  });

  if (caregivers.length === 0) {
    return NextResponse.json({ error: 'No caregivers found in database.' }, { status: 404 });
  }

  let created = 0;
  let skipped = 0;

  for (const cg of caregivers) {
    const existing = await prisma.caregiverEmployment.findFirst({
      where: { caregiverId: cg.id, operatorId, isActive: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.caregiverEmployment.create({
      data: {
        caregiverId: cg.id,
        operatorId,
        position: 'Caregiver',
        startDate: new Date('2024-01-01'),
        isActive: true,
      },
    });
    created++;
  }

  return NextResponse.json({
    ok: true,
    message: `Done. Created ${created} employment records, skipped ${skipped} already linked.`,
    created,
    skipped,
    total: caregivers.length,
  });
}
