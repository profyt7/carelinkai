/**
 * OL-258: only real, local caregivers in the caregiver-hire marketplace.
 *
 * Production holds seeded and test caregiver profiles (Bay Area seeds, older seeds with no address, e2e/test
 * accounts) that must never reach a family. A caregiver is shown only when ALL of these hold:
 *   1. Caregiver.isVisibleInMarketplace = true;
 *   2. User.isDemo = false;
 *   3. the account email is not a demo/seed/test address (DEMO_CAREGIVER_EMAIL_SUFFIXES, which covers the
 *      DEMO_EMAIL_RE conventions plus the older @carelink.demo seeds and example domains);
 *   4. the user has an address in Ohio with a non-empty city (no address, or any other state, is hidden).
 *
 * Nothing is deleted; this is a query-time filter. scripts/hide-demo-caregivers.ts can additionally set
 * isVisibleInMarketplace=false on the same rows (dry-run first) so non-marketplace caregiver queries match.
 *
 * Background checks: a "clear" check is shown only when a provider (Checkr) order exists with status CLEAR,
 * a completion date and a provider report id. The Caregiver.backgroundCheckStatus column alone (seeded CLEAR
 * values included) is never displayed.
 */
import type { Prisma } from '@prisma/client';

/** Seed, demo and test account email endings (case-insensitive). */
export const DEMO_CAREGIVER_EMAIL_SUFFIXES = [
  '@carelinkai.test',
  '@test.carelinkai.com',
  '+seed@carelinkai.com',
  '@carelink.demo',
  '@example.com',
  '@example.org',
  '@example.test',
] as const;

/** Ohio as stored in Address.state. */
export const OHIO_STATE_VALUES = ['OH', 'Ohio'] as const;

/** Prisma filter: the caregiver is a real, local, marketplace-visible profile. AND it with any other filters. */
export function realCaregiverWhere(): Prisma.CaregiverWhereInput {
  return {
    isVisibleInMarketplace: true,
    user: {
      isDemo: false,
      NOT: DEMO_CAREGIVER_EMAIL_SUFFIXES.map((suffix) => ({ email: { endsWith: suffix, mode: 'insensitive' as const } })),
      addresses: {
        some: {
          OR: OHIO_STATE_VALUES.map((s) => ({ state: { equals: s, mode: 'insensitive' as const } })),
          NOT: { city: '' },
        },
      },
    },
  };
}

type AddressLike = { city?: string | null; state?: string | null };
export type CaregiverIdentity = {
  isVisibleInMarketplace: boolean;
  user: { isDemo: boolean; email: string | null; addresses: AddressLike[] };
};

/** The same rule as realCaregiverWhere(), as a pure function (scripts and tests). Returns the failing reasons. */
export function demoCaregiverReasons(c: CaregiverIdentity): string[] {
  const reasons: string[] = [];
  if (!c.isVisibleInMarketplace) reasons.push('hidden');
  if (c.user.isDemo) reasons.push('isDemo');
  const email = (c.user.email ?? '').toLowerCase();
  if (DEMO_CAREGIVER_EMAIL_SUFFIXES.some((s) => email.endsWith(s))) reasons.push('demo email');
  const ohio = c.user.addresses.some(
    (a) => OHIO_STATE_VALUES.some((s) => (a.state ?? '').trim().toLowerCase() === s.toLowerCase()) && (a.city ?? '').trim() !== '',
  );
  if (!ohio) reasons.push(c.user.addresses.length === 0 ? 'no address' : 'not in Ohio');
  return reasons;
}

export function isRealMarketplaceCaregiver(c: CaregiverIdentity): boolean {
  return demoCaregiverReasons(c).length === 0;
}

/** Include this on caregiver queries: the latest provider background-check order. */
export const LATEST_BACKGROUND_CHECK_ORDER = {
  orderBy: { createdAt: 'desc' as const },
  take: 1,
  select: { status: true, completedAt: true, checkrReportId: true },
};

type OrderLike = { status: string; completedAt: Date | string | null; checkrReportId: string | null };

/**
 * The background-check status a family may see, from provider orders only.
 *   - no provider order → NOT_STARTED (a seeded CLEAR/PENDING column value is ignored);
 *   - CLEAR needs a completion date and a provider report id, otherwise it reads PENDING;
 *   - any other order status is shown as is.
 */
export function displayBackgroundCheckStatus(orders: OrderLike[] | null | undefined): string {
  const latest = orders?.[0];
  if (!latest || !latest.checkrReportId) return 'NOT_STARTED';
  if (latest.status === 'CLEAR') return latest.completedAt ? 'CLEAR' : 'PENDING';
  return latest.status;
}
