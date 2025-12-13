export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { checkFamilyMembership } from '@/lib/services/family';

/**
 * GET /api/family/residents/[id]/contacts
 * Family-safe list of resident contacts (read-only fields)
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

    const contacts = await prisma.residentContact.findMany({
      where: { residentId: resident.id },
      select: {
        id: true,
        name: true,
        relationship: true,
        email: true,
        phone: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isPrimary: 'desc' as any }, { createdAt: 'asc' as any }],
    });

    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'ResidentContact',
      resident.id,
      'Viewed resident contacts (family)',
      { familyAccess: true, scope: 'family_contacts', resultCount: contacts.length }
    );

    return NextResponse.json({ contacts });
  } catch (e) {
    console.error('Family resident contacts error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
