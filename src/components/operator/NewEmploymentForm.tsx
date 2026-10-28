"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function NewEmploymentForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('Caregiver');
  const [startDate, setStartDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/operator/caregivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiverEmail: email, position, startDate: startDate || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create employment');
      }
      toast.success('Employment created');
      router.push('/operator/caregivers');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error creating employment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="form-label">Caregiver Email</label>
        <input
          type="email"
          className="form-input w-full"
          placeholder="caregiver@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="form-label">Position</label>
        <input
          type="text"
          className="form-input w-full"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="form-label">Start Date (optional)</label>
        <input
          type="date"
          className="form-input w-full"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Employment'}
        </button>
        <button type="button" className="btn" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
