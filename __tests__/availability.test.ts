/**
 * Availability freshness (OL-110) — pure logic: magic-link token, freshness window,
 * honest view (never fakes "live"), count/phone normalization.
 */
import { signAvailabilityToken, verifyAvailabilityToken } from '@/lib/availability/availability-token';
import {
  isAvailabilityFresh,
  availabilityView,
  normalizeCount,
  toE164,
  AVAILABILITY_FRESH_DAYS,
  MAX_AVAILABILITY_COUNT,
} from '@/lib/availability/availability';

const SECRET = 'test-secret-availability';
const DAY = 86_400_000;

describe('availability magic-link token', () => {
  it('round-trips with the same secret and carries the homeId', () => {
    const t = signAvailabilityToken('home_123', SECRET);
    const p = verifyAvailabilityToken(t, SECRET);
    expect(p?.homeId).toBe('home_123');
    expect(p?.type).toBe('availability');
  });
  it('rejects a wrong secret and a tampered token', () => {
    const t = signAvailabilityToken('home_123', SECRET);
    expect(verifyAvailabilityToken(t, 'other-secret')).toBeNull();
    expect(verifyAvailabilityToken(t + 'x', SECRET)).toBeNull();
    expect(verifyAvailabilityToken('garbage', SECRET)).toBeNull();
  });
  it('rejects an expired token', () => {
    const t = signAvailabilityToken('home_123', SECRET, -1); // already expired
    expect(verifyAvailabilityToken(t, SECRET)).toBeNull();
  });
});

describe('isAvailabilityFresh', () => {
  const now = Date.now();
  it('is fresh within the window, stale outside it', () => {
    expect(isAvailabilityFresh(new Date(now - 2 * DAY), now)).toBe(true);
    expect(isAvailabilityFresh(new Date(now - (AVAILABILITY_FRESH_DAYS + 1) * DAY), now)).toBe(false);
    expect(isAvailabilityFresh(null, now)).toBe(false);
    expect(isAvailabilityFresh(undefined, now)).toBe(false);
  });
});

describe('availabilityView — honest, never fakes live', () => {
  const now = Date.now();
  it('fresh → count + badge + verified label', () => {
    const v = availabilityView({ availabilityCount: 3, availabilityVerifiedAt: new Date(now - DAY), availabilitySource: 'SMS' }, now);
    expect(v.fresh).toBe(true);
    expect(v.count).toBe(3);
    expect(v.badge).toBe(true);
    expect(v.label.toLowerCase()).toContain('verified');
    expect(v.label).toContain('3 openings');
  });
  it('stale → NO count, no badge, "contact to confirm"', () => {
    const v = availabilityView({ availabilityCount: 3, availabilityVerifiedAt: new Date(now - 30 * DAY), availabilitySource: 'SMS' }, now);
    expect(v.fresh).toBe(false);
    expect(v.count).toBeNull(); // a stale count must never be shown as fact
    expect(v.badge).toBe(false);
    expect(v.label.toLowerCase()).toContain('contact to confirm');
  });
  it('never-verified → contact to confirm', () => {
    const v = availabilityView({ availabilityCount: null, availabilityVerifiedAt: null, availabilitySource: null }, now);
    expect(v.fresh).toBe(false);
    expect(v.badge).toBe(false);
  });
});

describe('normalizeCount', () => {
  it('parses, clamps, and rejects', () => {
    expect(normalizeCount('3')).toBe(3);
    expect(normalizeCount(0)).toBe(0);
    expect(normalizeCount(-5)).toBe(0);
    expect(normalizeCount(10_000)).toBe(MAX_AVAILABILITY_COUNT);
    expect(normalizeCount('two')).toBeNull();
    expect(normalizeCount('')).toBeNull();
  });
});

describe('toE164', () => {
  it('normalizes US phone shapes', () => {
    expect(toE164('(216) 245-9482')).toBe('+12162459482');
    expect(toE164('2162459482')).toBe('+12162459482');
    expect(toE164('12162459482')).toBe('+12162459482');
    expect(toE164('bad')).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});
