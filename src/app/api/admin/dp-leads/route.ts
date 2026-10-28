/**
 * GET /api/admin/dp-leads — admin list of DP leads (feat/dp-lead-capture).
 * Optional ?status=active|replied|booked|patient_sent|stopped filter (default: all).
 * ADMIN only. Read-only; mutations live at /api/admin/dp-leads/[id].
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

const VALID_STATUS = ['active', 'replied', 'booked', 'patient_sent', 'stopped'];

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
    const status = new URL(request.url).searchParams.get('status');
    const where = status && VALID_STATUS.includes(status) ? { status } : {};

    const rows = await prisma.dPLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        name: true,
        email: true,
        hospital: true,
        department: true,
        interestLevel: true,
        consent: true,
        notes: true,
        status: true,
        stoppedReason: true,
        touchStep: true,
        createdAt: true,
        lastTouchAt: true,
        nextTouchAt: true,
      },
    });

    return NextResponse.json({ leads: rows });
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized', leads: [] }, { status: 401 });
    if (error?.name === 'UnauthorizedError') return NextResponse.json({ error: 'Forbidden', leads: [] }, { status: 403 });
    console.error('[admin/dp-leads] list error:', error);
    return NextResponse.json({ error: 'Failed to load', leads: [] }, { status: 500 });
  }
}
