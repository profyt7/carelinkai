/**
 * GET /api/admin/claim-resend[?format=csv] — targeted claim RE-SEND list
 * (sprint W4 0b). Admin only: anything else (anonymous included) → 403.
 * Read-only; nothing is sent. Contact emails appear here only.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import { buildClaimResendList, resendListToCsv } from '@/lib/claim-engine/resend-list';
import { captureError } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  if (!secret) return NextResponse.json({ error: 'NEXTAUTH_SECRET not configured' }, { status: 500 });
  try {
    const list = await buildClaimResendList(secret);
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      return new NextResponse(resendListToCsv(list), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="claim-resend-${list.generatedAt.slice(0, 10)}.csv"`,
          'cache-control': 'no-store',
        },
      });
    }
    return NextResponse.json(list, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'claim-resend' } });
    return NextResponse.json({ error: 'Failed to build the list' }, { status: 500 });
  }
}
