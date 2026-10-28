/**
 * @jest-environment jsdom
 *
 * OL-200 — AvailabilityBadge renders exactly two states, in both tones:
 * "Verified <date> · N open" for a fresh, QA-approved verification, and
 * "Contact to confirm availability" for everything else. It never renders a
 * capacity-derived count, "N Available" or "Waitlist".
 */

jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/events/record-event', () => ({ recordEvent: jest.fn(), eventSourceForAvailability: jest.fn() }));

import { render, screen } from '@testing-library/react';
import AvailabilityBadge, { UNVERIFIED_AVAILABILITY } from '@/components/availability/AvailabilityBadge';
import { availabilityView } from '@/lib/availability/availability';

const NOW = new Date('2026-10-26T16:00:00Z').getTime();
const DAY = 86_400_000;

function view(verifiedDaysAgo: number | null, count: number | null) {
  // availabilityView returns a Date for verifiedAt; the badge receives the JSON (ISO string) form.
  return JSON.parse(
    JSON.stringify(
      availabilityView(
        {
          availabilityCount: count,
          availabilityVerifiedAt: verifiedDaysAgo == null ? null : new Date(NOW - verifiedDaysAgo * DAY),
          availabilitySource: verifiedDaysAgo == null ? null : 'AI_CALL',
        },
        NOW,
      ),
    ),
  );
}

const FORBIDDEN = /\b\d+ Available\b|Waitlist/i;

describe.each(['default', 'overlay'] as const)('AvailabilityBadge tone=%s', (tone) => {
  it('fresh with a count → "Verified <date> · N open"', () => {
    render(<AvailabilityBadge availability={view(1, 3)} tone={tone} />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Verified Oct 25 ?· 3 open$/);
    expect(badge.getAttribute('data-verified-at')).toMatch(/^2026-10-25T/);
    expect(badge.getAttribute('aria-label')).toMatch(/^Verified Availability — /);
    expect(badge.textContent).not.toMatch(FORBIDDEN);
  });

  it('fresh without a count → "Verified <date>" and no count', () => {
    render(<AvailabilityBadge availability={view(2, null)} tone={tone} />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Verified Oct 24$/);
    expect(badge.textContent).not.toMatch(/open/);
  });

  it('stale (verified 11 days ago) → "Contact to confirm availability", count dropped', () => {
    render(<AvailabilityBadge availability={view(11, 7)} tone={tone} />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Contact to confirm availability$/);
    expect(badge.getAttribute('data-verified-at')).toBe('');
    expect(badge.textContent).not.toMatch(/7/);
  });

  it('never verified → "Contact to confirm availability"', () => {
    render(<AvailabilityBadge availability={view(null, null)} tone={tone} />);
    expect(screen.getByTestId('availability-badge').textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Contact to confirm availability$/);
  });

  it('UNVERIFIED_AVAILABILITY fallback → "Contact to confirm availability"', () => {
    render(<AvailabilityBadge availability={UNVERIFIED_AVAILABILITY} tone={tone} />);
    expect(screen.getByTestId('availability-badge').textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Contact to confirm availability$/);
  });

  it('null → renders nothing (callers pass UNVERIFIED_AVAILABILITY when they must show a state)', () => {
    const { container } = render(<AvailabilityBadge availability={null} tone={tone} />);
    expect(container.innerHTML).toBe('');
  });
});

it('overlay tone is a white/90 pill with a shadow; default tone is unchanged', () => {
  const { rerender } = render(<AvailabilityBadge availability={view(1, 3)} tone="overlay" />);
  expect(screen.getByTestId('availability-badge').className).toMatch(/bg-white\/90/);
  expect(screen.getByTestId('availability-badge').className).toMatch(/shadow-md/);
  rerender(<AvailabilityBadge availability={view(1, 3)} />);
  expect(screen.getByTestId('availability-badge').className).toMatch(/bg-success-50/);
  expect(screen.getByTestId('availability-badge').className).not.toMatch(/bg-white\/90/);
});
