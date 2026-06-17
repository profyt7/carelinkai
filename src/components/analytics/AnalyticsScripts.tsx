'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getConsent, CONSENT_EVENT, type ConsentPreferences } from '@/lib/consent';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

/**
 * Logged-in app + health/care/auth areas. On a HIPAA-positioned site we keep
 * behavioral trackers (Meta Pixel, Microsoft Clarity) OFF these routes — Pixel
 * never loads here, and Clarity is not initially loaded here (site-wide it is
 * also fully masked via data-clarity-mask on <body>). GA4/GTM still load with
 * analytics consent (page-level analytics only).
 */
const SENSITIVE_PREFIXES = [
  '/family', '/operator', '/caregiver', '/provider', '/discharge-planner',
  '/admin', '/settings', '/messages', '/dashboard', '/auth', '/residents',
  '/rides', '/background-checks', '/calendar', '/shifts', '/timesheets', '/reports',
];

function isSensitiveRoute(pathname: string | null): boolean {
  if (!pathname) return true; // fail safe (treat unknown as sensitive)
  return SENSITIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Consent-gated analytics loader. Renders nothing until the user has made an
 * explicit cookie choice; then injects only the trackers they opted into.
 * Reacts to CONSENT_EVENT so trackers load immediately on opt-in (no reload).
 */
export default function AnalyticsScripts() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    setConsent(getConsent());
    const onChange = () => setConsent(getConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // Pre-consent (or no choice yet): load nothing.
  if (!consent) return null;

  const analytics = consent.analytics;
  const marketing = consent.marketing;
  const sensitive = isSensitiveRoute(pathname);

  return (
    <>
      {/* Google Tag Manager — analytics consent (all pages) */}
      {analytics && GTM_ID && (
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      )}

      {/* Google Analytics 4 — analytics consent (all pages) */}
      {analytics && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname, send_page_view: true });
              `,
            }}
          />
        </>
      )}

      {/* Microsoft Clarity — analytics consent; skip initial load on sensitive
          routes. Site-wide masking is enforced via data-clarity-mask on <body>. */}
      {analytics && CLARITY_ID && !sensitive && (
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_ID}");
            `,
          }}
        />
      )}

      {/* Meta/Facebook Pixel — marketing consent; PageView ONLY (no custom
          events here), and never on logged-in/health routes. */}
      {marketing && PIXEL_ID && !sensitive && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
