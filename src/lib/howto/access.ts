/**
 * Role-gating for the How-To Guides section of the Education Hub.
 *
 * Everyone (including signed-out visitors) sees "Getting Started" and
 * "Family" guides. Each role additionally sees the guides for their role.
 * Admin/Staff see everything (for support). Affiliate content is deferred and
 * never exposed here; affiliates see only the shared + family guides.
 */

import type { HowToAudience, HowToGuide } from '@/app/learn/howto/content';

/** App UserRole values (kept as a string union to avoid importing Prisma here). */
export type ViewerRole =
  | 'FAMILY'
  | 'OPERATOR'
  | 'CAREGIVER'
  | 'ADMIN'
  | 'AFFILIATE'
  | 'STAFF'
  | 'PROVIDER'
  | 'DISCHARGE_PLANNER'
  | null
  | undefined;

const ALWAYS_VISIBLE: HowToAudience[] = ['getting-started', 'family'];

const ROLE_AUDIENCE: Record<string, HowToAudience[]> = {
  FAMILY: [],
  OPERATOR: ['operator'],
  CAREGIVER: ['caregiver'],
  PROVIDER: ['provider'],
  DISCHARGE_PLANNER: ['discharge-planner'],
  // Affiliate content is deferred — affiliates see only shared + family.
  AFFILIATE: [],
  // Admin/Staff can see all role guides for support purposes.
  ADMIN: ['operator', 'caregiver', 'provider', 'discharge-planner'],
  STAFF: ['operator', 'caregiver', 'provider', 'discharge-planner'],
};

/** The set of audiences a viewer is allowed to see. */
export function visibleAudiences(role: ViewerRole): Set<HowToAudience> {
  const extra = role ? ROLE_AUDIENCE[role] ?? [] : [];
  return new Set<HowToAudience>([...ALWAYS_VISIBLE, ...extra]);
}

/** True if the viewer may see the given guide. */
export function canViewGuide(guide: HowToGuide, role: ViewerRole): boolean {
  const allowed = visibleAudiences(role);
  return guide.audiences.some((a) => allowed.has(a));
}

/** Filters a list of guides down to what the viewer may see. */
export function filterGuidesForRole<T extends HowToGuide>(guides: T[], role: ViewerRole): T[] {
  return guides.filter((g) => canViewGuide(g, role));
}
