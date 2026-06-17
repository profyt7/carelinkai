/**
 * Cookie-consent state shared between the banner and the analytics loader.
 *
 * No third-party tracker (GA4/GTM, Meta Pixel, Microsoft Clarity) may load
 * until the user opts in. `AnalyticsScripts` reads this and only injects the
 * relevant <Script> tags once consent is granted; the banner writes it and
 * dispatches `CONSENT_EVENT` so loading happens immediately (no reload).
 *
 * Client-only (uses localStorage / window). Guards for SSR.
 */

export const CONSENT_KEY = 'carelinkai_cookie_consent';
export const CONSENT_EVENT = 'carelinkai-consent-changed';

export type ConsentPreferences = {
  necessary: boolean; // always true; not gated
  analytics: boolean; // GA4 + GTM + Microsoft Clarity
  marketing: boolean; // Meta/Facebook Pixel
};

export const DENY_ALL: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/** Read stored consent, or null if the user hasn't chosen yet. */
export function getConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      analytics: parsed?.analytics === true,
      marketing: parsed?.marketing === true,
    };
  } catch {
    return null;
  }
}

/** Persist consent and notify listeners (so trackers load without a reload). */
export function setConsent(prefs: ConsentPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: prefs }));
  } catch {
    /* ignore */
  }
}
