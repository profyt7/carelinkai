'use client';

import { useState, useEffect } from 'react';
import { FiX, FiShield } from 'react-icons/fi';
import { getConsent, setConsent, type ConsentPreferences } from '@/lib/consent';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

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
      marketing: true,
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-4 px-4 sm:px-6 lg:px-8 animate-slide-up">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] px-6 py-4 flex items-center justify-between">
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
                  className="mt-1 rounded border-neutral-300 text-[#3978FC] focus:ring-[#3978FC]"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-800">Analytics Cookies</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Help us understand how visitors interact with our website (Google Analytics, Microsoft Clarity).
                  </p>
                </div>
              </div>

              {/* Marketing cookies */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1 rounded border-neutral-300 text-[#3978FC] focus:ring-[#3978FC]"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-800">Marketing Cookies</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    Used to track visitors across websites for advertising purposes (Facebook Pixel).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptAll}
              className="flex-1 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
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
              className="flex-1 border-2 border-neutral-300 text-neutral-700 px-6 py-3 rounded-lg font-medium hover:border-[#3978FC] hover:text-[#3978FC] transition-colors"
            >
              {showDetails ? 'Save Preferences' : 'Customize'}
            </button>
          </div>

          {showDetails && (
            <button
              onClick={saveCustom}
              className="w-full mt-3 bg-[#3978FC] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3167d4] transition-colors"
            >
              Save Custom Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
