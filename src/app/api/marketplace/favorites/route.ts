import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { z } from 'zod';
import { rateLimitAsync, getClientIp } from '@/lib/rateLimit';

// GET: list caregiver's favorite listings (IDs + basic listing data)
export async function GET(request: Request) {
  try {
    // Rate limit: 60 requests/min per user or IP
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const rr = await rateLimitAsync({ name: 'favorites:GET', key, limit: 60, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } });
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const caregiver = await (prisma as any).caregiver.findUnique({ where: { userId: session.user.id } });
    if (!caregiver) {
      // Not a caregiver – return empty list (no error)
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const favs = await (prisma as any).favoriteListing.findMany({
      where: { caregiverId: caregiver.id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            description: true,
            city: true,
            state: true,
            status: true,
            hourlyRateMin: true,
            hourlyRateMax: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = favs.map((f: any) => ({
      id: f.id,
      listingId: f.listingId,
      createdAt: f.createdAt,
      listing: f.listing,
    }));
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/marketplace/favorites failed', err);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST: add favorite { listingId }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const rr = await rateLimitAsync({ name: 'favorites:POST', key, limit: 30, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } });
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const Schema = z.object({ listingId: z.string().min(1) });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      if (flat.fieldErrors?.listingId) {
        return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request', details: flat }, { status: 400 });
    }
    const { listingId } = parsed.data;

    const caregiver = await (prisma as any).caregiver.findUnique({ where: { userId: session.user.id } });
    if (!caregiver) {
      return NextResponse.json({ error: 'Only caregivers can favorite listings' }, { status: 403 });
    }

    // Ensure listing exists
    const listing = await (prisma as any).marketplaceListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Upsert-like behavior: unique on (caregiverId, listingId)
    const existing = await (prisma as any).favoriteListing.findUnique({
      where: { caregiverId_listingId: { caregiverId: caregiver.id, listingId } },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ data: { id: existing.id, listingId } }, { status: 200 });
    }

    const created = await (prisma as any).favoriteListing.create({
      data: { caregiverId: caregiver.id, listingId }
    });
    return NextResponse.json({ data: { id: created.id, listingId } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/marketplace/favorites failed', err);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE: /api/marketplace/favorites?listingId=xxx
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const rr = await rateLimitAsync({ name: 'favorites:DELETE', key, limit: 30, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } });
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const Schema = z.object({ listingId: z.string().min(1) });
    const parsed = Schema.safeParse({ listingId });
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      if (flat.fieldErrors?.listingId) {
        return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request', details: flat }, { status: 400 });
    }

    const caregiver = await (prisma as any).caregiver.findUnique({ where: { userId: session.user.id } });
    if (!caregiver) {
      return NextResponse.json({ error: 'Only caregivers can remove favorites' }, { status: 403 });
    }

    const existing = await (prisma as any).favoriteListing.findUnique({
      where: { caregiverId_listingId: { caregiverId: caregiver.id, listingId } },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    await (prisma as any).favoriteListing.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/marketplace/favorites failed', err);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}

export function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}

export function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}