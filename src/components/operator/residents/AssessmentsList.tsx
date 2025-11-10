"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Item = { id: string; type: string; score?: number | null };

export function AssessmentsList({ residentId, items }: { residentId: string; items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ type: string; score: string }>({ type: '', score: '' });
  async function onDelete(id: string) {
    if (!confirm('Delete this assessment?')) return;
    const r = await fetch(`/api/residents/${residentId}/assessments/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Deleted');
    router.refresh();
  }
  async function onSave(id: string) {
    const body: any = {};
    if (form.type.trim()) body.type = form.type.trim();
    if (form.score.trim()) body.score = Number(form.score);
    const r = await fetch(`/api/residents/${residentId}/assessments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { toast.error('Update failed'); return; }
    toast.success('Updated');
    setEditing(null);
    router.refresh();
  }
  return (
    <ul className="text-sm list-disc ml-4">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-2">
          {editing === a.id ? (
            <div className="flex items-center gap-2">
              <input className="border rounded px-1 py-0.5 text-xs" defaultValue={a.type} onChange={(e)=>setForm((f)=>({ ...f, type: e.target.value }))} placeholder="Type" />
              <input className="border rounded px-1 py-0.5 text-xs w-20" defaultValue={a.score ?? ''} onChange={(e)=>setForm((f)=>({ ...f, score: e.target.value }))} placeholder="Score" />
              <button className="text-primary-600 hover:underline" onClick={() => onSave(a.id)}>Save</button>
              <button className="text-neutral-600 hover:underline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <span>{a.type} {a.score != null ? `(score: ${a.score})` : ''}</span>
              <button className="text-primary-600 hover:underline" onClick={() => { setEditing(a.id); setForm({ type: a.type, score: String(a.score ?? '') }); }}>Edit</button>
              <button className="text-red-600 hover:underline" onClick={() => onDelete(a.id)}>Delete</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
