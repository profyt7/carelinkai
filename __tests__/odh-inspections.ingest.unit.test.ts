/**
 * Unit tests for the ODH ingest core (OL-113): input parsing, record
 * sanitization, and the write behavior — dry-run writes nothing, REVIEW rows
 * are never written, license numbers are learned on confirmed name+city matches.
 */

import { jest } from '@jest/globals';
import { ingestOdhRecords, parseOdhInput, sanitizeRecord } from '@/lib/inspections/ingest';
import type { OdhSurveyRecord } from '@/lib/inspections/matcher';

describe('parseOdhInput', () => {
  it('parses a JSON array', () => {
    const records = parseOdhInput(
      JSON.stringify([{ facilityName: 'A', surveyDate: '2026-01-02', citationCount: 1 }]),
    );
    expect(records).toHaveLength(1);
    expect(records[0].facilityName).toBe('A');
  });

  it('parses CSV with quoted fields and JSON-encoded citations', () => {
    const csv = [
      'licenseNumber,facilityName,city,surveyDate,surveyType,citationCount,citations,sourceUrl',
      `2318R,"Maple Grove, LLC",Cleveland,2026-03-14,Standard,2,"[{""rule"":""3701-16-09"",""summary"":""Med storage""}]",https://aging.ohio.gov/x`,
      '0592R,Other Place,Akron,2026-02-01,Complaint,0,,',
    ].join('\n');
    const records = parseOdhInput(csv);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      licenseNumber: '2318R',
      facilityName: 'Maple Grove, LLC',
      city: 'Cleveland',
      citationCount: 2,
    });
    expect(records[0].citations?.[0].rule).toBe('3701-16-09');
    expect(records[1]).toMatchObject({ surveyType: 'Complaint', citations: null, sourceUrl: null });
  });

  it('rejects CSV without required columns and handles empty input', () => {
    expect(() => parseOdhInput('foo,bar\n1,2')).toThrow(/facilityName and surveyDate/);
    expect(parseOdhInput('')).toEqual([]);
  });
});

describe('sanitizeRecord', () => {
  const base: OdhSurveyRecord = { facilityName: 'A', surveyDate: '2026-03-14' };

  it('rejects missing name, unparseable and future survey dates', () => {
    expect(sanitizeRecord({ ...base, facilityName: ' ' })).toBeNull();
    expect(sanitizeRecord({ ...base, surveyDate: 'not-a-date' })).toBeNull();
    expect(sanitizeRecord({ ...base, surveyDate: '2199-01-01' })).toBeNull();
  });

  it('derives citationCount from citations when absent and normalizes surveyType', () => {
    const rec = sanitizeRecord({ ...base, citations: [{ summary: 'x' }, { summary: 'y' }] });
    expect(rec?.citationCount).toBe(2);
    expect(rec?.surveyType).toBe('Unspecified');
  });

  it('drops non-http sourceUrls', () => {
    expect(sanitizeRecord({ ...base, sourceUrl: 'javascript:alert(1)' })?.sourceUrl).toBeNull();
    expect(sanitizeRecord({ ...base, sourceUrl: 'https://aging.ohio.gov/x' })?.sourceUrl).toBe(
      'https://aging.ohio.gov/x',
    );
  });
});

// --- ingestOdhRecords with a stubbed Prisma client ------------------------

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

const realHome = {
  id: 'home-1',
  name: 'Maple Grove Assisted Living',
  description: 'Real facility',
  odhLicenseNumber: null,
  address: { city: 'Cleveland', state: 'OH' },
  operator: { user: { email: 'ops@example.com' } },
};

const demoHome = {
  id: 'demo-1',
  name: 'Demo Home Cleveland',
  description: 'demo',
  odhLicenseNumber: '111R',
  address: { city: 'Cleveland', state: 'OH' },
  operator: { user: { email: 'demo.operator@carelinkai.test' } },
};

