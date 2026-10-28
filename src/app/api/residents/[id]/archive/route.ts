
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AuditAction, UserRole } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/residents/[id]/archive
 * Soft delete a resident by setting archivedAt timestamp and status to DISCHARGED
 * 
 * Assumptions:
 * - Only ADMIN or OPERATOR may archive; operators can only archive residents in their own homes
 * - Sets archivedAt to current timestamp
 * - Sets status to DISCHARGED (if not already DISCHARGED or DECEASED)
 * - Does not adjust home occupancy (already handled by discharge)
 * - Archived residents should be filtered out from list views by default
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get resident to validate access
    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, homeId: true, status: true, archivedAt: true },
    });
    
    if (!resident) return NextResponse.json({ error: 'Resident not found' }, { status: 404 });

    // Check if already archived
    if (resident.archivedAt) {
      return NextResponse.json({ error: 'Resident is already archived' }, { status: 400 });
    }

    // RBAC: Operators can only archive residents in their homes
    if (me.role === UserRole.OPERATOR && resident.homeId) {
      const op = await prisma.operator.findUnique({ where: { userId: me.id } });
      if (!op) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      const home = await prisma.assistedLivingHome.findUnique({
        where: { id: resident.homeId },
        select: { operatorId: true },
      });
      
      if (!home || home.operatorId !== op.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Archive the resident
    const updated = await prisma.resident.update({
      where: { id: resident.id },
      data: {
        archivedAt: new Date(),
        // Set status to DISCHARGED if not already DISCHARGED or DECEASED
        ...(resident.status !== 'DISCHARGED' && resident.status !== 'DECEASED' 
          ? { status: 'DISCHARGED', dischargeDate: new Date() } 
          : {}),
      },
      select: { id: true },
    });

    // Create audit log
    await createAuditLogFromRequest(
      req,
      AuditAction.UPDATE,
      'Resident',
      updated.id,
      'Resident archived',
      { archivedAt: new Date().toISOString() }
    );

    return NextResponse.json({ success: true, id: updated.id });
  } catch (e) {
    console.error('Resident archive error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
