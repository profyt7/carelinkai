export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

const STARTER_HIRE_FEE_CENTS = parseInt(
  process.env.MARKETPLACE_HIRE_FEE_CENTS ?? '9900',
  10
);

const PAID_PLANS = new Set(['PROFESSIONAL', 'GROWTH', 'AGENCY']);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'OPERATOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const caregiverId = params.id;
  const body = await request.json().catch(() => ({}));
  const position: string = body.position || 'Caregiver';

  const operator = await prisma.operator.findFirst({
    where: { userId: session.user.id },
    select: { id: true, userId: true, stripeCustomerId: true, subscriptionPlan: true },
  });
  if (!operator) {
    return NextResponse.json({ error: 'Operator profile not found' }, { status: 404 });
  }

  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!caregiver) {
    return NextResponse.json({ error: 'Caregiver not found' }, { status: 404 });
  }

  // Create or reactivate employment record
  const existing = await prisma.caregiverEmployment.findFirst({
    where: { caregiverId, operatorId: operator.id },
  });
  if (existing) {
    await prisma.caregiverEmployment.update({
      where: { id: existing.id },
      data: { isActive: true, position },
    });
  } else {
    await prisma.caregiverEmployment.create({
      data: { caregiverId, operatorId: operator.id, position, startDate: new Date(), isActive: true },
    });
  }

  // Create MarketplaceHire record (enables review permission)
  await prisma.marketplaceHire.create({
    data: { caregiverId },
  }).catch(() => {
    // Swallow — non-fatal if duplicate
  });

  // Notify caregiver
  await prisma.notification.create({
    data: {
      userId: caregiver.user.id,
      type: 'SYSTEM',
      title: 'You have been hired!',
      message: `You have been hired as ${position}. Welcome to the team!`,
      link: '/caregiver/applications',
    },
  }).catch(() => {});

  // Trigger hire fee for Starter plans (non-blocking)
  if (!PAID_PLANS.has(operator.subscriptionPlan ?? '')) {
    triggerDirectHireFee(operator, `${caregiver.user.firstName} ${caregiver.user.lastName}`).catch(
      (err) => console.error('[DIRECT_HIRE_FEE]', err)
    );
  }

  return NextResponse.json({ success: true });
}

async function triggerDirectHireFee(
  operator: { id: string; userId: string; stripeCustomerId: string | null },
  caregiverName: string
) {
  let payment: { id: string } | null = null;
  try {
    payment = await prisma.payment.create({
      data: {
        userId: operator.userId,
        amount: STARTER_HIRE_FEE_CENTS / 100,
        status: 'PENDING',
        type: 'MARKETPLACE_HIRE_FEE',
        description: `Marketplace hire access fee — ${caregiverName}`,
      },
    });
  } catch (err) {
    console.error('[DIRECT_HIRE_FEE] Could not create payment record:', err);
    return;
  }

  if (!operator.stripeCustomerId) {
    console.warn('[DIRECT_HIRE_FEE] No Stripe customer — fee recorded as PENDING');
    return;
  }

  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: operator.stripeCustomerId,
      amount: STARTER_HIRE_FEE_CENTS,
      currency: 'usd',
      description: `Marketplace hire access fee — ${caregiverName}`,
      metadata: { type: 'MARKETPLACE_HIRE_FEE' },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PROCESSING', stripePaymentId: invoiceItem.id },
    });
  } catch (err: any) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }).catch(() => {});
    console.error('[DIRECT_HIRE_FEE] Failed to queue invoice item:', err?.message ?? err);
  }
}
