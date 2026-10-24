'use client';

import SiteFooter from '@/components/site/SiteFooter';
import SiteHeader, { SITE_HEADER_HEIGHT_PX } from '@/components/site/SiteHeader';

/**
 * Public chrome for ANONYMOUS (logged-out) visitors browsing the directory
 * (/search, /homes/[id]). No member sidebar, no useSession redirect — logged-out families
 * can search, browse, view listings, and submit an inquiry; signup is only triggered at
 * inquiry/save, never as a wall. Authenticated users get the full DashboardLayout instead
 * (see BrowseShell).
 *
 * OL-171: the same SiteHeader / SiteFooter as /cleveland/* and /concierge, so every
 * public page carries the homepage logo, nav, the published number and the footer.
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50" data-testid="site-shell" style={{ ['--site-header-h' as string]: `${SITE_HEADER_HEIGHT_PX}px` }}>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
