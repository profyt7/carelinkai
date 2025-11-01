import { NextRequest, NextResponse } from 'next/server';
import { AuditAction, UserRole } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';


const BodySchema = z.object({
  homeId: z.string().min(1),
  effectiveDate: z.string().datetime().optional(),
});

/**
 * POST /api/residents/[id]/transfer
 * Move a resident between homes with RBAC + audit and occupancy adjustments.
 * Assumptions:
 * - Only ADMIN or OPERATOR may transfer; operators can only transfer within their own homes
 * - Adjusts AssistedLivingHome.currentOccupancy in a transaction when resident is ACTIVE
 * - effectiveDate stored via CareTimelineEvent for auditability (optional)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }
    const { homeId, effectiveDate } = parsed.data;

    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate operator can act on both old/new homes
    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, homeId: true, familyId: true },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newHome = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { id: true, operatorId: true } });
    if (!newHome) return NextResponse.json({ error: 'homeId invalid' }, { status: 400 });

    if (me.role === UserRole.OPERATOR) {
      const op = await prisma.operator.findUnique({ where: { userId: me.id } });
      // Old home must be owned by operator if present; new home must be owned by operator
      if (!op) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (resident.homeId) {
        const old = await prisma.assistedLivingHome.findUnique({ where: { id: resident.homeId }, select: { operatorId: true } });
        if (!old || old.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (newHome.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transaction: update resident home and adjust occupancy when ACTIVE
    const result = await prisma.$transaction(async (tx) => {
      // Decrement old home occupancy if ACTIVE and had a home
      if (resident.status === 'ACTIVE' && resident.homeId && resident.homeId !== homeId) {
        await tx.assistedLivingHome.update({
          where: { id: resident.homeId },
          data: { currentOccupancy: { decrement: 1 } },
        });
      }

      const updated = await tx.resident.update({
        where: { id: resident.id },
        data: { homeId },
        select: { id: true },
      });

      // Increment new home if ACTIVE
      if (resident.status === 'ACTIVE' && resident.homeId !== homeId) {
        await tx.assistedLivingHome.update({
          where: { id: homeId },
          data: { currentOccupancy: { increment: 1 } },
        });
      }

      // Optional: record a care timeline event for transfer
      if (effectiveDate) {
        await tx.careTimelineEvent.create({
          data: {
            residentId: resident.id,
            eventType: 'TRANSFER',
            title: 'Home transfer',
            description: `Resident transferred to new home (${homeId})`,
            scheduledAt: new Date(effectiveDate),
          },
        });
      }

      return updated;
    });

    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Resident',
      result.id,
      'Resident transferred between homes',
      { newHomeId: homeId, effectiveDate: effectiveDate ?? null }
    );

    return NextResponse.json({ success: true, id: result.id });
  } catch (e) {
    console.error('Resident transfer error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop: singleton
  }
}
