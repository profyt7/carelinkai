/**
 * Concierge shortlist, manual curation (fix/concierge-manual-shortlist).
 * A family request from /concierge has no stored AI matches. The admin can still:
 *  - add public homes by name / city / ZIP, remove and reorder them, and save the shortlist;
 *  - run "Suggest homes near {ZIP}" on demand, which stores candidates like a DP search;
 *  - set each home's availability label (default unconfirmed unless currently verified);
 * and once the shortlist is saved, "Send payment link" works. The shortlist stays hidden until paid + released.
 */
import { NextRequest } from 'next/server';

const db: { search: any; homes: any[]; order: any } = { search: null, homes: [], order: null };

jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn(async () => ({ id: 'admin-1', role: 'ADMIN' })) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/services/notifications', () => ({ createInAppNotification: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock('@/lib/concierge/facility-response-engine', () => ({ createFacilityResponsesForShortlist: jest.fn(async () => []), markAdmitted: jest.fn(), FACILITY_RESPONSE_SELECT: { id: true } }));
jest.mock('@/lib/email', () => ({
  sendConciergeShortlistReadyEmail: jest.fn(),
  sendConciergeFamilyEmail: jest.fn().mockResolvedValue(true),
  sendConciergePaidNotification: jest.fn().mockResolvedValue(true),
  sendConciergeAdminNotice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/prisma', () => {
  const matchesWhere = (h: any, where: any): boolean => {
    if (!where) return true;
    if (where.status && h.status !== where.status) return false;
    if (where.isDemo === false && h.isDemo) return false;
    if (where.id?.in && !where.id.in.includes(h.id)) return false;
    if (where.address?.zipCode?.startsWith && !h.address.zipCode.startsWith(where.address.zipCode.startsWith)) return false;
    if (where.careLevel?.hasSome && !where.careLevel.hasSome.some((c: string) => h.careLevel.includes(c))) return false;
    if (where.OR) {
      return where.OR.some((o: any) =>
        (o.name?.contains && h.name.toLowerCase().includes(o.name.contains.toLowerCase())) ||
        (o.address?.city?.contains && h.address.city.toLowerCase().includes(o.address.city.contains.toLowerCase())) ||
        (o.address?.zipCode?.startsWith && h.address.zipCode.startsWith(o.address.zipCode.startsWith)));
    }
    return true;
  };
  const p: any = {
    placementSearch: {
      findUnique: jest.fn(async () => db.search),
      update: jest.fn(async ({ data }: any) => { db.search = { ...db.search, ...data }; return db.search; }),
    },
    assistedLivingHome: {
      findMany: jest.fn(async ({ where, take }: any) => db.homes.filter((h) => matchesWhere(h, where)).slice(0, take ?? 100)),
    },
    conciergeOrder: {
      findUnique: jest.fn(async () => (db.order ? { ...db.order, placementSearch: { id: db.search.id, conciergeStatus: db.search.conciergeStatus, curatedHomes: db.search.curatedHomes } } : null)),
      update: jest.fn(async ({ data }: any) => { db.order = { ...db.order, ...data }; return db.order; }),
    },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});

import { PATCH } from '@/app/api/admin/concierge/[id]/route';
import { GET as searchHomes } from '@/app/api/admin/concierge/homes/route';
import { defaultAvailabilityLabel, searchPublicHomes } from '@/lib/concierge/manual-shortlist';
import { sendPaymentLink } from '@/lib/concierge/pay-when-ready';
import { isShortlistVisibleToFamily } from '@/lib/concierge/shortlist-token';

const fresh = new Date();
const stale = new Date(Date.now() - 400 * 24 * 3600 * 1000);
const home = (id: string, name: string, city: string, zip: string, over: Record<string, unknown> = {}) => ({
  id, name, status: 'ACTIVE', isDemo: false, careLevel: ['ASSISTED'], description: '', amenities: [], priceMin: null, capacity: 20, currentOccupancy: 10,
  availabilityCount: null, availabilityVerifiedAt: null, availabilitySource: null,
  address: { street: '1 Main St', city, state: 'OH', zipCode: zip },
  operator: { user: { email: 'directory-unclaimed@carelinkai.system', phone: null } },
  ...over,
});

const patch = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/admin/concierge/ps-1', { method: 'PATCH', body: JSON.stringify(body) }), { params: { id: 'ps-1' } });

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
  process.env.CONCIERGE_PAYMENT_LINK_URL = 'https://buy.stripe.com/test_manual';
  db.homes = [
    home('h-maple', 'Maple Grove', 'Lakewood', '44107'),
    home('h-oak', 'Oak Terrace', 'Parma', '44129', { availabilityCount: 2, availabilityVerifiedAt: fresh, availabilitySource: 'OPERATOR' }),
    home('h-pine', 'Pine Court', 'Akron', '44303', { availabilityVerifiedAt: stale, availabilityCount: 1 }),
    home('h-demo', 'Maple Demo', 'Lakewood', '44107', { isDemo: true }),
    home('h-draft', 'Maple Draft', 'Lakewood', '44107', { status: 'DRAFT' }),
  ];
  db.search = {
    id: 'ps-1', isConcierge: true, userId: 'sys', source: 'concierge_page', user: { email: null },
    queryText: 'Family concierge request (private pay)', careLevel: 'Assisted living', intakeZip: '44107',
    patientInfo: { location: 'Lakewood, OH 44107' }, searchResults: { matches: [] }, conciergeStatus: 'SUBMITTED', curatedHomes: null,
  };
  db.order = { id: 'ordmanual01', status: 'REQUESTED_UNPAID', email: 'fam@example.test', amountCents: 39900, paymentLinkUrl: null, paymentLinkSentAt: null, shortlistReleasedAt: null, paymentReminderSentAt: null, expiredAt: null };
});

