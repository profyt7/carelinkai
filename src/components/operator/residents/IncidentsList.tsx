"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Item = { id: string; type: string; severity: string };

export function IncidentsList({ residentId, items }: { residentId: string; items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ type: string; severity: string }>({ type: '', severity: '' });
  async function onDelete(id: string) {
    if (!confirm('Delete this incident?')) return;
    const r = await fetch(`/api/residents/${residentId}/incidents/${id}`, { method: 'DELETE' });
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
    if (form.severity.trim()) body.severity = form.severity.trim();
    const r = await fetch(`/api/residents/${residentId}/incidents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { toast.error('Update failed'); return; }
    toast.success('Updated');
    setEditing(null);
    router.refresh();
  }
  return (
    <ul className="text-sm list-disc ml-4">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2">
          {editing === i.id ? (
            <div className="flex items-center gap-2">
              <input className="border rounded px-1 py-0.5 text-xs" defaultValue={i.type} onChange={(e)=>setForm((f)=>({ ...f, type: e.target.value }))} placeholder="Type" />
              <input className="border rounded px-1 py-0.5 text-xs w-28" defaultValue={i.severity} onChange={(e)=>setForm((f)=>({ ...f, severity: e.target.value }))} placeholder="Severity" />
              <button className="text-primary-600 hover:underline" onClick={() => onSave(i.id)}>Save</button>
              <button className="text-neutral-600 hover:underline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <span>{i.type} (severity: {i.severity})</span>
              <button className="text-primary-600 hover:underline" onClick={() => { setEditing(i.id); setForm({ type: i.type, severity: i.severity }); }}>Edit</button>
              <button className="text-red-600 hover:underline" onClick={() => onDelete(i.id)}>Delete</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
