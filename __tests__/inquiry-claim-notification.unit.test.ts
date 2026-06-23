import {
  isUnclaimedHome,
  DIRECTORY_UNCLAIMED_EMAIL,
  NUDGE_THROTTLE_HOURS,
} from '@/lib/claim-engine/inquiry-claim-notification';

describe('inquiry→claim engine — unclaimed gate (OL-083)', () => {
  it('treats the directory sentinel operator as unclaimed', () => {
    expect(isUnclaimedHome(DIRECTORY_UNCLAIMED_EMAIL)).toBe(true);
  });

  it('is case-insensitive on the sentinel email', () => {
    expect(isUnclaimedHome('Directory-Unclaimed@CareLinkAI.System')).toBe(true);
  });

  it('treats a real operator email as claimed (no nudge)', () => {
    expect(isUnclaimedHome('owner@somefacility.com')).toBe(false);
  });

  it('treats null/undefined/empty as not unclaimed (safe default — no nudge)', () => {
    expect(isUnclaimedHome(null)).toBe(false);
    expect(isUnclaimedHome(undefined)).toBe(false);
    expect(isUnclaimedHome('')).toBe(false);
  });

  it('exposes a sane throttle window', () => {
    expect(NUDGE_THROTTLE_HOURS).toBeGreaterThanOrEqual(1);
  });
});