describe('Add a home: public homes by name, city or ZIP', () => {
  it('top 10, public only (no demo, no draft), and the default availability label', async () => {
    expect((await searchPublicHomes('maple')).map((h) => h.homeId)).toEqual(['h-maple']);
    expect((await searchPublicHomes('parma')).map((h) => h.homeId)).toEqual(['h-oak']);
    expect((await searchPublicHomes('441')).map((h) => h.homeId).sort()).toEqual(['h-maple', 'h-oak']);
    expect(await searchPublicHomes('m')).toEqual([]);
    const [oak] = await searchPublicHomes('oak');
    expect(oak).toMatchObject({ homeName: 'Oak Terrace', defaultAvailabilityLabel: 'verified' });
    expect((await searchPublicHomes('pine'))[0]!.defaultAvailabilityLabel).toBe('unconfirmed'); // stale → unconfirmed
    const res = await searchHomes(new NextRequest('http://localhost/api/admin/concierge/homes?q=maple'));
    expect((await res.json()).homes.map((h: any) => h.homeId)).toEqual(['h-maple']);
  });

  it('defaultAvailabilityLabel: unconfirmed unless current availability is verified', () => {
    expect(defaultAvailabilityLabel({ availabilityVerifiedAt: fresh, availabilityCount: 1 })).toBe('verified');
    expect(defaultAvailabilityLabel({ availabilityVerifiedAt: stale })).toBe('unconfirmed');
    expect(defaultAvailabilityLabel({})).toBe('unconfirmed');
  });
});

describe('save with zero stored matches', () => {
  it('add two homes, save in order; then remove one and save again', async () => {
    let res = await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-oak' }, { homeId: 'h-maple', availabilityLabel: 'verified', confirmedAvailability: 'Called 11/1: 1 bed' }], conciergeNote: 'Two good fits' });
    expect(res.status).toBe(200);
    expect(db.search.conciergeStatus).toBe('SHORTLIST_READY');
    expect(db.search.curatedHomes.map((h: any) => [h.homeId, h.name, h.availabilityLabel])).toEqual([
      ['h-oak', 'Oak Terrace', 'verified'], // currently verified → default verified
      ['h-maple', 'Maple Grove', 'verified'], // the admin verified it by phone
    ]);
    res = await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-maple' }] });
    expect(res.status).toBe(200);
    expect(db.search.curatedHomes).toEqual([expect.objectContaining({ homeId: 'h-maple', availabilityLabel: 'unconfirmed', address: '1 Main St, Lakewood, OH 44107' })]);
  });

  it('reordering is the order the admin sends', async () => {
    await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-maple' }, { homeId: 'h-oak' }, { homeId: 'h-pine' }] });
    expect(db.search.curatedHomes.map((h: any) => h.homeId)).toEqual(['h-maple', 'h-oak', 'h-pine']);
    await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-pine' }, { homeId: 'h-maple' }, { homeId: 'h-oak' }] });
    expect(db.search.curatedHomes.map((h: any) => h.homeId)).toEqual(['h-pine', 'h-maple', 'h-oak']);
  });

  it('an empty shortlist or a bad label is refused', async () => {
    expect((await patch({ action: 'respond', curatedHomes: [] })).status).toBe(400);
    expect((await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-oak', availabilityLabel: 'guaranteed' }] })).status).toBe(400);
  });
});

describe('Suggest homes near {ZIP}: matching on demand', () => {
  it('stores candidates in searchResults.matches like a DP search (public homes in the ZIP area, care level first)', async () => {
    const res = await patch({ action: 'suggest' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, count: 2, near: '44107' });
    const matches = db.search.searchResults.matches;
    expect(matches.map((m: any) => m.homeId)).toEqual(['h-oak', 'h-maple']); // verified availability first (no AI key)
    expect(matches[0]).toMatchObject({ homeName: 'Oak Terrace', address: '1 Main St, Parma, OH 44129', availableBeds: null, isUnclaimed: true });
    expect(matches[0].contactEmail).toBeUndefined(); // never the directory sentinel
    expect(db.search.searchResults.suggestedNear).toBe('44107');
    expect(db.search.conciergeStatus).toBe('SUBMITTED'); // suggesting does not save a shortlist
  });

  it('refuses when matches are already stored', async () => {
    db.search.searchResults = { matches: [{ homeId: 'h-maple' }] };
    expect((await patch({ action: 'suggest' })).status).toBe(409);
  });
});

describe('saving enables Send payment link; the shortlist stays hidden until paid and released', () => {
  it('before saving: refused; after saving: the link goes out; the family still sees nothing', async () => {
    const actor = { userId: 'admin-1', role: 'ADMIN' };
    expect(await sendPaymentLink({ orderId: 'ordmanual01', actor })).toMatchObject({ ok: false, code: 409 });
    await patch({ action: 'respond', curatedHomes: [{ homeId: 'h-maple' }] });
    expect(await sendPaymentLink({ orderId: 'ordmanual01', actor })).toMatchObject({ ok: true });
    expect(db.order.paymentLinkUrl).toContain('client_reference_id=ordmanual01');
    expect(isShortlistVisibleToFamily(db.order)).toBe(false);
  });
});
