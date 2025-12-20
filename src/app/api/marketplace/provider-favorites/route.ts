
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { z } from 'zod';
import { rateLimitAsync, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimit';

// Families can favorite providers (shortlists)

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const limit = 60;
    const rr = await rateLimitAsync({ name: 'provider-favs:GET', key, limit, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
      );
    }
    if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const family = await (prisma as any).family.findUnique({ where: { userId: session.user.id } });
    if (!family) return NextResponse.json({ data: [] }, { status: 200 });

    const favs = await (prisma as any).favoriteProvider.findMany({
      where: { familyId: family.id },
      select: { providerId: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(
      { data: favs.map((f: any) => f.providerId) },
      { status: 200, headers: buildRateLimitHeaders(rr, limit) }
    );
  } catch (err) {
    console.error('GET /api/marketplace/provider-favorites failed', err);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const limit = 30;
    const rr = await rateLimitAsync({ name: 'provider-favs:POST', key, limit, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
      );
    }
    if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const Schema = z.object({ providerId: z.string().min(1) });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }
    const { providerId } = parsed.data;

    const family = await (prisma as any).family.findUnique({ where: { userId: session.user.id } });
    if (!family) return NextResponse.json({ error: 'Only families can favorite providers' }, { status: 403 });

    // Ensure provider exists
    const provider = await (prisma as any).provider.findUnique({ where: { id: providerId } });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const existing = await (prisma as any).favoriteProvider.findUnique({
      where: { familyId_providerId: { familyId: family.id, providerId } },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ data: { id: existing.id, providerId } }, { status: 200, headers: buildRateLimitHeaders(rr, limit) });
    }

    const created = await (prisma as any).favoriteProvider.create({ data: { familyId: family.id, providerId } });
    return NextResponse.json({ data: { id: created.id, providerId } }, { status: 201, headers: buildRateLimitHeaders(rr, limit) });
  } catch (err) {
    console.error('POST /api/marketplace/provider-favorites failed', err);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const key = session?.user?.id || getClientIp(request);
    const limit = 30;
    const rr = await rateLimitAsync({ name: 'provider-favs:DELETE', key, limit, windowMs: 60_000 });
    if (!rr.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...buildRateLimitHeaders(rr, limit), 'Retry-After': String(Math.ceil(rr.resetMs / 1000)) } }
      );
    }
    if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const Schema = z.object({ providerId: z.string().min(1) });
    const parsed = Schema.safeParse({ providerId });
    if (!parsed.success) return NextResponse.json({ error: 'providerId is required' }, { status: 400 });

    const family = await (prisma as any).family.findUnique({ where: { userId: session.user.id } });
    if (!family) return NextResponse.json({ error: 'Only families can remove favorites' }, { status: 403 });

    const existing = await (prisma as any).favoriteProvider.findUnique({
      where: { familyId_providerId: { familyId: family.id, providerId: providerId! } },
      select: { id: true }
    });
    if (!existing) return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });

    await (prisma as any).favoriteProvider.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true }, { status: 200, headers: buildRateLimitHeaders(rr, limit) });
  } catch (err) {
    console.error('DELETE /api/marketplace/provider-favorites failed', err);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}

export function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}

export function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}
