"use client";
import React, { useCallback, useEffect, useState } from 'react';

type Item = {
  id: string;
  type: string;
  title: string;
  status: 'OPEN'|'COMPLETED';
  dueDate?: string | null;
  severity?: string | null;
};

export function CompliancePanel({ residentId }: { residentId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<{open:number;completed:number;dueSoon:number;overdue:number}>({ open: 0, completed: 0, dueSoon: 0, overdue: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('CARE_PLAN_REVIEW');
  const [dueDate, setDueDate] = useState<string>('');

  // Assumption: load is stable via useCallback to satisfy exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, sumRes] = await Promise.all([
        fetch(`/api/residents/${residentId}/compliance`, { cache: 'no-store' }),
        fetch(`/api/residents/${residentId}/compliance/summary`, { cache: 'no-store' }),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }
      if (sumRes.ok) setSummary(await sumRes.json());
      // In dev/e2e, if summary fails due to auth or timing, keep zeroed summary to avoid empty UI
    } finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/residents/${residentId}/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined }),
      });
      if (res.ok) {
        setTitle(''); setDueDate('');
        await load();
      }
    } finally { setSubmitting(false); }
  }

  async function markComplete(id: string) {
    await fetch(`/api/residents/${residentId}/compliance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', completedAt: new Date().toISOString() }),
    });
    await load();
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-neutral-800">Compliance</h2>
        {summary && (
          <div className="text-xs text-neutral-600 flex gap-3">
            <span>Open: {summary.open}</span>
            <span>Due soon: {summary.dueSoon}</span>
            <span>Overdue: <span className="text-red-600 font-medium">{summary.overdue}</span></span>
            <span>Completed: {summary.completed}</span>
          </div>
        )}
      </div>
      <form onSubmit={addItem} className="flex items-end gap-2 mb-3">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Type</label>
          <select className="border rounded px-2 py-1 text-sm" value={type} onChange={e=>setType(e.target.value)}>
            <option value="CARE_PLAN_REVIEW">Care Plan Review</option>
            <option value="TB_TEST">TB Test</option>
            <option value="FLU_SHOT">Flu Shot</option>
            <option value="MEDICATION_REVIEW">Medication Review</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="compliance-title" className="block text-xs text-neutral-600 mb-1">Title</label>
          <input id="compliance-title" className="border rounded px-2 py-1 text-sm w-full" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Q4 Care Plan Review" />
        </div>
        <div>
          <label htmlFor="compliance-due" className="block text-xs text-neutral-600 mb-1">Due date</label>
          <input id="compliance-due" type="date" className="border rounded px-2 py-1 text-sm" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
        </div>
        <button className="btn btn-sm" type="submit" disabled={!title.trim() || submitting}>Add</button>
      </form>
      <ul className="divide-y divide-neutral-100">
        {items.map((it) => (
          <li key={it.id} className="py-2 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-neutral-800">{it.title}</div>
              <div className="text-neutral-600 text-xs">{it.type}{it.dueDate ? ` • due ${new Date(it.dueDate).toLocaleDateString()}` : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${it.status==='OPEN'?'bg-amber-50 text-amber-700':'bg-green-50 text-green-700'}`}>{it.status}</span>
              {it.status==='OPEN' && (
                <button className="btn btn-xs" onClick={() => markComplete(it.id)}>Mark complete</button>
              )}
            </div>
          </li>
        ))}
        {items.length===0 && <li className="py-4 text-sm text-neutral-500">No compliance items.</li>}
      </ul>
    </section>
  );
}
