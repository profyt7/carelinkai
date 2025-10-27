import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, ResidentStatus } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Number(url.searchParams.get('limit') || '25'), 100);
    const cursor = url.searchParams.get('cursor') || undefined;

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const whereBase: any = {};
    if (q) {
      whereBase.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

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
    return NextResponse.json({ items: page, nextCursor });
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


