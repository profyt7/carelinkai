"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Caregiver = { id: string; name: string };

export default function AssignShiftForm({ shiftId, caregivers, initialCaregiverId }: { shiftId: string; caregivers: Caregiver[]; initialCaregiverId?: string | null }) {
  const router = useRouter();
  const [caregiverId, setCaregiverId] = useState(initialCaregiverId ?? '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/operator/shifts/${shiftId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caregiverId: caregiverId || null }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/operator/shifts');
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || 'Failed to update assignment');
    }
  };

  return (
    <form className="card max-w-xl space-y-4" onSubmit={submit}>
      <div>
        <label className="form-label">Assign to Caregiver</label>
        <select className="form-select w-full" value={caregiverId} onChange={(e) => setCaregiverId(e.target.value)}>
          <option value="">Unassigned</option>
          {caregivers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={() => router.push('/operator/shifts')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}
