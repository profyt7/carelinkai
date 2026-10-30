/**
 * Homepage "Now Live" / "Coming Soon" cards, derived from the same paid-feature flags the product
 * uses (src/lib/billing/paid-features.ts), so a card can't say something works while its flag is off.
 *
 * Truth rules (homepage truth audit, 10/30):
 *  - "Now Live" lists only what a real user can do today with production flags as they are.
 *  - Partial features say exactly what works (ride requests yes, online payment only with RIDES_PAYMENTS).
 *  - Nothing here promises outbound SMS: the Twilio A2P campaign is not approved, so text-message
 *    features stay in "Coming Soon" regardless of flags. Checkr is not live: no background-check badges
 *    unless BACKGROUND_CHECKS is on.
 *  - No prices for products whose flag is off. No dates.
 * Pure data; safe in client components.
 */

export type RoadmapFlags = {
  providerListingOn: boolean;
  ridesPaymentsOn: boolean;
  backgroundChecksOn: boolean;
  operatorPlansOn: boolean;
  complianceKitsOn: boolean;
};

export type RoadmapIcon = 'briefcase' | 'users' | 'award' | 'activity' | 'trending' | 'shield' | 'globe' | 'calendar' | 'zap' | 'chart' | 'wallet' | 'star' | 'layers' | 'refresh';

export type RoadmapItem = { key: string; icon: RoadmapIcon; title: string; desc: string };

export const ROADMAP_FLAGS_OFF: RoadmapFlags = {
  providerListingOn: false,
  ridesPaymentsOn: false,
  backgroundChecksOn: false,
  operatorPlansOn: false,
  complianceKitsOn: false,
};

export function nowLiveItems(f: RoadmapFlags): RoadmapItem[] {
  const items: RoadmapItem[] = [
    {
      key: 'caregiver-marketplace',
      icon: 'shield',
      title: 'Caregiver Marketplace',
      desc: f.backgroundChecksOn
        ? 'Browse, shortlist and hire caregivers, with reviews, reliability scores and background-check badges'
        : 'Browse, shortlist and hire caregivers, with reviews and reliability scores',
    },
    {
      key: 'direct-hire',
      icon: 'briefcase',
      title: 'Direct Caregiver Hire',
      desc: 'Operators hire caregivers they find in the marketplace; the caregiver gets an in-app notification',
    },
    {
      key: 'reliability',
      icon: 'users',
      title: 'Caregiver Reliability Score',
      desc: f.backgroundChecksOn
        ? '0–100 score from reviews, completed shifts, background check and call-off history'
        : '0–100 score from reviews, completed shifts and call-off history',
    },
    {
      key: 'points',
      icon: 'award',
      title: 'Caregiver Points & Tiers',
      desc: 'Bronze → Platinum tiers with points for reliability, reviews and consistency',
    },
    {
      key: 'dp-portal',
      icon: 'activity',
      title: 'Discharge Planner Portal',
      desc: 'Free placement search and multi-facility requests for hospital social workers and case managers; availability shows as verified with a date, or "contact to confirm"',
    },
    {
      key: 'provider-marketplace',
      icon: 'globe',
      title: 'Provider Marketplace',
      desc: f.providerListingOn
        ? 'Families and care homes find transportation, meal delivery, home health and other providers and send a request; providers list for free'
        : 'Families and care homes find transportation, meal delivery, home health and other providers and send a request',
    },
    {
      key: 'rides',
      icon: 'calendar',
      title: 'Transport Ride Requests',
      desc: f.ridesPaymentsOn
        ? 'Families and care homes request a ride, the provider confirms and sets the fare, and the ride is paid online; email reminder the day before'
        : 'Families and care homes request a ride and the provider confirms and sets the fare; email reminder the day before. Online payment is coming soon',
    },
    {
      key: 'affiliate',
      icon: 'trending',
      title: 'Referral Program',
      desc: 'Referral links and a dashboard that tracks the families you refer',
    },
  ];
  if (f.operatorPlansOn) {
    items.push({ key: 'autofill', icon: 'zap', title: 'AI Shift Auto-fill', desc: 'Describe an open shift in plain words and get matching available caregivers (Professional plan)' });
  }
  if (f.complianceKitsOn) {
    items.push({ key: 'kits', icon: 'chart', title: 'Compliance Document Kits', desc: 'Ohio assisted-living compliance document kits you can buy and download' });
  }
  return items;
}

export function comingSoonItems(f: RoadmapFlags): RoadmapItem[] {
  const items: RoadmapItem[] = [
    { key: 'payments', icon: 'wallet', title: 'Secure in-app payments', desc: 'Pay caregivers and providers inside CareLinkAI' },
    { key: 'family-pricing', icon: 'star', title: 'Family-reported pricing & reviews', desc: 'Real quotes families received, and reviews after move-in' },
    { key: 'categories', icon: 'layers', title: 'More provider categories', desc: 'Hospice, home safety, adult day and respite' },
    { key: 'checkins', icon: 'refresh', title: 'Weekly availability check-ins', desc: 'Communities and providers confirm openings with us every week' },
    { key: 'sms-coverage', icon: 'zap', title: 'Text-message shift coverage', desc: 'When a caregiver calls out, available staff get a text to pick up the shift' },
  ];
  if (!f.operatorPlansOn) {
    items.push({ key: 'autofill', icon: 'calendar', title: 'AI Shift Auto-fill', desc: 'Describe an open shift in plain words and get matching available caregivers' });
  }
  if (!f.complianceKitsOn) {
    items.push({ key: 'kits', icon: 'chart', title: 'Compliance Document Kits', desc: 'Ohio assisted-living compliance document kits' });
  }
  return items;
}
