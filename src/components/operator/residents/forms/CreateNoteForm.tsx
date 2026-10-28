"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function CreateNoteForm({ residentId }: { residentId: string }) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'INTERNAL' | 'CARE_TEAM' | 'FAMILY'>('INTERNAL');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/residents/${residentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility }),
      });
      if (!res.ok) throw new Error('Failed');
      setContent('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        className="border rounded p-2 text-sm"
        placeholder="Add a note"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <div className="flex items-center gap-2">
        <select className="border rounded px-2 py-1 text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
          <option value="INTERNAL">Internal</option>
          <option value="CARE_TEAM">Care team</option>
          <option value="FAMILY">Family-visible</option>
        </select>
        <button disabled={loading} className="btn btn-sm" type="submit">{loading ? 'Saving…' : 'Add Note'}</button>
      </div>
    </form>
  );
}
