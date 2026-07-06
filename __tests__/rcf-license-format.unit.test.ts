/**
 * OL-113 follow-up (Park East incident, 2026-07-06): only well-formed Ohio RCF
 * licenses (^\d{4}R$) may ever be WRITTEN to odhLicenseNumber. Six-digit
 * numerics like "365810" are nursing-home CCNs — the pre-gate parser wrote one
 * and it had to be nulled in prod. These tests pin the gate at every write
 * site: the format validator itself, the roster backfill, and the survey
 * ingest's learned-license path.
 */

import { jest } from '@jest/globals';
import { isValidRcfLicense } from '@/lib/inspections/matcher';
import { backfillLicensesFromRoster, ingestOdhRecords } from '@/lib/inspections/ingest';

describe('isValidRcfLicense', () => {
  it('accepts exactly four digits + R (case-insensitive, trims whitespace)', () => {
    for (const ok of ['2318R', '0592R', '0592r', ' 2437R ']) {
      expect(isValidRcfLicense(ok)).toBe(true);
    }
  });

  it('rejects nursing-home CCNs and every other malformed token', () => {
    for (const bad of [
      '365810',   // the Park East 6-digit NH CCN
      '365810R',  // 6 digits even with an R
      '123R',     // 3 digits
      '12345R',   // 5 digits
      '2318',     // missing R
      'R2318',    // wrong order
      '2318RX',
      '',
      null,
      undefined,
    ]) {
      expect(isValidRcfLicense(bad as any)).toBe(false);
    }
  });
});

// --- write-site gates with a stubbed Prisma client -------------------------

function makePrisma(homes: any[]) {
  return {
    assistedLivingHome: {
      findMany: jest.fn(async () => homes),
      update: jest.fn(async () => ({})),
    },
    facilityInspection: {
      upsert: jest.fn(async () => ({})),
    },
  } as any;
}

const home = {
  id: 'home-1',
  name: 'Park East Care Center',
  description: 'Real facility',
  odhLicenseNumber: null,
  address: { city: 'Cleveland', state: 'OH' },
  operator: { user: { email: 'ops@example.com' } },
};

describe('roster backfill format gate', () => {
  it('counts a NH CCN row as invalid and never writes it', async () => {
    const prisma = makePrisma([home]);
    const summary = await backfillLicensesFromRoster(
      prisma,
      [{
        providerName: 'Park East Care Center',
        address: null, city: 'Cleveland', county: null, phone: null,
        licenseStatus: 'ACTIVE',
        odhLicense: '365810',
      }],
      { force: true },
    );
    expect(summary.invalidRows).toBe(1);
    expect(summary.backfilled).toBe(0);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('still writes a valid RCF license', async () => {
    const prisma = makePrisma([home]);
    const summary = await backfillLicensesFromRoster(
      prisma,
      [{
        providerName: 'Park East Care Center',
        address: null, city: 'Cleveland', county: null, phone: null,
        licenseStatus: 'ACTIVE',
        odhLicense: '2318R',
      }],
      { force: true },
    );
    expect(summary.backfilled).toBe(1);
    expect(prisma.assistedLivingHome.update).toHaveBeenCalledWith({
      where: { id: 'home-1' },
      data: { odhLicenseNumber: '2318R' },
    });
  });
});

describe('survey-ingest learned-license format gate', () => {
  it('a NAME_CITY match with a NH-CCN license never backfills the home', async () => {
    const prisma = makePrisma([home]);
    const summary = await ingestOdhRecords(
      prisma,
      [{
        licenseNumber: '365810',
        facilityName: 'Park East Care Center',
        city: 'Cleveland',
        surveyDate: '2026-03-14',
        surveyType: 'Standard',
        citationCount: 0,
      }],
      { force: true },
    );
    // The survey record still attaches (name+city match is confirmed)...
    expect(summary.matchedByNameCity).toBe(1);
    expect(summary.upserted).toBe(1);
    // ...but the malformed license is never learned onto the home.
    expect(summary.licenseBackfills).toBe(0);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });
});
