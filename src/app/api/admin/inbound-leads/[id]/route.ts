/**
 * PATCH /api/admin/inbound-leads/[id] — status actions on an inbound lead
 * (OL-167c). Admin only.
 *
 *   { action: 'contacted' }  NEW → CONTACTED, sets contactedAt
 *   { action: 'close' }      NEW | CONTACTED → CLOSED, sets closedAt
 *
 * 404 unknown id · 409 when the action does not apply to the current status.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { captureError } from '@/lib/sentry';
import { LEAD_ACTIONS, applyLeadAction } from '@/lib/leads/inbound-lead-admin';

const schema = z.object({ action: z.enum(LEAD_ACTIONS) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'action must be contacted|close' }, { status: 400 });
  try {
    const result = await applyLeadAction(params.id, parsed.data.action);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'not_found' ? 404 : 409 });
    return NextResponse.json({ ok: true, lead: result.lead }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'admin/inbound-leads PATCH' } });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
