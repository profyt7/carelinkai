/**
 * Redirect page for /dashboard/inquiries
 * This page has been consolidated with /operator/inquiries to provide
 * a unified experience for both FAMILY and OPERATOR/ADMIN roles.
 * 
 * This redirect ensures backward compatibility with any bookmarks or links
 * pointing to the old /dashboard/inquiries URL.
 */

import { redirect } from 'next/navigation';

export default function DashboardInquiriesRedirect() {
  // Redirect to the new unified inquiries page
  redirect('/operator/inquiries');
}
