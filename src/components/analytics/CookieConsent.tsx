'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { FiX, FiShield } from 'react-icons/fi';
import { getConsent, setConsent, type ConsentPreferences } from '@/lib/consent';

/**
 * Pages whose primary call to action must never sit under the banner: the claim landing and the
 * claim-token signup. There the banner renders compact and the page gets bottom padding equal to
 * the banner's height while it shows. Same choices and same consent handling as everywhere else.
 */
export function isCompactConsentPage(pathname: string | null, search: string): boolean {
  if (pathname === '/claim') return true;
  if (pathname === '/auth/register') return new URLSearchParams(search).has('claimToken');
  return false;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // window.location (not useSearchParams) so the root layout needs no Suspense boundary.
    setCompact(isCompactConsentPage(pathname, window.location.search));
  }, [pathname]);

  // Compact pages: pad the page bottom by the banner's live height so nothing is ever covered.
  useEffect(() => {
    const el = bannerRef.current;
    if (!showBanner || !compact || !el) return undefined;
    const body = document.body;
    const previous = body.style.getPropertyValue('padding-bottom');
    const apply = () => body.style.setProperty('padding-bottom', `${el.offsetHeight}px`);
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      if (previous) body.style.setProperty('padding-bottom', previous);
      else body.style.removeProperty('padding-bottom');
    };
  }, [showBanner, compact, showDetails]);

  useEffect(() => {
    // Show the banner only until the user makes an explicit choice. No tracker
    // fires before that — AnalyticsScripts loads nothing until consent is set.
    const existing = getConsent();
    if (!existing) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
    setPreferences(existing);
    return undefined;
  }, []);

  const savePreferences = (prefs: ConsentPreferences) => {
    // Persist + dispatch the consent-changed event so AnalyticsScripts loads
    // the opted-in trackers immediately (no reload needed).
    setConsent(prefs);
    setPreferences(prefs);
    setShowBanner(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      // OL-228: no marketing trackers exist; the field stays false for stored-value compatibility.
      marketing: false,
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  if (compact) {
    return (
      <div ref={bannerRef} data-testid="cookie-consent-compact" className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-neutral-700">
              We use cookies to run the site and, with your OK, to analyze traffic. &ldquo;Accept All&rdquo; allows analytics.
            </p>
            <button onClick={acceptNecessary} className="text-neutral-500 hover:text-neutral-800" aria-label="Close">
              <FiX className="text-lg" />
            </button>
          </div>
          {showDetails && (
            <label className="mt-2 flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" checked disabled className="rounded border-neutral-300" /> Necessary (always on)
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="ml-3 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              /> Analytics
            </label>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={acceptAll} className="flex-1 rounded-md bg-primary-500 px-3 py-2 text-xs font-medium text-white hover:bg-[#3167d4]">Accept All</button>
            <button onClick={acceptNecessary} className="flex-1 rounded-md bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-300">Necessary Only</button>
            {showDetails ? (
              <button onClick={saveCustom} className="flex-1 rounded-md border border-primary-500 px-3 py-2 text-xs font-medium text-primary-600">Save</button>
            ) : (
              <button onClick={() => setShowDetails(true)} className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700">Customize</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-4 px-4 sm:px-6 lg:px-8 animate-slide-up">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiShield className="text-white text-2xl" />
            <h3 className="text-white font-semibold text-lg">Cookie Preferences</h3>
          </div>
          <button
            onClick={acceptNecessary}
            className="text-white hover:text-neutral-200 transition-colors"
            aria-label="Close"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          {/* Main message */}
          <div className="mb-6">
            <p className="text-neutral-700 text-base">
              We use cookies to enhance your experience, analyze site traffic, and personalize content. 
              By clicking "Accept All", you consent to our use of cookies.
            </p>
          </div>

          {/* Cookie details (expandable) */}
          {showDetails && (
            <div className="mb-6 space-y-4 border-t border-neutral-200 pt-4">
              {/* Necessary cookies (always on) */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  className="mt-1 rounded border-neutral-300"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-800">Necessary Cookies</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Required for the website to function properly. These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Analytics cookies */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-800">Analytics Cookies</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Help us understand how visitors interact with our website (Google Analytics).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptAll}
              className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Accept All
            </button>
            <button
              onClick={acceptNecessary}
              className="flex-1 bg-neutral-200 text-neutral-800 px-6 py-3 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
            >
              Necessary Only
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 border-2 border-neutral-300 text-neutral-700 px-6 py-3 rounded-lg font-medium hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              {showDetails ? 'Save Preferences' : 'Customize'}
            </button>
          </div>

          {showDetails && (
            <button
              onClick={saveCustom}
              className="w-full mt-3 bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3167d4] transition-colors"
            >
              Save Custom Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
