export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { checkFamilyMembership } from '@/lib/services/family';

/**
 * GET /api/family/residents/[id]/compliance/summary
 * Family-safe compliance summary counts (no PHI details)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAnyRole([]);
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, familyId: true },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isMember = await checkFamilyMembership(userId, resident.familyId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [open, completed, dueSoon, overdue] = await Promise.all([
      prisma.residentComplianceItem.count({
        where: { residentId: resident.id, status: { in: ['CURRENT', 'EXPIRING_SOON', 'EXPIRED'] as any[] } },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: resident.id, status: 'CURRENT' as any },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: resident.id, status: 'EXPIRING_SOON' as any },
      }),
      prisma.residentComplianceItem.count({
        where: { residentId: resident.id, status: 'EXPIRED' as any },
      }),
    ]);

    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'ResidentComplianceItem',
      resident.id,
      'Viewed family compliance summary',
      { familyAccess: true, scope: 'family_compliance_summary' }
    );

    return NextResponse.json({ open, completed, dueSoon, overdue });
  } catch (e) {
    console.error('Family resident compliance summary error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
