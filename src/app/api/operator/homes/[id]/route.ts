
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  currentOccupancy: z.number().int().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  status: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id } });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const data: any = { ...parsed.data };

    const updated = await prisma.assistedLivingHome.update({ where: { id: home.id }, data });
    return NextResponse.json({ id: updated.id });
  } catch (e) {
    console.error('Update home failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  // Support form-encoded quick updates from Manage Home page
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Delegate to PATCH for JSON payloads
      return await PATCH(req, ctx as any);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({ where: { id: ctx.params.id } });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await (req as any).formData();
    const action = String(form.get('_action') || 'quick-update');
    if (action !== 'quick-update') return NextResponse.json({ ok: true });

    const status = form.get('status') ? String(form.get('status')) : undefined;
    const currentOccupancyStr = form.get('currentOccupancy') ? String(form.get('currentOccupancy')) : undefined;
    const currentOccupancy = currentOccupancyStr ? Math.max(0, Math.min(parseInt(currentOccupancyStr, 10) || 0, home.capacity)) : undefined;
    const amenitiesStr = form.get('amenities') ? String(form.get('amenities')) : undefined;
    const amenities = amenitiesStr !== undefined ? amenitiesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    const data: any = {};
    if (status) data.status = status;
    if (currentOccupancy !== undefined) data.currentOccupancy = currentOccupancy;
    if (amenities !== undefined) data.amenities = amenities;

    await prisma.assistedLivingHome.update({ where: { id: home.id }, data });
    return NextResponse.redirect(new URL(`/operator/homes/${home.id}`, req.url));
  } catch (e) {
    console.error('Quick update home failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: { address: true, photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!op || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: home });
  } catch (e) {
    console.error('Get home failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
