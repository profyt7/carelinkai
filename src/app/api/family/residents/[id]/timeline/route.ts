export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { checkFamilyMembership } from '@/lib/services/family';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  windowDays: z.coerce.number().int().min(1).max(90).default(30),
});

/**
 * GET /api/family/residents/[id]/timeline
 * Aggregated, family-safe activity timeline for a resident.
 * Includes upcoming appointments, recent family notes, and recent family documents.
 * Excludes clinical PHI and file URLs.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAnyRole([]);
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      windowDays: searchParams.get('windowDays') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.format() }, { status: 400 });
    }
    const { limit, windowDays } = parsed.data;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, familyId: true },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isMember = await checkFamilyMembership(userId, resident.familyId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const pastWindow = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const futureWindow = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    // Fetch items in parallel
    const [appointments, notes, documents] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          residentId: resident.id,
          startTime: { gte: pastWindow, lte: futureWindow },
        },
        select: { id: true, title: true, type: true, status: true, startTime: true, endTime: true },
        orderBy: { startTime: 'desc' },
        take: limit,
      }),
      prisma.familyNote.findMany({
        where: { familyId: resident.familyId, residentId: resident.id },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.familyDocument.findMany({
        where: { familyId: resident.familyId, residentId: resident.id },
        select: { id: true, title: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    // Normalize and merge
    type Item = {
      kind: 'appointment' | 'note' | 'document';
      id: string;
      title: string;
      createdAt: Date;
      meta?: Record<string, any>;
    };

    const items: Item[] = [
      ...appointments.map(a => ({
        kind: 'appointment' as const,
        id: a.id,
        title: a.title,
        createdAt: a.startTime,
        meta: { type: a.type, status: a.status, endTime: a.endTime },
      })),
      ...notes.map(n => ({
        kind: 'note' as const,
        id: n.id,
        title: n.title,
        createdAt: n.createdAt,
      })),
      ...documents.map(d => ({
        kind: 'document' as const,
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        meta: { type: d.type }, // No fileUrl exposed
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Audit: log safe READ access
    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'ResidentTimeline',
      resident.id,
      'Viewed family-safe resident timeline',
      { familyAccess: true, scope: 'family_timeline', windowDays, resultCount: items.length }
    );

    return NextResponse.json({ items });
  } catch (e) {
    console.error('Family resident timeline error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
