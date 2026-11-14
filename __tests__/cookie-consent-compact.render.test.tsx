/**
 * @jest-environment jsdom
 *
 * Cookie banner on the claim pages: compact, with page bottom padding equal to its height while it
 * shows, so the primary button is never covered. Consent behaviour is unchanged (same handlers).
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

const path = { current: '/claim' };
jest.mock('next/navigation', () => ({ usePathname: () => path.current }));
const setConsent = jest.fn();
jest.mock('@/lib/consent', () => ({ getConsent: () => null, setConsent: (p: any) => setConsent(p) }));

import CookieConsent, { isCompactConsentPage } from '@/components/analytics/CookieConsent';

describe('isCompactConsentPage', () => {
  it('claim landing and claim-token signup only', () => {
    expect(isCompactConsentPage('/claim', '?token=x')).toBe(true);
    expect(isCompactConsentPage('/auth/register', '?role=OPERATOR&claimToken=x')).toBe(true);
    expect(isCompactConsentPage('/auth/register', '?role=OPERATOR')).toBe(false);
    expect(isCompactConsentPage('/', '')).toBe(false);
  });
});

describe('CookieConsent', () => {
  beforeEach(() => { jest.useFakeTimers(); setConsent.mockClear(); document.body.style.removeProperty('padding-bottom'); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('on /claim: compact banner, body padded by its height, removed after a choice', () => {
    path.current = '/claim';
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(118);
    render(<CookieConsent />);
    act(() => { jest.advanceTimersByTime(1100); });
    expect(screen.getByTestId('cookie-consent-compact')).toBeTruthy();
    expect(screen.queryByText('Cookie Preferences')).toBeNull();
    expect(document.body.style.paddingBottom).toBe('118px');
    fireEvent.click(screen.getByText('Necessary Only'));
    expect(setConsent).toHaveBeenCalledWith({ necessary: true, analytics: false, marketing: false });
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('elsewhere: the full banner, no padding change', () => {
    path.current = '/';
    render(<CookieConsent />);
    act(() => { jest.advanceTimersByTime(1100); });
    expect(screen.getByText('Cookie Preferences')).toBeTruthy();
    expect(screen.queryByTestId('cookie-consent-compact')).toBeNull();
    expect(document.body.style.paddingBottom).toBe('');
  });
});
