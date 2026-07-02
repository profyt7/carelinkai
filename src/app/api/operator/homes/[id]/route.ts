
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { captureError } from '@/lib/sentry';

const prisma = new PrismaClient();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  currentOccupancy: z.number().int().min(0).optional(),
  careLevel: z.array(z.string()).optional(),
  genderRestriction: z.string().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  // OL-111: OPTIONAL operator "starting at $/mo" — never required to claim/save.
  startingPriceMonthly: z.number().int().min(0).nullable().optional(),
  status: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    street2: z.string().nullable().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
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
    const { address, ...homeFields } = parsed.data;
    const data: any = { ...homeFields };

    if (address) {
      data.address = {
        upsert: {
          create: {
            street: address.street ?? '',
            street2: address.street2 ?? null,
            city: address.city ?? '',
            state: address.state ?? '',
            zipCode: address.zipCode ?? '',
          },
          update: {
            ...(address.street !== undefined && { street: address.street }),
            ...(address.street2 !== undefined && { street2: address.street2 }),
            ...(address.city !== undefined && { city: address.city }),
            ...(address.state !== undefined && { state: address.state }),
            ...(address.zipCode !== undefined && { zipCode: address.zipCode }),
          },
        },
      };
    }

    // When the operator confirms price/amenities, clear the VA "pending" flag for
    // that field so the approximate badge drops and their values become authoritative.
    const prevPff = (home.preFilledFields && typeof home.preFilledFields === 'object' ? home.preFilledFields : {}) as Record<string, unknown>;
    const pff = { ...prevPff };
    let pffChanged = false;
    if ((data.priceMin !== undefined || data.priceMax !== undefined) && pff.priceRange === 'VA_UNVERIFIED') { delete pff.priceRange; pffChanged = true; }
    if (data.amenities !== undefined && pff.amenities === 'VA_UNVERIFIED') { delete pff.amenities; pffChanged = true; }
    if (pffChanged) data.preFilledFields = pff;

    // OL-111: an operator-provided starting price is authoritative + earns the
    // Transparent Pricing badge — stamp source + timestamp when it's set/cleared.
    if (parsed.data.startingPriceMonthly !== undefined) {
      data.priceSource = 'OPERATOR';
      data.priceUpdatedAt = new Date();
    }

    const updated = await prisma.assistedLivingHome.update({ where: { id: home.id }, data });
    return NextResponse.json({ id: updated.id });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:homes:{id}' },
    });
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
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:homes:{id}' },
    });
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
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:homes:{id}' },
    });
    console.error('Get home failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
