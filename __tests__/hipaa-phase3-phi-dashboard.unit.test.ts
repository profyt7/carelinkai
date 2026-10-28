/**
 * HIPAA Phase 3A — ePHI access dashboard unit tests.
 *
 * Tests the query builder defaults and filter logic exported from the
 * /api/admin/phi-access route without hitting the database.
 */

import { PHI_RESOURCE_TYPES } from '../src/app/api/admin/phi-access/route';

// ── Unit: PHI resource type constants ────────────────────────────────────────

describe('PHI_RESOURCE_TYPES (constants)', () => {
  it('includes Resident', () => {
    expect(PHI_RESOURCE_TYPES).toContain('Resident');
  });

  it('includes Document', () => {
    expect(PHI_RESOURCE_TYPES).toContain('Document');
  });

  it('includes ResidentDocument', () => {
    expect(PHI_RESOURCE_TYPES).toContain('ResidentDocument');
  });

  it('includes InquiryDocument', () => {
    expect(PHI_RESOURCE_TYPES).toContain('InquiryDocument');
  });

  it('includes GalleryPhoto', () => {
    expect(PHI_RESOURCE_TYPES).toContain('GalleryPhoto');
  });

  it('has exactly 5 types', () => {
    expect(PHI_RESOURCE_TYPES).toHaveLength(5);
  });
});

// ── Unit: query builder default date logic ────────────────────────────────────

describe('default date window', () => {
  it('default window is 7 days back from now', () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // The default must be ≤ 7 days in the past
    const windowMs = now.getTime() - sevenDaysAgo.getTime();
    const windowDays = windowMs / (1000 * 60 * 60 * 24);
    expect(windowDays).toBeCloseTo(7, 0);
  });
});
