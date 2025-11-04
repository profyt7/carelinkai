import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, ResidentStatus } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { recordDataExport } from '@/lib/audit';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Number(url.searchParams.get('limit') || '25'), 100);
    const cursor = url.searchParams.get('cursor') || undefined;
    const status = (url.searchParams.get('status') || '').trim();
    const homeId = (url.searchParams.get('homeId') || '').trim();
    const familyId = (url.searchParams.get('familyId') || '').trim();
    const format = (url.searchParams.get('format') || '').trim().toLowerCase();
    const include = (url.searchParams.get('include') || '').trim().toLowerCase();
    const compliance = (url.searchParams.get('compliance') || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const whereBase: any = {};
    if (q) {
      whereBase.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) whereBase.status = status as any;
    if (homeId) whereBase.homeId = homeId;
    if (familyId) whereBase.familyId = familyId;

    if (user.role === UserRole.OPERATOR) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op) return NextResponse.json({ items: [], nextCursor: null });
      whereBase.home = { operatorId: op.id };
    }

    const items = await prisma.resident.findMany({
      where: whereBase,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        homeId: true,
        createdAt: true,
      },
    });
    const hasNext = items.length > limit;
    const page = hasNext ? items.slice(0, -1) : items;
    const last = items[items.length - 1];
    const nextCursor = hasNext && last ? last.id : null;
    if (format === 'csv') {
      const header = 'id,firstName,lastName,status,homeId,createdAt\n';
      const rows = page
        .map((r) => [r.id, r.firstName, r.lastName, r.status, r.homeId ?? '', r.createdAt.toISOString()]
          .map((v) => String(v).replaceAll('"', '""'))
          .map((v) => /[",\n]/.test(v) ? `"${v}"` : v)
          .join(','))
        .join('\n');
      // Audit the export
      await recordDataExport(user.id, 'Resident', 'csv', { q, status, homeId, familyId }, page.length, req);
      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }
    // Optional compliance filter (residents having at least one matching open item)
    let filtered = page;
    if (compliance) {
      const now = new Date();
      const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const baseWhere: any = { status: 'OPEN', residentId: { in: page.map((r) => r.id) } };
      if (compliance === 'open') {
        // no extra date constraints
      } else if (compliance === 'duesoon' || compliance === 'due-soon') {
        baseWhere.dueDate = { gte: now, lte: soon };
      } else if (compliance === 'overdue') {
        baseWhere.dueDate = { lt: now };
      }
      const groups = await prisma.residentComplianceItem.groupBy({
        by: ['residentId'],
        where: baseWhere,
        _count: { _all: true },
      });
      const allowed = new Set(groups.map((g) => g.residentId));
      filtered = page.filter((r) => allowed.has(r.id));
    }

    // Optional include=summary (compliance badges)
    if (include.includes('summary') && filtered.length > 0) {
      const ids = filtered.map((r) => r.id);
      const now = new Date();
      const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const [openG, dueSoonG, overdueG] = await Promise.all([
        prisma.residentComplianceItem.groupBy({ by: ['residentId'], where: { residentId: { in: ids }, status: 'OPEN' as any }, _count: { _all: true } }),
        prisma.residentComplianceItem.groupBy({ by: ['residentId'], where: { residentId: { in: ids }, status: 'OPEN' as any, dueDate: { gte: now, lte: soon } }, _count: { _all: true } }),
        prisma.residentComplianceItem.groupBy({ by: ['residentId'], where: { residentId: { in: ids }, status: 'OPEN' as any, dueDate: { lt: now } }, _count: { _all: true } }),
      ]);
      const openMap = Object.fromEntries(openG.map((g) => [g.residentId, g._count._all]));
      const dueSoonMap = Object.fromEntries(dueSoonG.map((g) => [g.residentId, g._count._all]));
      const overdueMap = Object.fromEntries(overdueG.map((g) => [g.residentId, g._count._all]));
      const itemsWith = filtered.map((r) => ({
        ...r,
        complianceSummary: {
          open: openMap[r.id] || 0,
          dueSoon: dueSoonMap[r.id] || 0,
          overdue: overdueMap[r.id] || 0,
        },
      }));
      return NextResponse.json({ items: itemsWith, nextCursor });
    }

    return NextResponse.json({ items: filtered, nextCursor });
  } catch (e) {
    console.error('Residents list error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { familyId, homeId, firstName, lastName, dateOfBirth, gender, status } = body || {};

    if (!familyId || !firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let resolvedHomeId = homeId as string | null | undefined;
    if (user.role === UserRole.OPERATOR && resolvedHomeId) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: resolvedHomeId }, select: { operatorId: true } });
      if (!home || home.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const created = await prisma.resident.create({
      data: {
        familyId,
        homeId: resolvedHomeId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        status: (status as ResidentStatus) || ResidentStatus.INQUIRY,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Resident create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}


