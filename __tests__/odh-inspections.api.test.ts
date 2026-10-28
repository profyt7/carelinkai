/**
 * Tests for GET /api/homes/[id]/inspections (OL-113) — the listing page's
 * data source for the State Inspection History section: with records, the
 * honest empty state (with and without a global data snapshot), and 404.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assistedLivingHome: { findUnique: jest.fn() },
    facilityInspection: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}));

import { GET } from '@/app/api/homes/[id]/inspections/route';
import { prisma } from '@/lib/prisma';

const mockedHome = prisma.assistedLivingHome.findUnique as jest.Mock;
const mockedFindMany = prisma.facilityInspection.findMany as jest.Mock;
const mockedAggregate = prisma.facilityInspection.aggregate as jest.Mock;

const req = () => new NextRequest('http://localhost/api/homes/home-1/inspections');

afterEach(() => jest.clearAllMocks());

describe('GET /api/homes/[id]/inspections', () => {
  it('returns records newest-first with citation detail and source link', async () => {
    mockedHome.mockResolvedValue({ id: 'home-1', odhLicenseNumber: '2318R' } as never);
    mockedFindMany.mockResolvedValue([
      {
        id: 'insp-1',
        surveyDate: new Date('2026-03-14T00:00:00Z'),
        surveyType: 'Standard',
        citationCount: 2,
        citations: [{ rule: '3701-16-09', scopeSeverity: null, summary: 'Med storage' }],
        sourceUrl: 'https://aging.ohio.gov/x',
        fetchedAt: new Date('2026-07-01T00:00:00Z'),
      },
    ] as never);
    mockedAggregate.mockResolvedValue({ _max: { fetchedAt: new Date('2026-07-01T00:00:00Z') } } as never);

    const res = await GET(req(), { params: { id: 'home-1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.odhLicenseNumber).toBe('2318R');
    expect(body.data.records).toHaveLength(1);
    expect(body.data.records[0]).toMatchObject({
      surveyDate: '2026-03-14',
      surveyType: 'Standard',
      citationCount: 2,
      sourceUrl: 'https://aging.ohio.gov/x',
    });
    expect(body.data.records[0].citations[0].rule).toBe('3701-16-09');
    expect(body.data.dataAsOf).toBe('2026-07-01T00:00:00.000Z');
    // Newest-first, bounded query.
    expect(mockedFindMany.mock.calls[0][0]).toMatchObject({
      where: { facilityId: 'home-1' },
      orderBy: { surveyDate: 'desc' },
      take: 20,
    });
  });

  it('returns the honest empty state with the global data snapshot date', async () => {
    mockedHome.mockResolvedValue({ id: 'home-1', odhLicenseNumber: null } as never);
    mockedFindMany.mockResolvedValue([] as never);
    mockedAggregate.mockResolvedValue({ _max: { fetchedAt: new Date('2026-07-01T00:00:00Z') } } as never);

    const res = await GET(req(), { params: { id: 'home-1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.records).toEqual([]);
    expect(body.data.dataAsOf).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns dataAsOf null before any ingestion has ever run', async () => {
    mockedHome.mockResolvedValue({ id: 'home-1', odhLicenseNumber: null } as never);
    mockedFindMany.mockResolvedValue([] as never);
    mockedAggregate.mockResolvedValue({ _max: { fetchedAt: null } } as never);

    const res = await GET(req(), { params: { id: 'home-1' } });
    const body = await res.json();
    expect(body.data.records).toEqual([]);
    expect(body.data.dataAsOf).toBeNull();
  });

  it('404s for an unknown home', async () => {
    mockedHome.mockResolvedValue(null as never);
    const res = await GET(req(), { params: { id: 'nope' } });
    expect(res.status).toBe(404);
  });

  it('normalizes non-array citations JSON to an empty array', async () => {
    mockedHome.mockResolvedValue({ id: 'home-1', odhLicenseNumber: null } as never);
    mockedFindMany.mockResolvedValue([
      {
        id: 'insp-1',
        surveyDate: new Date('2026-03-14T00:00:00Z'),
        surveyType: 'Unspecified',
        citationCount: 0,
        citations: null,
        sourceUrl: null,
        fetchedAt: new Date('2026-07-01T00:00:00Z'),
      },
    ] as never);
    mockedAggregate.mockResolvedValue({ _max: { fetchedAt: new Date('2026-07-01T00:00:00Z') } } as never);

    const res = await GET(req(), { params: { id: 'home-1' } });
    const body = await res.json();
    expect(body.data.records[0].citations).toEqual([]);
  });
});
