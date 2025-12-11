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
        home: { select: { operatorId: true } },
        family: { select: { priority: true } }
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

    // Toggle priority on the family record
    const currentPriority = inquiry.family.priority || 'NONE';
    const newPriority = currentPriority === 'HIGH' ? 'MEDIUM' : 'HIGH';

    const updatedFamily = await prisma.family.update({
      where: { id: inquiry.familyId },
      data: { priority: newPriority },
    });

    // Add note about priority change
    const priorityNote = `Priority changed from ${currentPriority} to ${newPriority}`;
    const updatedNotes = inquiry.internalNotes
      ? `${inquiry.internalNotes}\n\n${priorityNote}`
      : priorityNote;

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { internalNotes: updatedNotes },
      include: {
        family: { select: { priority: true } }
      }
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      user.id,
      AuditAction.UPDATE,
      'Inquiry',
      inquiry.id,
      { priority: newPriority },
      'Priority toggled'
    );

    return NextResponse.json({ inquiry: updated, priority: newPriority });
  } catch (e) {
    console.error('Toggle priority failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
