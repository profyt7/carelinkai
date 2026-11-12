/**
 * P0-6 (security decision package, Nov 2026): /api/dashboard/* scopes for EVERY role.
 * Before this, only OPERATOR was scoped; every other role (FAMILY, CAREGIVER, PROVIDER, DISCHARGE_PLANNER, …) got
 * the empty filter `{}` = the platform-wide view, incl. resident and family names in /activity. The family and
 * caregiver dashboards call /metrics and /alerts, so those roles get a real scope instead of a 403:
 *   ADMIN / STAFF → everything · OPERATOR → their homes · CAREGIVER → homes where employed (+ their own certs)
 *   FAMILY → their own residents and their family's inquiries · anyone else → nothing.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/auth-utils';
import { REAL_INQUIRIES } from '@/lib/inquiries/test-inquiry';
import { roleNeedsTwoFactorForPhi, twoFactorEnforced } from '@/lib/auth/two-factor-routes';
import { isEnrolled } from '@/lib/two-factor/secure';

/** Matches no row (every scoped model has an `id`). */
export const NONE = { id: { in: [] as string[] } };

export type DashboardScope = {
  resident: any;
  inquiry: any;
  incident: any;
  assess: any;
  home: any;
  cert: any;
  caregiver: any;
};

/** Dashboards never count or list test inquiries (isTest), for any role. */
export async function dashboardScope(user: { id: string; role: string }): Promise<DashboardScope | NextResponse> {
  const s = await baseScope(user);
  if (s instanceof NextResponse) return s;
  const scoped = { ...s, inquiry: { ...s.inquiry, ...REAL_INQUIRIES } };
  // PHI step-up: an OPERATOR / DISCHARGE_PLANNER without 2FA still gets the dashboard (listings,
  // inquiries, tours, caregivers) but no resident, incident or assessment rows — counts read 0.
  if (await phiStepUpPending(user)) return { ...scoped, resident: NONE, incident: NONE, assess: NONE };
  return scoped;
}

async function phiStepUpPending(user: { id: string; role: string }): Promise<boolean> {
  // A DISCHARGE_PLANNER's dashboard scope is already NONE; only OPERATOR needs the lookup.
  if (!twoFactorEnforced() || user.role !== 'OPERATOR' || !roleNeedsTwoFactorForPhi(user.role)) return false;
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, twoFactorSecret: true } });
  return !u || !isEnrolled(u);
}

async function baseScope(user: { id: string; role: string }): Promise<DashboardScope | NextResponse> {
  if (user.role === 'ADMIN' || user.role === 'STAFF') {
    return { resident: {}, inquiry: {}, incident: {}, assess: {}, home: {}, cert: {}, caregiver: { employmentStatus: 'ACTIVE' } };
  }
  if (user.role === 'OPERATOR') {
    const operator = await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!operator) return NextResponse.json({ error: 'Operator record not found' }, { status: 404 });
    const operatorId = operator.id;
    return {
      resident: { home: { operatorId } },
      inquiry: { home: { operatorId } },
      incident: { resident: { home: { operatorId } } },
      assess: { resident: { home: { operatorId } } },
      home: { operatorId },
      cert: { caregiver: { employments: { some: { operatorId } } } },
      caregiver: { employmentStatus: 'ACTIVE', employments: { some: { operatorId } } },
    };
  }
  const scope: any = await getUserScope(user.id);
  if (user.role === 'CAREGIVER' && scope.caregiverId) {
    const homeIds: string[] = Array.isArray(scope.homeIds) ? scope.homeIds : [];
    return {
      resident: { homeId: { in: homeIds } },
      inquiry: { homeId: { in: homeIds } },
      incident: { resident: { homeId: { in: homeIds } } },
      assess: { resident: { homeId: { in: homeIds } } },
      home: { id: { in: homeIds } },
      cert: { caregiverId: scope.caregiverId },
      caregiver: { id: scope.caregiverId },
    };
  }
  if (user.role === 'FAMILY') {
    const residentIds: string[] = Array.isArray(scope.residentIds) ? scope.residentIds : [];
    return {
      resident: { id: { in: residentIds } },
      inquiry: scope.familyId ? { familyId: scope.familyId } : NONE,
      incident: { residentId: { in: residentIds } },
      assess: { residentId: { in: residentIds } },
      home: { residents: { some: { id: { in: residentIds } } } },
      cert: NONE,
      caregiver: NONE,
    };
  }
  return { resident: NONE, inquiry: NONE, incident: NONE, assess: NONE, home: NONE, cert: NONE, caregiver: NONE };
}
