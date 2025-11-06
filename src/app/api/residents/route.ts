export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';

// GET /api/residents
// Lists residents for operators (scoped to their homes) or all for admins.
// Supports filters: q (name contains), status, homeId, familyId
// Pagination: limit (default 50, max 200), cursor (resident.id)
// CSV export: format=csv
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const homeId = (searchParams.get('homeId') || '').trim();
    const familyId = (searchParams.get('familyId') || '').trim();
    const cursor = (searchParams.get('cursor') || '').trim();
    const format = (searchParams.get('format') || '').trim().toLowerCase();
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;

    // Compute operator scope if not admin
    let allowedHomeIds: string[] | null = null;
    if (role !== 'ADMIN') {
      const operator = await prisma.operator.findUnique({ where: { userId }, select: { id: true } });
      if (!operator) return NextResponse.json({ items: [], nextCursor: null });
      const homes = await prisma.assistedLivingHome.findMany({ where: { operatorId: operator.id }, select: { id: true } });
      allowedHomeIds = homes.map(h => h.id);
      if (allowedHomeIds.length === 0) {
        return NextResponse.json({ items: [], nextCursor: null });
      }
    }

    const where: any = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as any;
    if (homeId) where.homeId = homeId;
    if (familyId) where.familyId = familyId;
    if (allowedHomeIds) {
      // Show only residents in operator-managed homes; allow nulls only when explicitly filtered by homeId=null (not supported here)
      where.homeId = where.homeId ? where.homeId : { in: allowedHomeIds };
    }

    const queryOpts: any = {
      where,
      take: limit + 1, // over-fetch to determine next cursor
      orderBy: { id: 'asc' },
      select: { id: true, firstName: true, lastName: true, status: true },
    };
    if (cursor) queryOpts.cursor = { id: cursor };
    if (cursor) queryOpts.skip = 1;

    const rows = await prisma.resident.findMany(queryOpts);
    let nextCursor: string | null = null;
    let items = rows;
    if (rows.length > limit) {
      const last = rows[rows.length - 1];
      if (last) {
        nextCursor = (last as any).id as string;
      }
      items = rows.slice(0, limit);
    }

    if (format === 'csv') {
      const header = 'id,firstName,lastName,status\n';
      const body = items.map(r => `${r.id},${JSON.stringify(r.firstName).slice(1, -1)},${JSON.stringify(r.lastName).slice(1, -1)},${r.status}`).join('\n');
      const csv = header + body + (body ? '\n' : '');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (e) {
    console.error('Residents GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function assertOperatorHomeOwnership(userId: string, homeId?: string | null) {
  if (!homeId) return true; // Allow creating unassigned residents
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return false;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { operatorId: true } });
  return !!home && home.operatorId === operator.id;
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { familyId, homeId, firstName, lastName, dateOfBirth, gender, status } = body || {};
    if (!familyId || !firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'familyId, firstName, lastName, dateOfBirth, gender are required' }, { status: 400 });
    }

    if (role !== 'ADMIN') {
      const ok = await assertOperatorHomeOwnership(userId, homeId);
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure family exists
    const fam = await prisma.family.findUnique({ where: { id: familyId }, select: { id: true } });
    if (!fam) return NextResponse.json({ error: 'Family not found' }, { status: 404 });

    // Create resident
    const created = await prisma.resident.create({
      data: {
        familyId,
        homeId: homeId || null,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        status: (status || 'INQUIRY') as any,
      },
      select: { id: true },
    });

    await createAuditLogFromRequest(
      req,
      'CREATE' as any,
      'Resident',
      created.id,
      'Created resident',
      { homeId: homeId || null, familyId }
    );

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Resident create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
