export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * GET /api/operator/billing/invoices
 * Returns the current operator's invoice history, newest first.
 */
export async function GET(request: NextRequest) {
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

  const invoices = await prisma.invoice.findMany({
    where: { operatorId: operator.id },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      id: true,
      stripeInvoiceId: true,
      status: true,
      amountDue: true,
      amountPaid: true,
      currency: true,
      description: true,
      periodStart: true,
      periodEnd: true,
      invoiceUrl: true,
      invoicePdf: true,
      paidAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invoices });
}
