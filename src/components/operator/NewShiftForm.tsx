"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Home = { id: string; name: string };

export default function NewShiftForm({ homes }: { homes: Home[] }) {
  const router = useRouter();
  const [homeId, setHomeId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeId, startTime, endTime, hourlyRate, notes }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/operator/shifts');
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || 'Failed to create shift');
    }
  };

  return (
    <form className="card max-w-xl space-y-4" onSubmit={submit}>
      <div>
        <label className="form-label">Home</label>
        <select className="form-select w-full" value={homeId} onChange={(e) => setHomeId(e.target.value)} required>
          <option value="" disabled>Select a home</option>
          {homes.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Start</label>
          <input type="datetime-local" className="form-input w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">End</label>
          <input type="datetime-local" className="form-input w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="form-label">Hourly Rate ($)</label>
        <input type="number" step="0.01" min="0" className="form-input w-full" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
      </div>
      <div>
        <label className="form-label">Notes</label>
        <textarea className="form-textarea w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={() => router.push('/operator/shifts')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Shift'}</button>
      </div>
    </form>
  );
}
