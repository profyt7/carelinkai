/**
 * Cookie-consent state shared between the banner and the analytics loader.
 *
 * No analytics (first-party, forwarded to GA4 server-side) may run
 * until the user opts in. `AnalyticsScripts` reads this and mounts tracking only
 * once consent is granted; the banner writes it and dispatches `CONSENT_EVENT`
 * so tracking starts immediately (no reload).
 *
 * Client-only (uses localStorage / window). Guards for SSR.
 */

export const CONSENT_KEY = 'carelinkai_cookie_consent';
export const CONSENT_EVENT = 'carelinkai-consent-changed';

export type ConsentPreferences = {
  necessary: boolean; // always true; not gated
  analytics: boolean; // first-party funnel events, forwarded to GA4 server-side
  marketing: boolean; // No marketing trackers since OL-228 (Meta Pixel removed); always false
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
