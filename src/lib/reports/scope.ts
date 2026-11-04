/**
 * P0-6 (security decision package, Nov 2026): reports are generated only over homes the caller may see.
 * generateReport() treats an empty homeIds list as "all homes", and the routes passed the caller's list through
 * unvalidated — so any role with reports/analytics permission (OPERATOR, STAFF, AFFILIATE, PROVIDER,
 * DISCHARGE_PLANNER) could export platform-wide resident and incident reports.
 *   ADMIN / STAFF → as requested (empty = all homes)
 *   OPERATOR      → requested ⊆ own homes (403 otherwise); empty → all own homes (never "all homes")
 *   anyone else   → 403
 */
import { NextResponse } from 'next/server';
import { getUserScope } from '@/lib/auth-utils';

export async function resolveReportHomeIds(userId: string, requested: unknown): Promise<{ homeIds: string[] } | NextResponse> {
  const req = Array.isArray(requested) ? requested.filter((h): h is string => typeof h === 'string' && h.length > 0) : [];
  const scope: any = await getUserScope(userId);
  if (scope.homeIds === 'ALL') return { homeIds: req };
  if (scope.role === 'OPERATOR' && Array.isArray(scope.homeIds) && scope.homeIds.length > 0) {
    if (req.some((h) => !scope.homeIds.includes(h))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return { homeIds: req.length ? req : [...scope.homeIds] };
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
