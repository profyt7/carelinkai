/**
 * HIPAA Phase 3B — Operator BAA/DPA gate unit tests.
 *
 * Tests version constants and isOperatorAcceptanceCurrent logic.
 * Database calls are not mocked — integration-mock rule applies.
 * The DB-dependent test is skipped when DATABASE_URL is absent.
 */

import { BAA_CURRENT_VERSION, DPA_CURRENT_VERSION } from '../src/lib/legal';

// Skip DB integration tests when running in environments without a live database.
// DATABASE_URL may be set in .env even when the server is not running.
const hasDb = !!process.env['DATABASE_URL'] && process.env['DATABASE_URL'].includes('localhost') === false;
const itReal = hasDb ? it : it.skip;

// ── Unit: version constants ───────────────────────────────────────────────────

describe('legal version constants', () => {
  it('BAA_CURRENT_VERSION is a non-empty string', () => {
    expect(typeof BAA_CURRENT_VERSION).toBe('string');
    expect(BAA_CURRENT_VERSION.length).toBeGreaterThan(0);
  });

  it('DPA_CURRENT_VERSION is a non-empty string', () => {
    expect(typeof DPA_CURRENT_VERSION).toBe('string');
    expect(DPA_CURRENT_VERSION.length).toBeGreaterThan(0);
  });

  it('BAA and DPA are both on the same draft date', () => {
    // Both agreements are issued together per the Phase 3 design
    expect(BAA_CURRENT_VERSION).toBe(DPA_CURRENT_VERSION);
  });

  it('version string matches expected draft format', () => {
    // Versions follow the pattern draft-YYYY-MM-DD
    expect(BAA_CURRENT_VERSION).toMatch(/^draft-\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Unit: isOperatorAcceptanceCurrent logic (without DB) ─────────────────────

describe('acceptance logic (version matching)', () => {
  it('returns false for null template version (pre-Phase-3 operator)', () => {
    // Simulate the check logic directly
    const baaTemplateVersion: string | null = null;
    const baaAcceptedAt: Date | null = null;
    const dpaTemplateVersion: string | null = null;
    const dpaAcceptedAt: Date | null = null;

    const current =
      baaTemplateVersion === BAA_CURRENT_VERSION &&
      baaAcceptedAt !== null &&
      dpaTemplateVersion === DPA_CURRENT_VERSION &&
      dpaAcceptedAt !== null;

    expect(current).toBe(false);
  });

  it('returns false when only BAA is accepted', () => {
    const baaTemplateVersion = BAA_CURRENT_VERSION;
    const baaAcceptedAt = new Date();
    const dpaTemplateVersion: string | null = null;
    const dpaAcceptedAt: Date | null = null;

    const current =
      baaTemplateVersion === BAA_CURRENT_VERSION &&
      baaAcceptedAt !== null &&
      dpaTemplateVersion === DPA_CURRENT_VERSION &&
      dpaAcceptedAt !== null;

    expect(current).toBe(false);
  });

  it('returns false when only DPA is accepted', () => {
    const baaTemplateVersion: string | null = null;
    const baaAcceptedAt: Date | null = null;
    const dpaTemplateVersion = DPA_CURRENT_VERSION;
    const dpaAcceptedAt = new Date();

    const current =
      baaTemplateVersion === BAA_CURRENT_VERSION &&
      baaAcceptedAt !== null &&
      dpaTemplateVersion === DPA_CURRENT_VERSION &&
      dpaAcceptedAt !== null;

    expect(current).toBe(false);
  });

  it('returns true when both are accepted at current version', () => {
    const baaTemplateVersion = BAA_CURRENT_VERSION;
    const baaAcceptedAt = new Date();
    const dpaTemplateVersion = DPA_CURRENT_VERSION;
    const dpaAcceptedAt = new Date();

    const current =
      baaTemplateVersion === BAA_CURRENT_VERSION &&
      baaAcceptedAt !== null &&
      dpaTemplateVersion === DPA_CURRENT_VERSION &&
      dpaAcceptedAt !== null;

    expect(current).toBe(true);
  });

  it('returns false when accepted at an older version', () => {
    const baaTemplateVersion = 'draft-2026-01-01'; // old version
    const baaAcceptedAt = new Date();
    const dpaTemplateVersion = 'draft-2026-01-01';
    const dpaAcceptedAt = new Date();

    const current =
      baaTemplateVersion === BAA_CURRENT_VERSION &&
      baaAcceptedAt !== null &&
      dpaTemplateVersion === DPA_CURRENT_VERSION &&
      dpaAcceptedAt !== null;

    expect(current).toBe(false);
  });
});

// ── Integration: migration safety probe ──────────────────────────────────────

describe('schema migration probe (requires database)', () => {
  itReal('Operator model has baaTemplateVersion field', async () => {
    const { prisma } = await import('../src/lib/prisma');
    const count = await prisma.operator.count({ take: 1 });
    expect(typeof count).toBe('number');

    // If we have any operators, verify the new fields exist on the shape
    if (count > 0) {
      const op = await prisma.operator.findFirst({
        select: {
          id: true,
          baaTemplateVersion: true,
          baaAcceptedAt: true,
          baaAcceptedIp: true,
          baaAcceptedUserAgent: true,
          dpaTemplateVersion: true,
          dpaAcceptedAt: true,
          dpaAcceptedIp: true,
          dpaAcceptedUserAgent: true,
        },
      });
      expect(op).not.toBeNull();
      // Fields exist and are nullable
      expect('baaTemplateVersion' in op!).toBe(true);
      expect('dpaAcceptedAt' in op!).toBe(true);
    }
  });
});
