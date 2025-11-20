"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function CreateAssessmentForm({ residentId }: { residentId: string }) {
  const [type, setType] = useState('MMSE');
  const [score, setScore] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/residents/${residentId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Explicitly include credentials to ensure auth cookies are sent in CI/e2e
        credentials: 'include',
        body: JSON.stringify({ type, score: score === '' ? null : Number(score) }),
      });
      if (!res.ok) throw new Error('Failed');
      setScore('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
      <input className="border rounded px-2 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" />
      <input className="border rounded px-2 py-1 text-sm w-24" value={score} onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Score" />
      <button disabled={loading} className="btn btn-sm" type="submit">{loading ? 'Saving…' : 'Add Assessment'}</button>
    </form>
  );
}
