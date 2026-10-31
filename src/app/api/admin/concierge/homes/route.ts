export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { searchPublicHomes } from '@/lib/concierge/manual-shortlist';

/**
 * GET /api/admin/concierge/homes?q= — admin "Add a home" search for the concierge curate panel
 * (fix/concierge-manual-shortlist): public homes by name, city or ZIP, top 10.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const q = request.nextUrl.searchParams.get('q') ?? '';
  return NextResponse.json({ homes: await searchPublicHomes(q) });
}
