'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { hasAnalyticsConsent, track, type FunnelEvents } from '@/lib/analytics/events';
import { routePattern, sanitizePath } from '@/lib/analytics/sanitize';

type Gtag = (...args: unknown[]) => void;

/**
 * OL-226, mounted by AnalyticsScripts only with analytics consent.
 *  - page_view: sent manually on every pathname change with a sanitized page_location /
 *    page_path (query string stripped except allowlisted params). GA's automatic page view
 *    is off (`send_page_view: false`), so /search?q=… never reaches GA.
 *  - listing_clicked: one delegated click listener for links to /homes/<id> inside an element
 *    carrying `data-track-listing` (search, directory, AI match and favorites cards). The
 *    element's data attributes hold only allowlisted facts; track() re-validates them.
 *  - concierge_clicked: links to /concierge, with the current route pattern (never the URL).
 */
export default function FunnelTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = () => {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (typeof gtag !== 'function') {
        if (tries++ < 20) timer = setTimeout(send, 250);
        return;
      }
      const page_path = sanitizePath(window.location.pathname + window.location.search);
      const page_location = `${window.location.origin}${page_path}`;
      gtag('set', { page_location, page_path });
      gtag('event', 'page_view', { page_location, page_path });
    };
    send();
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!hasAnalyticsConsent()) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href === '/concierge' || href.startsWith('/concierge?') || href.startsWith('/concierge#')) {
        track('concierge_clicked', { source_page: routePattern(window.location.pathname) });
        return;
      }
      if (!href.startsWith('/homes/')) return;
      const card = a.closest('[data-track-listing]') as HTMLElement | null;
      if (!card) return;
      const d = card.dataset;
      const props: FunnelEvents['listing_clicked'] = {
        listing_id: d.trackListing || '',
        position: Number(d.trackPosition),
        source: d.trackSource as FunnelEvents['listing_clicked']['source'],
        availability_state: d.trackAvailability === 'verified' ? 'verified' : 'unverified',
        has_photo: d.trackHasPhoto === 'true',
        has_price: d.trackHasPrice === 'true',
      };
      if (d.trackClaimed === 'true' || d.trackClaimed === 'false') props.claimed = d.trackClaimed === 'true';
      track('listing_clicked', props);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
