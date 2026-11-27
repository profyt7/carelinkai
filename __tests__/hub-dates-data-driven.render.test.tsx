/**
 * Every /cleveland hub's page note takes its "Listings last updated" date from the listings the page
 * shows. A care-type hub that falls back to another type (no listings of its own) dates the fallback
 * listings it actually shows, and a hub with nothing to show renders no date at all.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const count = jest.fn();
const findMany = jest.fn();
const aggregate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    assistedLivingHome: {
      count: (a: unknown) => count(a),
      findMany: (a: unknown) => findMany(a),
      aggregate: (a: unknown) => aggregate(a),
    },
  },
}));

import ListingsLastUpdated from '@/components/directory/ListingsLastUpdated';
import { CARE_TYPE_PLAN, loadCareTypeListings } from '@/lib/directory/care-type-listings';

beforeEach(() => {
  count.mockReset();
  findMany.mockReset().mockResolvedValue([]);
  aggregate.mockReset();
});

it('renders the formatted date with its ISO timestamp, and nothing without a date', () => {
  const html = renderToStaticMarkup(<ListingsLastUpdated at={new Date('2026-11-25T15:00:00Z')} />);
  expect(html).toBe('<span data-testid="hub-last-updated" data-updated-at="2026-11-25T15:00:00.000Z">Listings last updated Nov 25, 2026. </span>');
  expect(renderToStaticMarkup(<ListingsLastUpdated at={null} />)).toBe('');
});

/** Care level a count() call filtered on (publicListingsWhere puts it under careLevel.has). */
const levelOf = (a: any): string | undefined => JSON.stringify(a).match(/"has":"([A-Z_]+)"/)?.[1];

it('a hub with its own listings reports its own care level', async () => {
  count.mockImplementation(async (a: any) => (levelOf(a) === 'MEMORY_CARE' ? 3 : 0));
  const r = await loadCareTypeListings(CARE_TYPE_PLAN['memory-care']);
  expect(r).toMatchObject({ shownLevel: 'MEMORY_CARE', fallback: null });
});

it('a hub on its fallback reports the fallback level (the listings it shows)', async () => {
  count.mockImplementation(async (a: any) => (levelOf(a) === 'ASSISTED' ? 5 : 0));
  const r = await loadCareTypeListings(CARE_TYPE_PLAN['nursing-homes']);
  expect(r.shownLevel).toBe('ASSISTED');
  expect(r.fallback?.label).toBe('assisted living');
  // home care has no home-based level of its own: it always dates its fallback listings.
  expect((await loadCareTypeListings(CARE_TYPE_PLAN['home-care-agencies'])).shownLevel).toBe('ASSISTED');
});

it('nothing to show → no level, so the page renders no date', async () => {
  count.mockResolvedValue(0);
  const r = await loadCareTypeListings(CARE_TYPE_PLAN['independent-living']);
  expect(r).toMatchObject({ total: 0, shownLevel: null });
});
