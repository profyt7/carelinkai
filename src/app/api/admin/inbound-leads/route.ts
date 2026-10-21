/**
 * GET /api/admin/inbound-leads — callback queue from the published phone
 * number (OL-167c). Admin only; anything else → 403.
 *
 *   ?status=open|new|contacted|closed|all   (default open = NEW + CONTACTED)
 *   ?callerType=planner|family|facility|other|all
 *   ?limit=
 *   → { rows, counts, generatedAt }
 *
 * Mutations live at /api/admin/inbound-leads/[id] (PATCH).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { captureError } from '@/lib/sentry';
import { listInboundLeads, parseCallerTypeFilter, parseStatusFilter } from '@/lib/leads/inbound-lead-admin';

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const sp = request.nextUrl.searchParams;
  const status = parseStatusFilter(sp.get('status'));
  const callerType = parseCallerTypeFilter(sp.get('callerType'));
  if (!status) return NextResponse.json({ error: 'status must be open|new|contacted|closed|all' }, { status: 400 });
  if (!callerType) return NextResponse.json({ error: 'callerType must be planner|family|facility|other|all' }, { status: 400 });
  const limit = Number.parseInt(sp.get('limit') ?? '200', 10);
  try {
    const { rows, counts } = await listInboundLeads({ status, callerType, limit: Number.isFinite(limit) ? limit : 200 });
    return NextResponse.json({ rows, counts, generatedAt: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'admin/inbound-leads GET' } });
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
