/**
 * /admin/analytics/funnel — OL-226 conversion funnel from the first-party, consent-gated
 * AnalyticsEvent aggregate (sanitized allowlisted props only). ADMIN only (src/app/admin/layout.tsx).
 * Rates are on unique anonymous sessions and always show their raw counts.
 */
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FUNNEL_EVENT_NAMES } from '@/lib/analytics/events';
import {
  EVENT_LABELS,
  MIN_RELIABLE_N,
  RANGE_DAYS,
  funnelRates,
  parseRangeDays,
  profileToInquiryBreakdown,
  totalsByEvent,
  type Segment,
} from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 1000) / 10}%`);

function Bar({ value }: { value: number | null }) {
  const w = value === null ? 0 : Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-2 w-full rounded-full bg-neutral-100" aria-hidden="true">
      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${w}%` }} />
    </div>
  );
}

function FewNote({ show }: { show: boolean }) {
  return show ? <p className="mt-1 text-xs text-neutral-500">Too few events for a reliable rate (n &lt; {MIN_RELIABLE_N}).</p> : null;
}

function SegmentTable({ title, rows }: { title: string; rows: Segment[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-4 shadow-card">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <ul className="mt-3 space-y-3">
        {rows.map((s) => (
          <li key={s.label} data-testid="funnel-segment">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-neutral-800">{s.label}</span>
              <span className="tabular-nums text-neutral-900">
                {pct(s.rate)} <span className="text-neutral-500">({s.submitted} / {s.views})</span>
              </span>
            </div>
            <Bar value={s.rate} />
            <FewNote show={!s.reliable} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string | string[] }> }) {
  const days = parseRangeDays((await searchParams)?.days);
  const since = new Date(Date.now() - days * 86_400_000);

  const [rows, operationalInquiries] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { name: true, anonSessionId: true, listingId: true, propsJson: true },
      take: 200_000,
    }),
    prisma.inquiry.count({ where: { createdAt: { gte: since } } }),
  ]);
  const totals = totalsByEvent(rows);
  const rates = funnelRates(rows);
  const breakdown = profileToInquiryBreakdown(rows);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6" data-testid="admin-funnel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Conversion funnel</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Consent-gated, anonymous funnel events (no names, contact details or typed text). Rates use unique sessions.
          </p>
        </div>
        <nav aria-label="Date range" className="flex gap-1 rounded-lg border border-line bg-surface-raised p-1 text-sm">
          {RANGE_DAYS.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics/funnel?days=${d}`}
              aria-current={d === days ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 ${d === days ? 'bg-primary-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="funnel-events" className="mt-6">
        <h2 id="funnel-events" className="text-base font-semibold text-neutral-900">Events</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface-raised shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
              <tr>
                <th scope="col" className="px-4 py-2">Event</th>
                <th scope="col" className="px-4 py-2 text-right">Total</th>
                <th scope="col" className="px-4 py-2 text-right">Unique sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FUNNEL_EVENT_NAMES.map((n) => (
                <tr key={n} data-testid="funnel-event-row" data-event={n}>
                  <td className="px-4 py-2 text-neutral-900">{EVENT_LABELS[n]}</td>
                  <td className="px-4 py-2 text-right tabular-nums" data-testid="funnel-total">{totals[n].total}</td>
                  <td className="px-4 py-2 text-right tabular-nums" data-testid="funnel-sessions">{totals[n].sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-neutral-700" data-testid="funnel-operational">
          Inquiries recorded (operational): <span className="font-semibold tabular-nums">{operationalInquiries}</span>{' '}
          <span className="text-neutral-500">
            vs {totals.inquiry_submitted.total} inquiry_submitted events. Operational counts every inquiry, including visitors who
            declined analytics and inquiries created outside the listing page.
          </span>
        </p>
      </section>

      <section aria-labelledby="funnel-rates" className="mt-8">
        <h2 id="funnel-rates" className="text-base font-semibold text-neutral-900">Step rates</h2>
        <ul className="mt-3 space-y-4 rounded-xl border border-line bg-surface-raised p-4 shadow-card">
          {rates.map((r) => (
            <li key={`${r.from}-${r.to}`} data-testid="funnel-rate" data-from={r.from} data-to={r.to}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-neutral-800">
                  {EVENT_LABELS[r.from]} → {EVENT_LABELS[r.to]}
                </span>
                <span className="tabular-nums text-neutral-900">
                  {pct(r.rate)} <span className="text-neutral-500">({r.numerator} / {r.denominator} sessions)</span>
                </span>
              </div>
              <Bar value={r.rate} />
              <FewNote show={!r.reliable} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="funnel-breakdown" className="mt-8">
        <h2 id="funnel-breakdown" className="text-base font-semibold text-neutral-900">Profile viewed → inquiry submitted, by what the profile showed</h2>
        <p className="mt-1 text-sm text-neutral-600">Same session and listing.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <SegmentTable title="Availability" rows={breakdown.availability} />
          <SegmentTable title="Photos" rows={breakdown.photo} />
          <SegmentTable title="Price" rows={breakdown.price} />
        </div>
      </section>
    </div>
  );
}
