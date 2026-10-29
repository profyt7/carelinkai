'use client';

import { useEffect, useState } from 'react';
import { getConsent, CONSENT_EVENT, type ConsentPreferences } from '@/lib/consent';
import FunnelTracking from './FunnelTracking';

/**
 * Consent-gated analytics. Renders nothing until the visitor has made an explicit cookie
 * choice, and nothing without analytics consent. Reacts to CONSENT_EVENT so tracking starts
 * immediately on opt-in (no reload).
 *
 * No third-party script loads in the browser:
 *  - OL-228 / OL-229: the Meta Pixel and Microsoft Clarity were removed. Neither could be
 *    kept off sensitive routes reached by client-side navigation, nor kept from receiving
 *    full URLs (search query strings included).
 *  - OL-229: Google Tag Manager and gtag.js were removed for the same reason. GA4 Enhanced
 *    Measurement (history page views, site search) reads the browser URL from the GA
 *    property's settings, and the GTM container could load any tag (the Pixel included).
 *    GA4 now receives only sanitized, allowlisted events server-side (src/lib/analytics/ga-mp.ts).
 * Do not re-add any of them without a verified safe design.
 */
export default function AnalyticsScripts() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    setConsent(getConsent());
    const onChange = () => setConsent(getConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!consent?.analytics) return null;
  return <FunnelTracking />;
}
