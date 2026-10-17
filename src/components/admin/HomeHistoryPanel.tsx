'use client';

/**
 * Read-only "History" panel for the admin home detail page (sprint W5-1).
 * Lists the home's EntityEvent rows newest first. Values are already PHI-safe
 * (IDs, statuses, counts, payer lane, care level, ZIP) — rendered as-is.
 */

import { useEffect, useState } from 'react';

type EventRow = {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  field: string | null;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  actorRole: string | null;
  occurredAt: string;
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'object') return String(v);
  return JSON.stringify(v);
}

export default function HomeHistoryPanel({ homeId }: { homeId: string }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/homes/${homeId}/events`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || 'Failed to load history');
        if (alive) setEvents(Array.isArray(j.events) ? j.events : []);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [homeId]);

  return (
    <div data-testid="home-history">
      <h3 className="text-lg font-semibold text-neutral-900 mb-1">History</h3>
      <p className="text-sm text-neutral-500 mb-4">
        Every recorded change to this listing, newest first. Append-only — nothing here can be edited or deleted.
      </p>
      {error && <p className="text-sm text-error-700">{error}</p>}
      {events === null && !error && <p className="text-sm text-neutral-500">Loading…</p>}
      {events && events.length === 0 && <p className="text-sm text-neutral-500" data-testid="home-history-empty">No history recorded yet.</p>}
      {events && events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Field</th>
                <th className="py-2 pr-4">From</th>
                <th className="py-2 pr-4">To</th>
                <th className="py-2 pr-4">Source</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100 align-top" data-testid="home-history-row" data-event-type={e.eventType} data-source={e.source}>
                  <td className="py-2 pr-4 whitespace-nowrap text-neutral-600">{new Date(e.occurredAt).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-medium text-neutral-900">
                    {e.eventType}
                    <div className="text-xs text-neutral-500">{e.entityType}</div>
                  </td>
                  <td className="py-2 pr-4 text-neutral-700">{e.field ?? '—'}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-700 break-all" data-testid="home-history-old">{fmt(e.oldValue)}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-900 break-all" data-testid="home-history-new">{fmt(e.newValue)}</td>
                  <td className="py-2 pr-4 text-neutral-700">
                    {e.source}
                    {e.actorRole ? <div className="text-xs text-neutral-500">{e.actorRole}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
