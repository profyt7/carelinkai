"use client";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Item = { id: string; type: string; score?: number | null };

export function AssessmentsList({ residentId, items }: { residentId: string; items: Item[] }) {
  const router = useRouter();
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
  return (
    <ul className="text-sm list-disc ml-4">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-2">
          <span>{a.type} {a.score != null ? `(score: ${a.score})` : ''}</span>
          <button className="text-red-600 hover:underline" onClick={() => onDelete(a.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
