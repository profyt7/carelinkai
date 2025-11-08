"use client";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Item = { id: string; type: string; severity: string };

export function IncidentsList({ residentId, items }: { residentId: string; items: Item[] }) {
  const router = useRouter();
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
  return (
    <ul className="text-sm list-disc ml-4">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2">
          <span>{i.type} (severity: {i.severity})</span>
          <button className="text-red-600 hover:underline" onClick={() => onDelete(i.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
