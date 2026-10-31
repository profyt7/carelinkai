/**
 * GET /api/operator/capabilities — which plan- or SMS-dependent operator tools this user can use
 * (src/lib/operator/capabilities.ts). Booleans only. The nav and pages use it to hide entry points the
 * server would reject; it grants nothing. Signed out or not an operator → everything false.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { smsService } from '@/lib/sms/sms-service';
import { NO_CAPABILITIES, operatorCapabilities } from '@/lib/operator/capabilities';

const headers = { 'cache-control': 'no-store' };

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json(NO_CAPABILITIES, { headers });
  const operator = await prisma.operator.findUnique({ where: { userId }, select: { subscriptionPlan: true } });
  return NextResponse.json(
    operatorCapabilities(session.user.role, operator ? operator.subscriptionPlan : undefined, smsService.isConfigured()),
    { headers },
  );
}
