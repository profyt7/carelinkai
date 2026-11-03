/**
 * Medicaid Assisted Living Waiver helpers (sprint W5-2, G3 + G4): precedence,
 * WRAAA vocabulary, public copy, pending line, county lookup, protected sources.
 */

import {
  mostPermissiveWaiverStatus,
  wraaaStatusToEnum,
  medicaidWaiverPublicView,
  WRAAA_IMPORT_SOURCE,
  waiverSourceKind,
  waiverSourceNote,
  isProtectedSource,
  normalizeAcuityCeiling,
  ACUITY_KEYS,
} from '@/lib/medicaid/waiver';
import { countyForCity, cityKey } from '@/lib/medicaid/ne-ohio-counties';

describe('mostPermissiveWaiverStatus — precedence', () => {
  it('ACCEPTING_NEW > CURRENT_RESIDENTS_ONLY > NOT_ACCEPTING_REFERRALS', () => {
    expect(mostPermissiveWaiverStatus(['CURRENT_RESIDENTS_ONLY', 'ACCEPTING_NEW'])).toBe('ACCEPTING_NEW');
    expect(mostPermissiveWaiverStatus(['NOT_ACCEPTING_REFERRALS', 'CURRENT_RESIDENTS_ONLY'])).toBe('CURRENT_RESIDENTS_ONLY');
    expect(mostPermissiveWaiverStatus(['NOT_ACCEPTING_REFERRALS'])).toBe('NOT_ACCEPTING_REFERRALS');
    expect(mostPermissiveWaiverStatus(['ACCEPTING_NEW', 'NOT_ACCEPTING_REFERRALS', 'CURRENT_RESIDENTS_ONLY'])).toBe('ACCEPTING_NEW');
  });
  it('is order-independent and defaults to UNKNOWN for no input', () => {
    expect(mostPermissiveWaiverStatus(['ACCEPTING_NEW', 'CURRENT_RESIDENTS_ONLY'])).toBe(mostPermissiveWaiverStatus(['CURRENT_RESIDENTS_ONLY', 'ACCEPTING_NEW']));
    expect(mostPermissiveWaiverStatus([])).toBe('UNKNOWN');
  });
});

describe('wraaaStatusToEnum', () => {
  it('maps the CSV vocabulary and rejects anything else', () => {
    expect(wraaaStatusToEnum('accepting')).toBe('ACCEPTING_NEW');
    expect(wraaaStatusToEnum(' Current_Residents_Only ')).toBe('CURRENT_RESIDENTS_ONLY');
    expect(wraaaStatusToEnum('not_accepting_referrals')).toBe('NOT_ACCEPTING_REFERRALS');
    expect(wraaaStatusToEnum('maybe')).toBeNull();
    expect(wraaaStatusToEnum('')).toBeNull();
    expect(wraaaStatusToEnum(undefined)).toBeNull();
  });
});

