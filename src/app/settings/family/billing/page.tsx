import { redirect } from 'next/navigation';

/**
 * CareLinkAI Plus (the $19/mo family subscription) was retired on 2026-10-24
 * (OL-189) — families are always free. This former Plus billing page now just
 * redirects to the family settings page so old links, bookmarks and Stripe
 * return URLs land somewhere useful. (Webhook ignore-handlers, Family.isPlus and
 * comments are left as they are.)
 */
export default function FamilyBillingPage() {
  redirect('/settings/family');
}
