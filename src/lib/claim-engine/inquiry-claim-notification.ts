/**
 * Inquiry → Claim "pull" engine (OL-083) — sibling of the OL-079 claim email.
 *
 * When a family/caregiver inquires on an UNCLAIMED (directory-owned) listing, the
 * inquiry is ALWAYS captured (the `Inquiry` row) regardless of this function —
 * leads are never lost and surface on the operator dashboard the moment the home
 * is claimed (inquiries are keyed by `homeId`, which reassigns on claim).
 *
 * This is the BEST-EFFORT notify layer on top of that capture. As of the
 * per-facility claim DRIP, it simply DELEGATES to `startClaimDripOnLead`: the
 * first lead starts an email-only drip (touch 1) and the claim-drip cron advances
 * touches 2-4; later leads just grow the public waiting count. EMAIL ONLY — no SMS
 * in the cold pre-claim path (TCPA / A2P caution). When no outreach email is known
 * this no-ops and the public waiting-leads counter is the organic claim driver.
 *
 * HIPAA: copy is GENERIC only — facility name + "a family is trying to reach you"
 * — never inquiry/health details. Non-blocking; never throws.
 */

import { startClaimDripOnLead } from './claim-drip';

/** Sentinel operator that owns unclaimed/directory listings (see seed scripts). */
export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

/** Don't nudge the same listing more than once per this window. */
export const NUDGE_THROTTLE_HOURS = 24;

/**
 * A listing is "unclaimed" when it is still owned by the directory sentinel
 * operator. (A DRAFT home owned by a real operator is NOT unclaimed.)
 */
export function isUnclaimedHome(operatorUserEmail: string | null | undefined): boolean {
  return (operatorUserEmail ?? '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
}

/**
 * Best-effort: nudge the operator of an unclaimed listing to claim, off the back
 * of a real inquiry. Safe to call on ANY inquiry — it self-filters to unclaimed
 * homes with a known outreach email.
 */
export async function notifyUnclaimedHomeInquiry(params: {
  homeId: string;
  inquiryId: string;
  /** What triggered the nudge. A tour is the hottest lead → more urgent copy. */
  trigger?: 'inquiry' | 'tour';
}): Promise<void> {
  // The per-facility claim DRIP owns all cold pre-claim outreach (email-only — no
  // SMS, per TCPA/A2P caution). On the FIRST lead it starts the drip (touch 1);
  // subsequent leads are no-ops here — the public waiting count grows and the
  // claim-drip cron advances touches 2-4. startClaimDripOnLead self-filters to
  // unclaimed homes with a bound outreach email and never throws.
  await startClaimDripOnLead({ homeId: params.homeId, trigger: params.trigger ?? 'inquiry' });
}