describe('medicaidWaiverPublicView — honest public copy', () => {
  it('renders the three listed statuses with the real source + date note', () => {
    expect(
      medicaidWaiverPublicView({ medicaidWaiverStatus: 'ACCEPTING_NEW', medicaidWaiverSource: WRAAA_IMPORT_SOURCE, medicaidWaiverVerifiedAt: '2026-10-16T00:00:00Z' }),
    ).toMatchObject({
      line: 'Accepting new waiver residents',
      note: 'Source: Western Reserve Area Agency on Aging waiver facilities list, verified Oct 16, 2026. Confirm with the home.',
      source: 'WRAAA_LIST',
      verifiedAt: '2026-10-16T00:00:00.000Z',
    });
    expect(medicaidWaiverPublicView({ medicaidWaiverStatus: 'CURRENT_RESIDENTS_ONLY' }).line).toBe('Waiver — current residents only');
    expect(medicaidWaiverPublicView({ medicaidWaiverStatus: 'NOT_ACCEPTING_REFERRALS' }).line).toBe('Not taking new waiver referrals');
  });
  it('names the actual source and date — never a fixed WRAAA note for a call / operator / admin status', () => {
    const v = medicaidWaiverPublicView({ medicaidWaiverStatus: 'CURRENT_RESIDENTS_ONLY', medicaidWaiverSource: 'AI_CALL', medicaidWaiverVerifiedAt: new Date('2026-10-12T15:05:00Z') });
    expect(v.note).toBe('Source: the community, by phone to CareLinkAI’s calling assistant, verified Oct 12, 2026. Confirm with the home.');
    expect(v.note).not.toMatch(/Western Reserve|WRAAA/);
    expect(v.source).toBe('AI_CALL');
    expect(medicaidWaiverPublicView({ medicaidWaiverStatus: 'ACCEPTING_NEW', medicaidWaiverSource: 'ADMIN' }).note).toBe('Source: the CareLinkAI team. Confirm with the home.');
    expect(medicaidWaiverPublicView({ medicaidWaiverStatus: 'ACCEPTING_NEW' })).toMatchObject({ source: 'UNKNOWN', verifiedAt: null, note: 'Source: source not recorded. Confirm with the home.' });
    expect(waiverSourceKind('WRAAA Medicaid Waiver Facilities list (accessed 2026-11-01)')).toBe('WRAAA_LIST');
    expect(waiverSourceKind('something else')).toBe('UNKNOWN');
    expect(waiverSourceNote('OPERATOR', 'not a date')).toBe('Source: the community’s operator on CareLinkAI. Confirm with the home.');
  });
  it('renders NOTHING for NOT_ON_LIST / UNKNOWN / missing', () => {
    for (const s of ['NOT_ON_LIST', 'UNKNOWN'] as const) {
      const v = medicaidWaiverPublicView({ medicaidWaiverStatus: s });
      expect(v.line).toBeNull();
      expect(v.note).toBeNull();
    }
    expect(medicaidWaiverPublicView({}).line).toBeNull();
    expect(medicaidWaiverPublicView({}).status).toBe('UNKNOWN');
  });
  it('pending line only once set, with the verified date', () => {
    expect(medicaidWaiverPublicView({}).pendingLine).toBeNull();
    expect(medicaidWaiverPublicView({ medicaidPendingAccepted: true, medicaidPendingAcceptedVerifiedAt: '2026-10-16T15:00:00Z' }).pendingLine).toBe(
      'Accepts residents while the Medicaid application is pending: yes — verified Oct 16, 2026',
    );
    expect(medicaidWaiverPublicView({ medicaidPendingAccepted: false }).pendingLine).toBe('Accepts residents while the Medicaid application is pending: no');
  });
});

describe('isProtectedSource / acuity', () => {
  it('human sources are protected, import is not', () => {
    expect(isProtectedSource('VA_CALL')).toBe(true);
    expect(isProtectedSource('OPERATOR')).toBe(true);
    expect(isProtectedSource('ADMIN')).toBe(true);
    expect(isProtectedSource('IMPORT')).toBe(false);
    expect(isProtectedSource('WRAAA Medicaid Waiver Facilities list (accessed 2026-10-16)')).toBe(false);
    expect(isProtectedSource(null)).toBe(false);
  });
  it('normalizeAcuityCeiling fills every key with true/false/null and drops junk', () => {
    const out = normalizeAcuityCeiling({ wandering: true, oxygen: 'yes', patientName: 'x' });
    expect(Object.keys(out).sort()).toEqual([...ACUITY_KEYS].sort());
    expect(out.wandering).toBe(true);
    expect(out.oxygen).toBeNull();
    expect((out as Record<string, unknown>).patientName).toBeUndefined();
  });
});

describe('countyForCity', () => {
  it('places WRAAA counties and Summit/Portage, normalizing spellings', () => {
    expect(countyForCity('Cleveland')).toBe('Cuyahoga');
    expect(countyForCity('Maple Hts')).toBe('Cuyahoga');
    expect(countyForCity('N Olmsted')).toBe('Cuyahoga');
    expect(countyForCity('Brookpark')).toBe('Cuyahoga');
    expect(countyForCity('Mentor')).toBe('Lake');
    expect(countyForCity('Chardon')).toBe('Geauga');
    expect(countyForCity('Elyria')).toBe('Lorain');
    expect(countyForCity('Wadsworth')).toBe('Medina');
    expect(countyForCity('Akron')).toBe('Summit');
    expect(countyForCity('Kent')).toBe('Portage');
    expect(countyForCity('Columbus')).toBeNull();
    expect(countyForCity('')).toBeNull();
    expect(cityKey('Mayfield Hts.')).toBe(cityKey('Mayfield Heights'));
  });
});
