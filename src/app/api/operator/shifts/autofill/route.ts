export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findCaregiverMatchesForShift } from '@/lib/ai/shift-autofill';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const BodySchema = z.object({
  homeId: z.string().min(1),
  description: z.string().min(5, 'Please describe the shift need'),
  date: z.string().optional(),
});

/**
 * POST /api/operator/shifts/autofill
 * Body: { homeId, description, date? }
 *
 * Uses Claude to match available caregivers to a described shift need.
 * Returns ranked matches with explanations.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  // Verify home belongs to this operator
  const home = await prisma.assistedLivingHome.findFirst({
    where: { id: body.data.homeId, operatorId: operator.id },
    select: { id: true },
  });
  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  const result = await findCaregiverMatchesForShift({
    homeId: body.data.homeId,
    operatorId: operator.id,
    description: body.data.description,
    date: body.data.date,
  });

  return NextResponse.json(result);
}
