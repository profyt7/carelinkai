export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const COMPLIANCE_KITS = [
  {
    id: 'ohio-alf-startup',
    name: 'Ohio ALF Startup Compliance Kit',
    description:
      'Everything you need to open a licensed assisted living facility in Ohio: sample policies, state-required forms, incident reporting templates, PASRR checklist, and staff training documentation.',
    priceUsd: 199,
    items: [
      'Resident Rights Policy Template',
      'Emergency Evacuation Plan Template',
      'Infection Control Policy',
      'Incident & Accident Reporting Forms',
      'Medication Administration Policy',
      'PASRR Level I Screening Checklist',
      'Staff Orientation Checklist',
      'Grievance Procedure Policy',
      'Abuse Prevention & Reporting Policy',
      'Admission Agreement Template',
    ],
  },
  {
    id: 'annual-survey-prep',
    name: 'Annual State Survey Prep Kit',
    description:
      'Mock survey checklist, corrective action plan templates, deficiency response letters, and a 30-day pre-survey readiness timeline based on Ohio ODH requirements.',
    priceUsd: 149,
    items: [
      'Mock Survey Checklist (Ohio ODH standards)',
      'Pre-Survey 30-Day Readiness Timeline',
      'Deficiency Response Letter Templates',
      'Corrective Action Plan (CAP) Template',
      'Resident File Audit Checklist',
      'Physical Environment Inspection Checklist',
      'Staff Competency Verification Forms',
    ],
  },
  {
    id: 'memory-care-compliance',
    name: 'Memory Care Unit Compliance Kit',
    description:
      'Ohio-specific policies and forms for operating a certified memory care unit, including behavioral management protocols, secured environment checklists, and dementia training documentation.',
    priceUsd: 149,
    items: [
      'Dementia Care Philosophy Statement',
      'Secured Unit Elopement Prevention Policy',
      'Behavioral Symptom Management Protocol',
      'Dementia-Specific Activities Calendar Template',
      'Cognitive Assessment Documentation Forms',
      'Staff Dementia Training Log',
      'Family Education Program Outline',
    ],
  },
];

const PurchaseSchema = z.object({
  kitId: z.string().min(1),
});

/**
 * GET /api/operator/compliance-kits
 * Returns available kits and the operator's purchase history.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });

  const purchases = await prisma.complianceKitPurchase.findMany({
    where: { operatorId: operator.id },
    orderBy: { createdAt: 'desc' },
    select: { kitType: true, status: true, downloadUrl: true, createdAt: true },
  });

  return NextResponse.json({ kits: COMPLIANCE_KITS, purchases });
}

/**
 * POST /api/operator/compliance-kits
 * Body: { kitId }
 *
 * Creates a Stripe Checkout Session for a one-time kit purchase.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });

  const body = PurchaseSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: 'kitId is required' }, { status: 400 });
  }

  const kit = COMPLIANCE_KITS.find((k) => k.id === body.data.kitId);
  if (!kit) return NextResponse.json({ error: 'Kit not found' }, { status: 404 });

  // Prevent duplicate purchase
  const existing = await prisma.complianceKitPurchase.findFirst({
    where: { operatorId: operator.id, kitType: kit.id, status: 'COMPLETED' },
  });
  if (existing) {
    return NextResponse.json({ error: 'You have already purchased this kit', downloadUrl: existing.downloadUrl }, { status: 409 });
  }

  // Create or reuse Stripe customer
  let stripeCustomerId = operator.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: `${user.firstName} ${user.lastName}`.trim() || operator.companyName,
      metadata: { operatorId: operator.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.operator.update({ where: { id: operator.id }, data: { stripeCustomerId } });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  // Create a pending purchase record
  const purchase = await prisma.complianceKitPurchase.create({
    data: {
      operatorId: operator.id,
      kitType: kit.id,
      amountCents: kit.priceUsd * 100,
      status: 'PENDING',
    },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: kit.name, description: kit.description },
          unit_amount: kit.priceUsd * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/operator/compliance-kits?purchase=success&purchaseId=${purchase.id}`,
    cancel_url: `${appUrl}/operator/compliance-kits?purchase=canceled`,
    metadata: { purchaseId: purchase.id, kitId: kit.id, operatorId: operator.id },
  });

  // Store the Stripe session ID so the webhook can match it
  await prisma.complianceKitPurchase.update({
    where: { id: purchase.id },
    data: { stripePaymentId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
