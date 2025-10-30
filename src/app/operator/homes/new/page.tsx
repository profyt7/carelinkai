"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";

export default function NewHomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    careLevel: ["ASSISTED"],
    capacity: 30,
    priceMin: 3500,
    priceMax: 4800,
    address: { street: "", street2: "", city: "", state: "", zipCode: "" },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed: ${res.status}`);
      }
      router.push("/operator/homes");
    } catch (err: any) {
      setError(err.message || "Failed to create home");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Add Home" showSearch={false}>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          {error && (
            <div className="alert alert-error">{error}</div>
          )}
          <div>
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Care Level</label>
            <select
              className="form-select"
              value={form.careLevel[0]}
              onChange={(e) => setForm({ ...form, careLevel: [e.target.value] })}
            >
              {['INDEPENDENT','ASSISTED','MEMORY_CARE','SKILLED_NURSING'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Capacity</label>
              <input type="number" className="form-input" value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="form-label">Price Min</label>
              <input type="number" className="form-input" value={form.priceMin as number}
                onChange={(e) => setForm({ ...form, priceMin: Number(e.target.value) })} />
            </div>
            <div>
              <label className="form-label">Price Max</label>
              <input type="number" className="form-input" value={form.priceMax as number}
                onChange={(e) => setForm({ ...form, priceMax: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Street</label>
              <input className="form-input" value={form.address.street}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} required />
            </div>
            <div>
              <label className="form-label">Street 2</label>
              <input className="form-input" value={form.address.street2}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street2: e.target.value } })} />
            </div>
            <div>
              <label className="form-label">City</label>
              <input className="form-input" value={form.address.city}
                onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} required />
            </div>
            <div>
              <label className="form-label">State</label>
              <input className="form-input" value={form.address.state}
                onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} required />
            </div>
            <div>
              <label className="form-label">Zip</label>
              <input className="form-input" value={form.address.zipCode}
                onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })} required />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Home'}
            </button>
            <button type="button" className="btn" onClick={() => router.back()} disabled={submitting}>Cancel</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