const baseRecord: OdhSurveyRecord = {
  licenseNumber: '2318R',
  facilityName: 'Maple Grove Assisted Living',
  city: 'Cleveland',
  surveyDate: '2026-03-14',
  surveyType: 'Standard',
  citationCount: 1,
  citations: [{ rule: '3701-16-09', summary: 'Example' }],
  sourceUrl: 'https://aging.ohio.gov/x',
};

describe('ingestOdhRecords', () => {
  it('dry-run (default) writes nothing but reports what it would do', async () => {
    const prisma = makePrisma([realHome]);
    const summary = await ingestOdhRecords(prisma, [baseRecord]);
    expect(summary.dryRun).toBe(true);
    expect(summary.matchedByNameCity).toBe(1);
    expect(summary.upserted).toBe(1); // "would upsert"
    expect(summary.licenseBackfills).toBe(1); // "would backfill"
    expect(prisma.facilityInspection.upsert).not.toHaveBeenCalled();
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('force mode upserts on the (facility, surveyDate, surveyType) key and backfills the learned license', async () => {
    const prisma = makePrisma([realHome]);
    const summary = await ingestOdhRecords(prisma, [baseRecord], { force: true });
    expect(summary.upserted).toBe(1);
    expect(prisma.facilityInspection.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = (prisma.facilityInspection.upsert as jest.Mock).mock.calls[0][0] as any;
    expect(upsertArg.where.facilityId_surveyDate_surveyType).toMatchObject({
      facilityId: 'home-1',
      surveyType: 'Standard',
    });
    expect(upsertArg.create.citationCount).toBe(1);
    // Confirmed name+city match learns the license for future license-based runs.
    expect(prisma.assistedLivingHome.update).toHaveBeenCalledWith({
      where: { id: 'home-1' },
      data: { odhLicenseNumber: '2318R' },
    });
  });

  it('REVIEW rows are reported and never written', async () => {
    const twin = { ...realHome, id: 'home-2' };
    const prisma = makePrisma([realHome, twin]);
    const summary = await ingestOdhRecords(prisma, [baseRecord], { force: true });
    expect(summary.review).toHaveLength(1);
    expect(summary.review[0].candidateIds.sort()).toEqual(['home-1', 'home-2']);
    expect(summary.upserted).toBe(0);
    expect(prisma.facilityInspection.upsert).not.toHaveBeenCalled();
  });

  it('demo homes are excluded from candidates (counted, never matched)', async () => {
    const prisma = makePrisma([demoHome]);
    const summary = await ingestOdhRecords(
      prisma,
      [{ ...baseRecord, facilityName: 'Demo Home Cleveland', licenseNumber: '111R' }],
      { force: true },
    );
    expect(summary.demoHomesExcluded).toBe(1);
    expect(summary.noMatch).toBe(1);
    expect(prisma.facilityInspection.upsert).not.toHaveBeenCalled();
  });

  it('a license learned earlier in the run matches later records in the same file', async () => {
    const prisma = makePrisma([realHome]);
    const second: OdhSurveyRecord = {
      ...baseRecord,
      facilityName: 'MAPLE GROVE ASSISTED LIVING LLC (license row name)',
      city: null, // would be REVIEW by name — must match via the learned license
      surveyDate: '2025-11-02',
      surveyType: 'Complaint',
    };
    const summary = await ingestOdhRecords(prisma, [baseRecord, second], { force: true });
    expect(summary.matchedByNameCity).toBe(1);
    expect(summary.matchedByLicense).toBe(1);
    expect(summary.upserted).toBe(2);
  });

  it('counts invalid records without writing', async () => {
    const prisma = makePrisma([realHome]);
    const summary = await ingestOdhRecords(prisma, [{ ...baseRecord, surveyDate: 'garbage' }], {
      force: true,
    });
    expect(summary.invalidRecords).toBe(1);
    expect(prisma.facilityInspection.upsert).not.toHaveBeenCalled();
  });
});
