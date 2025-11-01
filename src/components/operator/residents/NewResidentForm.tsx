"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function NewResidentForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [familyId, setFamilyId] = useState('');
  const [homeId, setHomeId] = useState('');
  const [status, setStatus] = useState('INQUIRY');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, dateOfBirth, gender, familyId, homeId: homeId || null, status }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      router.push(`/operator/residents/${json.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className="border rounded px-2 py-1" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <input className="border rounded px-2 py-1" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="date" className="border rounded px-2 py-1" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
        <select className="border rounded px-2 py-1" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
        <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="INQUIRY">Inquiry</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className="border rounded px-2 py-1" placeholder="Family ID" value={familyId} onChange={(e) => setFamilyId(e.target.value)} required />
        <input className="border rounded px-2 py-1" placeholder="Home ID (optional)" value={homeId} onChange={(e) => setHomeId(e.target.value)} />
      </div>
      <div>
        <button disabled={loading} className="btn" type="submit">{loading ? 'Creating…' : 'Create Resident'}</button>
      </div>
    </form>
  );
}
