"use client";
import React, { useEffect, useState } from 'react';

type Item = {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
};

export function TimelinePanel({ residentId }: { residentId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/residents/${residentId}/timeline?limit=20`, { cache: 'no-store' });
      if (!r.ok) throw new Error('load');
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  return (
    <section className="card">
      <h2 className="font-semibold mb-2 text-neutral-800">Timeline</h2>
      {loading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-500">No timeline events.</div>
      ) : (
        <ul className="text-sm list-disc ml-4">
          {items.map((it) => (
            <li key={it.id}>
              <span className="font-medium">{it.title}</span>
              {it.description ? <> — {it.description}</> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
