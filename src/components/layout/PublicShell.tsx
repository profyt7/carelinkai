'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/site/SiteFooter';
import SiteHeader, { SITE_HEADER_HEIGHT_PX } from '@/components/site/SiteHeader';
import { isSupportSlotPath } from '@/components/support/support-slot';

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
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50" data-testid="site-shell" style={{ ['--site-header-h' as string]: `${SITE_HEADER_HEIGHT_PX}px` }}>
      <SiteHeader supportSlot={isSupportSlotPath(pathname)} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
