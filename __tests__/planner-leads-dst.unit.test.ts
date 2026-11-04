/** plannerLeadsPerDay always returns exactly `days` consecutive calendar days, including across DST changes. */
import { plannerLeadsPerDay } from '@/lib/leads/inbound-lead-daily';

describe('plannerLeadsPerDay across DST', () => {
  it.each([
    ['fall back, 23:30 EST (the e2e failure window)', '2026-11-04T04:30:00Z', '2026-11-03'],
    ['fall back, midday', '2026-11-04T17:00:00Z', '2026-11-04'],
    ['spring forward, 23:30 EDT', '2026-03-12T03:30:00Z', '2026-03-11'],
    ['no DST nearby', '2026-07-15T12:00:00Z', '2026-07-15'],
  ])('%s → 14 consecutive days ending today (ET)', (_n, nowIso, today) => {
    const { days } = plannerLeadsPerDay([], new Date(nowIso));
    expect(days).toHaveLength(14);
    expect(days[13].date).toBe(today);
    for (let i = 1; i < 14; i++) {
      expect(Date.parse(days[i].date) - Date.parse(days[i - 1].date)).toBe(86_400_000);
    }
  });
  it('counts a lead on the oldest and newest day', () => {
    const now = new Date('2026-11-04T04:30:00Z');
    const r = plannerLeadsPerDay(['2026-10-21T16:00:00Z', '2026-11-04T04:00:00Z', '2026-10-20T16:00:00Z'], now);
    expect(r.days[0]).toEqual({ date: '2026-10-21', count: 1 });
    expect(r.days[13]).toEqual({ date: '2026-11-03', count: 1 });
    expect(r.total).toBe(2);
  });
});
