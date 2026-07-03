/**
 * Unit tests for the ODH inspection-record matcher (OL-113).
 * The priority is FALSE-POSITIVE PREVENTION: a survey history attached to the
 * wrong facility is worse than none, so anything ambiguous must land in
 * REVIEW (reported, never written) — these tests pin that behavior.
 */

import {
  CandidateHome,
  OdhSurveyRecord,
  isExcludedDemoHome,
  matchOdhRecord,
  normalizeCity,
  normalizeLicense,
  normalizeName,
} from '@/lib/inspections/matcher';

const record = (over: Partial<OdhSurveyRecord> = {}): OdhSurveyRecord => ({
  licenseNumber: null,
  facilityName: 'Maple Grove Assisted Living',
  city: 'Cleveland',
  surveyDate: '2026-03-14',
  surveyType: 'Standard',
  ...over,
});

const home = (over: Partial<CandidateHome> = {}): CandidateHome => ({
  id: 'home-1',
  name: 'Maple Grove Assisted Living',
  odhLicenseNumber: null,
  city: 'Cleveland',
  description: 'A real facility.',
  operatorEmail: 'ops@example.com',
  ...over,
});

describe('normalizeLicense', () => {
  it('uppercases, strips separators and leading zeros', () => {
    expect(normalizeLicense('0592r')).toBe('592R');
    expect(normalizeLicense(' 2318-R ')).toBe('2318R');
    expect(normalizeLicense('365701')).toBe('365701');
  });

  it('rejects empty/garbage input', () => {
    expect(normalizeLicense('')).toBeNull();
    expect(normalizeLicense(null)).toBeNull();
    expect(normalizeLicense(undefined)).toBeNull();
    expect(normalizeLicense('0')).toBeNull();
    expect(normalizeLicense('--')).toBeNull();
  });
});

describe('normalizeName / normalizeCity', () => {
  it('normalizes punctuation, ampersands, and corporate noise', () => {
    expect(normalizeName('The Maple Grove, LLC')).toBe('maple grove');
    expect(normalizeName('Smith & Jones Senior Living Inc.')).toBe('smith and jones senior living');
  });

  it('does NOT strip care-type words (sister facilities stay distinct)', () => {
    expect(normalizeName('Maple Grove Assisted Living')).not.toBe(normalizeName('Maple Grove Memory Care'));
  });

  it('normalizes city case/whitespace', () => {
    expect(normalizeCity(' Rocky  River ')).toBe('rocky river');
    expect(normalizeCity(null)).toBe('');
  });
});

describe('isExcludedDemoHome', () => {
  it('excludes by name/description signature and test-domain operators', () => {
    expect(isExcludedDemoHome({ name: 'Test Senior Living Cleveland' })).toBe(true);
    expect(isExcludedDemoHome({ name: 'Demo Home' })).toBe(true);
    expect(isExcludedDemoHome({ name: 'Real Place', description: 'e2e fixture' })).toBe(true);
    expect(isExcludedDemoHome({ name: 'Real Place', operatorEmail: 'demo.operator@carelinkai.test' })).toBe(true);
    expect(isExcludedDemoHome({ name: 'Real Place', operatorEmail: 'op@test.carelinkai.com' })).toBe(true);
  });

  it('keeps real facilities', () => {
    expect(isExcludedDemoHome(home())).toBe(false);
    // "Protest" / "Modest" style substrings must not trip the word-boundary regex.
    expect(isExcludedDemoHome({ name: 'Crestwood Manor' })).toBe(false);
  });
});

describe('matchOdhRecord — license matching', () => {
  it('matches by normalized license number', () => {
    const outcome = matchOdhRecord(
      record({ licenseNumber: '0592R', facilityName: 'Totally Different Name', city: 'Akron' }),
      [home({ odhLicenseNumber: '592R' })],
    );
    expect(outcome).toMatchObject({ status: 'MATCHED', via: 'LICENSE' });
  });

  it('sends duplicate license numbers in our directory to REVIEW', () => {
    const outcome = matchOdhRecord(record({ licenseNumber: '2318R' }), [
      home({ id: 'a', odhLicenseNumber: '2318R' }),
      home({ id: 'b', odhLicenseNumber: '2318r', city: 'Akron', name: 'Other' }),
    ]);
    expect(outcome.status).toBe('REVIEW');
  });

  it('falls back to name+city when the license is unknown to us', () => {
    const outcome = matchOdhRecord(record({ licenseNumber: '9999R' }), [home()]);
    expect(outcome).toMatchObject({ status: 'MATCHED', via: 'NAME_CITY' });
  });
});

describe('matchOdhRecord — name+city fallback (false-positive prevention)', () => {
  it('matches a unique exact normalized name + same city', () => {
    const outcome = matchOdhRecord(record({ facilityName: 'The Maple Grove Assisted Living, LLC' }), [home()]);
    expect(outcome).toMatchObject({ status: 'MATCHED', via: 'NAME_CITY' });
  });

  it('NEVER auto-matches on name alone when the record has no city', () => {
    const outcome = matchOdhRecord(record({ city: null }), [home()]);
    expect(outcome.status).toBe('REVIEW');
  });

  it('sends same-brand-different-city to REVIEW, not a match', () => {
    const outcome = matchOdhRecord(record({ city: 'Columbus' }), [home({ city: 'Cleveland' })]);
    expect(outcome.status).toBe('REVIEW');
  });

  it('sends multiple name+city candidates to REVIEW', () => {
    const outcome = matchOdhRecord(record(), [home({ id: 'a' }), home({ id: 'b' })]);
    expect(outcome.status).toBe('REVIEW');
    if (outcome.status === 'REVIEW') {
      expect(outcome.candidateIds.sort()).toEqual(['a', 'b']);
    }
  });

  it('does not match a similar-but-different name (no fuzzy matching)', () => {
    const outcome = matchOdhRecord(record({ facilityName: 'Maple Grove Assisted Living II' }), [home()]);
    expect(outcome.status).toBe('NO_MATCH');
  });

  it('sends name-match-with-missing-home-city to REVIEW', () => {
    const outcome = matchOdhRecord(record(), [home({ city: null })]);
    expect(outcome.status).toBe('REVIEW');
  });

  it('returns NO_MATCH for facilities not in our directory', () => {
    const outcome = matchOdhRecord(record({ facilityName: 'Somewhere Else Entirely' }), [home()]);
    expect(outcome.status).toBe('NO_MATCH');
  });
});

describe('matchOdhRecord — demo exclusion (defense in depth)', () => {
  it('never matches a demo/test home even on exact license + name + city', () => {
    const demo = home({
      name: 'Maple Grove Assisted Living',
      odhLicenseNumber: '2318R',
      operatorEmail: 'demo.operator@carelinkai.test',
    });
    const outcome = matchOdhRecord(record({ licenseNumber: '2318R' }), [demo]);
    expect(outcome.status).toBe('NO_MATCH');
  });
});
