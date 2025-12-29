import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { 
        home: { select: { operatorId: true } }
      },
    });
    if (!inquiry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Toggle urgency on the inquiry record
    const currentUrgency = inquiry.urgency || 'MEDIUM';
    const newUrgency = currentUrgency === 'HIGH' ? 'MEDIUM' : 'HIGH';

    // Add note about urgency change
    const urgencyNote = `Urgency changed from ${currentUrgency} to ${newUrgency}`;
    const updatedNotes = inquiry.internalNotes
      ? `${inquiry.internalNotes}\n\n${urgencyNote}`
      : urgencyNote;

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { 
        urgency: newUrgency,
        internalNotes: updatedNotes 
      }
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Inquiry',
      inquiry.id,
      'Urgency toggled',
      { urgency: newUrgency }
    );

    return NextResponse.json({ inquiry: updated, urgency: newUrgency });
  } catch (e) {
    console.error('Toggle priority failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
