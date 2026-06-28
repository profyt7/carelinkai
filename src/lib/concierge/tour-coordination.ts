/**
 * Concierge tour coordination — shared between the dedicated DP action
 * (POST /api/discharge-planner/concierge/[id]/tour) and the concierge-aware
 * generic inquiry path (POST /api/inquiries with conciergeSearchId).
 *
 * The promise: a tour/inquiry from a concierge shortlist NEVER silently
 * black-holes. It always reaches the CareLinkAI concierge admin (Chris) to
 * coordinate, and for an unclaimed home it also fires the claim-conversion
 * signal (operator nudge + Anita's call-list via the claim drip).
 *
 * Tour status is tracked on the matching entry in PlacementSearch.curatedHomes
 * (JSON) — no schema change — so the DP sees it on their Concierge tab.
 */

import { prisma } from '@/lib/prisma';
import { sendConciergeTourNotification } from '@/lib/email';

export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

export type CuratedHome = {
  homeId: string;
  name?: string;
  address?: string;
  note?: string;
  confirmedAvailability?: string;
  tourStatus?: 'REQUESTED';
  tourRequestedAt?: string;
};

/**
 * Stamp tourStatus='REQUESTED' on the curated home entry for a concierge search.
 * Returns:
 *  - 'marked'         the entry was newly marked (caller should notify),
 *  - 'already'        the entry was already requested (caller should NOT re-notify),
 *  - 'not_found'      no such concierge search/home (caller should do nothing).
 * Never throws.
 */
export async function markConciergeTourRequested(
  searchId: string,
  homeId: string,
  nowIso: string,
): Promise<'marked' | 'already' | 'not_found'> {
  try {
    const search = await prisma.placementSearch.findUnique({
      where: { id: searchId },
      select: { id: true, isConcierge: true, curatedHomes: true },
    });
    if (!search || !search.isConcierge || !Array.isArray(search.curatedHomes)) return 'not_found';

    const homes = search.curatedHomes as unknown as CuratedHome[];
    const idx = homes.findIndex((h) => h?.homeId === homeId);
    if (idx < 0) return 'not_found';
    if (homes[idx].tourStatus === 'REQUESTED') return 'already';

    const next = homes.map((h, i) =>
      i === idx ? { ...h, tourStatus: 'REQUESTED' as const, tourRequestedAt: nowIso } : h,
    );
    await prisma.placementSearch.update({
      where: { id: searchId },
      data: { curatedHomes: next as any },
    });
    return 'marked';
  } catch {
    return 'not_found';
  }
}

/** True if the home is an unclaimed/directory listing (owned by the sentinel operator). */
export function homeIsUnclaimed(operatorUserEmail: string | null | undefined): boolean {
  return (operatorUserEmail ?? '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
}

/**
 * Concierge-aware generic inquiry (Option 3): when an inquiry submitted from the
 * /homes/[id] page carries ?concierge=<searchId> (the DP came from their
 * shortlist), loop in the care team + mark the shortlist so the DP sees a status.
 * The /api/inquiries route already handled the operator email (claimed) and claim
 * drip (unclaimed), so this only ADDS the admin notify + status. Validated against
 * the requester so the param can't be spoofed to spam the admin. Never throws.
 */
export async function coordinateConciergeInquiry(params: {
  searchId: string;
  homeId: string;
  requesterUserId: string;
  facilityName: string;
  claimed: boolean;
}): Promise<void> {
  try {
    const search = await prisma.placementSearch.findUnique({
      where: { id: params.searchId },
      select: {
        id: true, userId: true, isConcierge: true,
        user: { select: { firstName: true, lastName: true, dischargePlannerProfile: { select: { organization: true } } } },
      },
    });
    if (!search || !search.isConcierge) return;
    if (search.userId !== params.requesterUserId) return; // not the DP's own search → ignore (anti-spoof)

    const mark = await markConciergeTourRequested(params.searchId, params.homeId, new Date().toISOString());
    if (mark !== 'marked') return; // already requested / not on this shortlist → no duplicate notify

    const dpName = [search.user?.firstName, search.user?.lastName].filter(Boolean).join(' ') || undefined;
    void sendConciergeTourNotification({
      requestId: params.searchId,
      facilityName: params.facilityName,
      claimed: params.claimed,
      dpName,
      dpOrganization: search.user?.dischargePlannerProfile?.organization || undefined,
    });
  } catch {
    /* never throws */
  }
}
