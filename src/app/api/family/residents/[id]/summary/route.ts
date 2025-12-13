export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { checkFamilyMembership } from '@/lib/services/family';

function calcAge(dob?: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(0, age);
}

/**
 * GET /api/family/residents/[id]/summary
 * Family-only safe resident summary.
 * Assumptions:
 * - Only FAMILY role may access; membership to the resident's family is required
 * - Returns minimal, non-PHI fields suitable for a family portal
 * - Logs READ access for compliance; not marked as PHI export
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAnyRole([]);
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        dateOfBirth: true,
        admissionDate: true,
        dischargeDate: true,
        familyId: true,
        home: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isMember = await checkFamilyMembership(userId, resident.familyId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Audit: log safe READ access (family summary)
    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'Resident',
      resident.id,
      'Viewed family-safe resident summary',
      { familyAccess: true, scope: 'family_summary' }
    );

    return NextResponse.json({
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`.trim(),
      status: resident.status,
      age: calcAge(resident.dateOfBirth),
      dateOfBirth: resident.dateOfBirth,
      admissionDate: resident.admissionDate,
      dischargeDate: resident.dischargeDate,
      home: resident.home ? { id: resident.home.id, name: resident.home.name } : null,
      createdAt: resident.createdAt,
      updatedAt: resident.updatedAt,
    });
  } catch (e) {
    console.error('Family resident summary error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
