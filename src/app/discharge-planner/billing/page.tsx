import { redirect } from 'next/navigation';

/**
 * Discharge-planner access is FREE (ratified 2026-06-27) — there is no DP
 * subscription. This former billing/subscribe page now just redirects to the DP
 * dashboard so any old links/bookmarks land somewhere useful instead of a paywall.
 * Revenue is operator-subscriptions only.
 */
export default function DischargePlannerBillingPage() {
  redirect('/discharge-planner');
}
