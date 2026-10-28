/**
 * Unit tests for the payer-source screener lib (OL-114).
 * The deriveFeeLane matrix is the Anti-Kickback firewall for the placement
 * fee — every input is pinned here because the mapping is legal-sensitive and
 * will be attorney-reviewed. Any change to the mapping must consciously break
 * these tests.
 */

import {
  FEE_LANE_LABELS,
  PAYER_SOURCE_LABELS,
  PAYER_SOURCE_OPTIONS,
  PAYER_SOURCE_VALUES,
  deriveFeeLane,
  isPayerSource,
  type PayerSource,
} from '@/lib/payer/payer-source';

describe('deriveFeeLane — the full matrix', () => {
  const MATRIX: Array<[PayerSource | null | undefined, string]> = [
    ['PRIVATE_FUNDS', 'FEE_ELIGIBLE'],
    ['LTC_INSURANCE', 'FEE_ELIGIBLE'],
    ['MEDICAID_WAIVER', 'FREE_LANE'],
    ['MEDICARE_ADVANTAGE', 'FREE_LANE'],
    ['VA_BENEFITS', 'FREE_LANE'],
    ['NOT_SURE', 'UNKNOWN'],
    [null, 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
  ];

  it.each(MATRIX)('deriveFeeLane(%s) → %s', (input, expected) => {
    expect(deriveFeeLane(input)).toBe(expected);
  });

  it('no federal-program payer ever lands in FEE_ELIGIBLE (AKS firewall)', () => {
    for (const federal of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(deriveFeeLane(federal)).not.toBe('FEE_ELIGIBLE');
    }
  });

  it('an unrecognized value falls through to UNKNOWN, never FEE_ELIGIBLE', () => {
    expect(deriveFeeLane('SOMETHING_NEW' as PayerSource)).toBe('UNKNOWN');
  });
});

describe('isPayerSource', () => {
  it('accepts every enum value and rejects everything else', () => {
    for (const v of PAYER_SOURCE_VALUES) expect(isPayerSource(v)).toBe(true);
    for (const bad of ['', 'private', 'PRIVATE', null, undefined, 42, {}, 'FEE_ELIGIBLE']) {
      expect(isPayerSource(bad)).toBe(false);
    }
  });
});

describe('options + labels', () => {
  it('every payer source has a label and an option (nothing silently missing from forms)', () => {
    expect(PAYER_SOURCE_OPTIONS).toHaveLength(PAYER_SOURCE_VALUES.length);
    for (const v of PAYER_SOURCE_VALUES) {
      expect(PAYER_SOURCE_LABELS[v]).toBeTruthy();
    }
  });

  it('"Not sure yet" is a first-class option with welcoming copy', () => {
    const notSure = PAYER_SOURCE_OPTIONS.find((o) => o.value === 'NOT_SURE');
    expect(notSure).toBeDefined();
    expect(notSure!.label).toMatch(/not sure yet/i);
  });

  it('every fee lane has an admin display label', () => {
    for (const lane of ['FEE_ELIGIBLE', 'FREE_LANE', 'UNKNOWN'] as const) {
      expect(FEE_LANE_LABELS[lane]).toBeTruthy();
    }
  });
});
