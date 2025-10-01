"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function EditHomePage() {
  const router = useRouter();
  const params = useParams() as Record<string, string>;
  const id = params['id'];
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    amenities: '' as string,
    priceMin: '' as string,
    priceMax: '' as string,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/operator/homes/${id}`);
        if (res.ok) {
          const { data } = await res.json();
          if (mounted && data) {
            setForm({
              name: data.name || '',
              description: data.description || '',
              capacity: data.capacity || 0,
              amenities: Array.isArray(data.amenities) ? data.amenities.join(', ') : '',
              priceMin: data.priceMin ?? '',
              priceMax: data.priceMax ?? '',
            } as any);
          }
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: form.name || undefined,
        description: form.description || undefined,
        capacity: Number(form.capacity) || undefined,
        amenities: form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        priceMin: form.priceMin ? Number(form.priceMin) : undefined,
        priceMax: form.priceMax ? Number(form.priceMax) : undefined,
      };
      const res = await fetch(`/api/operator/homes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Home updated');
      router.push(`/operator/homes/${id}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    }
  };

  return (
    <DashboardLayout title="Edit Home" showSearch={false}>
      <div className="p-6 max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input className="form-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-textarea w-full" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Capacity</label>
            <input type="number" className="form-input w-full" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="form-label">Amenities (comma separated)</label>
            <input className="form-input w-full" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Price Min</label>
              <input type="number" step="0.01" className="form-input w-full" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Price Max</label>
              <input type="number" step="0.01" className="form-input w-full" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
