
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const BodySchema = z.object({
  eventType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const parsed = QuerySchema.safeParse({ limit: req.nextUrl.searchParams.get('limit') ?? undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    const { limit } = parsed.data;
    const items = await prisma.careTimelineEvent.findMany({
      where: { residentId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, eventType: true, title: true, description: true, scheduledAt: true, completedAt: true, createdAt: true },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Timeline list error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
    }
    const { eventType, title, description, scheduledAt, completedAt } = parsed.data;
    const created = await prisma.careTimelineEvent.create({
      data: {
        residentId: params.id,
        eventType,
        title,
        description: description ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      select: { id: true },
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'CareTimelineEvent', created.id, 'Created care timeline event', { residentId: params.id, eventType });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Timeline create error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // noop
  }
}
