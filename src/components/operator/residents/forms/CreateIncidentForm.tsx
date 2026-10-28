"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function CreateIncidentForm({ residentId }: { residentId: string }) {
  const [type, setType] = useState('Fall');
  const [severity, setSeverity] = useState('LOW');
  const [occurredAt, setOccurredAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { type, severity, occurredAt: occurredAt || new Date().toISOString() };
      const res = await fetch(`/api/residents/${residentId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      setOccurredAt('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
      <input className="border rounded px-2 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" />
      <select className="border rounded px-2 py-1 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <input className="border rounded px-2 py-1 text-sm" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      <button disabled={loading} className="btn btn-sm" type="submit">{loading ? 'Saving…' : 'Add Incident'}</button>
    </form>
  );
}
