import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

/**
 * Queue a marketplace hire fee against the operator's next Stripe invoice.
 * Non-blocking — shift claim always succeeds regardless of billing outcome.
 */
export async function triggerMarketplaceHireFee(
  hireId: string,
  shiftId: string,
  caregiverName: string
): Promise<void> {
  const feeCents = parseInt(process.env.MARKETPLACE_HIRE_FEE_CENTS ?? '25000', 10);

  // Resolve operator via shift → home → operator
  const shift = await prisma.caregiverShift.findUnique({
    where: { id: shiftId },
    select: {
      home: {
        select: {
          operatorId: true,
          operator: {
            select: { id: true, userId: true, stripeCustomerId: true },
          },
        },
      },
    },
  });

  const operator = shift?.home?.operator ?? null;

  if (!operator) {
    console.warn('[HIRE_FEE] No operator found for shift', shiftId);
    return;
  }

  let payment: { id: string } | null = null;
  try {
    payment = await prisma.payment.create({
      data: {
        userId: operator.userId,
        amount: feeCents / 100,
        status: 'PENDING',
        type: 'MARKETPLACE_HIRE_FEE',
        description: `Marketplace hire fee — ${caregiverName}`,
      },
    });
  } catch (err) {
    console.error('[HIRE_FEE] Could not create payment record:', err);
    return;
  }

  if (!operator.stripeCustomerId) {
    console.warn('[HIRE_FEE] No Stripe customer — fee recorded as PENDING for manual collection', {
      paymentId: payment.id,
      hireId,
    });
    return;
  }

  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: operator.stripeCustomerId,
      amount: feeCents,
      currency: 'usd',
      description: `Marketplace hire fee — ${caregiverName}`,
      metadata: { hireId, type: 'MARKETPLACE_HIRE_FEE' },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        stripePaymentId: invoiceItem.id,
        description: `Marketplace hire fee — ${caregiverName} (queued for next invoice)`,
      },
    });

    console.log(`[HIRE_FEE] ✅ Queued $${feeCents / 100} for ${caregiverName}`, {
      invoiceItemId: invoiceItem.id,
    });
  } catch (err: any) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
    console.error('[HIRE_FEE] Failed to queue invoice item:', err?.message ?? err);
  }
}
