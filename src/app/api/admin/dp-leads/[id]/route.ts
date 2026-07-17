/**
 * PATCH /api/admin/dp-leads/[id] — admin actions on a DP lead (feat/dp-lead-capture).
 *
 * Body: { action: 'replied' | 'patient_sent' | 'booked' | 'stop' | 'reactivate' }.
 * Any status that isn't 'active' halts the follow-up sequence (the cron only
 * touches 'active' leads), so "Mark replied" is the stop button from the flow doc.
 * 'reactivate' resumes the sequence at the next due touch. ADMIN only.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import { DP_FOLLOWUP_OFFSETS_DAYS, MAX_DP_TOUCHES } from '@/lib/dp-outreach/copy';

const DAY_MS = 86_400_000;

const schema = z.object({
  action: z.enum(['replied', 'patient_sent', 'booked', 'stop', 'reactivate']),
});

// action → { status, stoppedReason }
const STOP_MAP: Record<string, { status: string; reason: string }> = {
  replied: { status: 'replied', reason: 'replied' },
  patient_sent: { status: 'patient_sent', reason: 'patient_sent' },
  booked: { status: 'booked', reason: 'booked' },
  stop: { status: 'stopped', reason: 'manual' },
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const lead = await prisma.dPLead.findUnique({
      where: { id: params.id },
      select: { id: true, createdAt: true, touchStep: true },
    });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (parsed.data.action === 'reactivate') {
      // Resume: schedule the next unsent touch (or clear if already exhausted).
      const nextTouch = (lead.touchStep ?? 0) + 1;
      const nextTouchAt =
        nextTouch <= MAX_DP_TOUCHES
          ? new Date(lead.createdAt.getTime() + DP_FOLLOWUP_OFFSETS_DAYS[nextTouch - 1] * DAY_MS)
          : null;
      const updated = await prisma.dPLead.update({
        where: { id: lead.id },
        data: { status: 'active', stoppedReason: null, nextTouchAt },
        select: { id: true, status: true, stoppedReason: true, nextTouchAt: true },
      });
      return NextResponse.json({ ok: true, lead: updated });
    }

    const map = STOP_MAP[parsed.data.action];
    const updated = await prisma.dPLead.update({
      where: { id: lead.id },
      data: { status: map.status, stoppedReason: map.reason, nextTouchAt: null },
      select: { id: true, status: true, stoppedReason: true, nextTouchAt: true },
    });
    return NextResponse.json({ ok: true, lead: updated });
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.name === 'UnauthorizedError') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/dp-leads] patch error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/dp-leads/[id] — permanently remove a single DP lead.
 * Admin-only, one row by id (so cleanup can't over-delete). Idempotent-ish:
 * a missing id returns 404. DPLead has NO PHI and no FKs, so a hard delete is safe.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
    const lead = await prisma.dPLead.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.dPLead.delete({ where: { id: lead.id } });
    return NextResponse.json({ ok: true, deleted: lead.id });
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.name === 'UnauthorizedError') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/dp-leads] delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
