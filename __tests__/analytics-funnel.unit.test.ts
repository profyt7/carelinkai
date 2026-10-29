/**
 * OL-226 admin funnel aggregation: totals vs unique sessions, session-based step rates with raw
 * counts, the n < 30 flag, and the profile→inquiry breakdown on the same session + listing.
 */
import { funnelRates, parseRangeDays, profileToInquiryBreakdown, totalsByEvent, type EventRow } from '@/lib/analytics/funnel';

const row = (name: string, sid: string, listingId: string | null = null, propsJson: Record<string, unknown> = {}): EventRow => ({ name, anonSessionId: sid, listingId, propsJson });

describe('admin funnel aggregation', () => {
  const rows: EventRow[] = [
    row('search_performed', 's1'), row('search_performed', 's1'), row('search_performed', 's2'),
    row('listing_clicked', 's1', 'h1'),
    row('profile_viewed', 's1', 'h1', { availability_state: 'verified', has_photo: true, has_price: true }),
    row('profile_viewed', 's2', 'h2', { availability_state: 'unverified', has_photo: false, has_price: false }),
    row('inquiry_started', 's1', 'h1'),
    row('inquiry_submitted', 's1', 'h1'),
    row('inquiry_submitted', 's2', 'h9'), // different listing than the profile viewed
  ];

  it('separates totals from unique sessions', () => {
    const t = totalsByEvent(rows);
    expect(t.search_performed).toEqual({ total: 3, sessions: 2 });
    expect(t.inquiry_submitted).toEqual({ total: 2, sessions: 2 });
    expect(t.tour_requested).toEqual({ total: 0, sessions: 0 });
  });

  it('step rates carry raw counts and flag n < 30', () => {
    const r = funnelRates(rows);
    const s2c = r.find((x) => x.from === 'search_performed')!;
    expect(s2c).toMatchObject({ numerator: 1, denominator: 2, rate: 0.5, reliable: false });
    const tour = r.find((x) => x.to === 'tour_requested')!;
    expect(tour).toMatchObject({ numerator: 0, denominator: 2, rate: 0 });
  });

  it('rates become reliable at 30 sessions', () => {
    const many = Array.from({ length: 30 }, (_, i) => row('search_performed', `s${i}`));
    expect(funnelRates(many)[0]).toMatchObject({ denominator: 30, reliable: true, rate: 0 });
  });

  it('breaks profile→inquiry down by availability / photo / price on the same session + listing', () => {
    const b = profileToInquiryBreakdown(rows);
    expect(b.availability).toEqual([
      { label: 'Verified availability', views: 1, submitted: 1, rate: 1, reliable: false },
      { label: 'Unverified availability', views: 1, submitted: 0, rate: 0, reliable: false },
    ]);
    expect(b.photo.find((s) => s.label === 'No photos')).toMatchObject({ views: 1, submitted: 0 });
  });

  it('accepts only 7 / 14 / 30 day ranges', () => {
    expect(parseRangeDays('14')).toBe(14);
    expect(parseRangeDays('365')).toBe(7);
    expect(parseRangeDays(undefined)).toBe(7);
  });
});
