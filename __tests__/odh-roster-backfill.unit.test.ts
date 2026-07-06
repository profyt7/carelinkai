/**
 * Tests for the ODH roster license-backfill mode (S2-3, OL-113 data prep):
 * CSV parsing of the Cowork roster shape, and the backfill's false-positive
 * prevention — unique name+city matches get the license; conflicts with a
 * stored license and ambiguous matches are reported, never written; dry-run
 * writes nothing.
 */

import { jest } from '@jest/globals';
import { backfillLicensesFromRoster, parseRosterCsv } from '@/lib/inspections/ingest';

describe('parseRosterCsv', () => {
  const HEADER = 'provider_name,address,city,county,phone,license_status,odh_license';

  it('parses the Cowork roster columns', () => {
    const rows = parseRosterCsv(
      [
        HEADER,
        '"Maple Grove Assisted Living","123 Main St",Cleveland,Cuyahoga,(216) 555-0100,ACTIVE,2318R',
        'Other Place,,Akron,Summit,,ACTIVE,0592R',
      ].join('\n'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      providerName: 'Maple Grove Assisted Living',
      address: '123 Main St',
      city: 'Cleveland',
      county: 'Cuyahoga',
      phone: '(216) 555-0100',
      licenseStatus: 'ACTIVE',
      odhLicense: '2318R',
    });
    expect(rows[1].address).toBeNull();
  });

  it('rejects a CSV without the required columns', () => {
    expect(() => parseRosterCsv('name,license\nA,1')).toThrow(/provider_name and odh_license/);
  });

  it('returns [] for empty input', () => {
    expect(parseRosterCsv('')).toEqual([]);
  });
});

// --- backfillLicensesFromRoster with a stubbed Prisma client ----------------

function makePrisma(homes: any[]) {
  return {
    assistedLivingHome: {
      findMany: jest.fn(async () => homes),
      update: jest.fn(async () => ({})),
    },
  } as any;
}

const home = (over: Record<string, unknown> = {}) => ({
  id: 'home-1',
  name: 'Maple Grove Assisted Living',
  description: 'Real facility',
  odhLicenseNumber: null,
  address: { city: 'Cleveland', state: 'OH' },
  operator: { user: { email: 'ops@example.com' } },
  ...over,
});

const row = (over: Record<string, unknown> = {}) => ({
  providerName: 'Maple Grove Assisted Living',
  address: null,
  city: 'Cleveland',
  county: 'Cuyahoga',
  phone: null,
  licenseStatus: 'ACTIVE',
  odhLicense: '2318R',
  ...over,
});

describe('backfillLicensesFromRoster', () => {
  it('dry-run (default) reports but writes nothing', async () => {
    const prisma = makePrisma([home()]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any]);
    expect(summary.dryRun).toBe(true);
    expect(summary.backfilled).toBe(1);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('force: writes the license onto a unique exact name+city match', async () => {
    const prisma = makePrisma([home()]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any], { force: true });
    expect(summary.backfilled).toBe(1);
    expect(prisma.assistedLivingHome.update).toHaveBeenCalledWith({
      where: { id: 'home-1' },
      data: { odhLicenseNumber: '2318R' },
    });
  });

  it('NEVER overwrites a different stored license — reports a conflict instead', async () => {
    const prisma = makePrisma([home({ odhLicenseNumber: '1111R' })]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any], { force: true });
    expect(summary.conflicts).toHaveLength(1);
    expect(summary.backfilled).toBe(0);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('counts a matching stored license as already tagged (idempotent re-run)', async () => {
    const prisma = makePrisma([home({ odhLicenseNumber: '2318R' })]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any], { force: true });
    expect(summary.alreadyTagged).toBe(1);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('sends ambiguous name matches to review, never written', async () => {
    const prisma = makePrisma([home({ id: 'a' }), home({ id: 'b' })]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any], { force: true });
    expect(summary.review).toHaveLength(1);
    expect(summary.review[0].candidateIds.sort()).toEqual(['a', 'b']);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('counts roster facilities we do not list as notInDirectory (no writes)', async () => {
    const prisma = makePrisma([home()]);
    const summary = await backfillLicensesFromRoster(
      prisma,
      [row({ providerName: 'Somewhere Else Entirely', odhLicense: '9999R' }) as any],
      { force: true },
    );
    expect(summary.notInDirectory).toBe(1);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('skips rows without a parseable license and never touches demo homes', async () => {
    const demo = home({
      id: 'demo-1',
      name: 'Demo Home Cleveland',
      operator: { user: { email: 'demo.operator@carelinkai.test' } },
    });
    const prisma = makePrisma([demo]);
    const summary = await backfillLicensesFromRoster(
      prisma,
      [
        row({ odhLicense: '' }) as any,
        row({ providerName: 'Demo Home Cleveland', odhLicense: '0777R' }) as any,
      ],
      { force: true },
    );
    expect(summary.invalidRows).toBe(1);
    expect(summary.demoHomesExcluded).toBe(1);
    expect(summary.notInDirectory).toBe(1); // demo home invisible to the matcher
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('a duplicated roster row does not double-assign (second row = already tagged)', async () => {
    const prisma = makePrisma([home()]);
    const summary = await backfillLicensesFromRoster(prisma, [row() as any, row() as any], {
      force: true,
    });
    expect(summary.backfilled).toBe(1);
    expect(summary.alreadyTagged).toBe(1);
    expect(prisma.assistedLivingHome.update).toHaveBeenCalledTimes(1);
  });
});
