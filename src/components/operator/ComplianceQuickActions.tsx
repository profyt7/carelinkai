"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Home = { id: string; name: string };

export default function ComplianceQuickActions({ homes }: { homes: Home[] }) {
  const router = useRouter();
  const [homeId, setHomeId] = useState<string>(homes[0]?.id || "");
  const [submitting, setSubmitting] = useState<null | "license" | "inspection">(null);

  const createLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!homeId) {
      toast.error("Select a home first");
      return;
    }
    try {
      setSubmitting("license");
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/operator/homes/${homeId}/licenses`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to create license");
      toast.success("License created");
      e.currentTarget.reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error creating license");
    } finally {
      setSubmitting(null);
    }
  };

  const createInspection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!homeId) {
      toast.error("Select a home first");
      return;
    }
    try {
      setSubmitting("inspection");
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/operator/homes/${homeId}/inspections`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to create inspection");
      toast.success("Inspection created");
      e.currentTarget.reset();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error creating inspection");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="card">
      <div className="font-medium mb-3">Quick Actions</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="form-label">Home</label>
              <select className="form-select w-full" value={homeId} onChange={(e) => setHomeId(e.target.value)}>
                {homes.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
                {homes.length === 0 && <option value="">No homes available</option>}
              </select>
            </div>
          </div>

          <form onSubmit={createLicense} className="space-y-2">
            <div className="text-sm font-medium">Add License</div>
            <div className="grid grid-cols-2 gap-2">
              <input name="type" placeholder="Type" className="form-input" required />
              <input name="licenseNumber" placeholder="License #" className="form-input" required />
              <input name="issueDate" type="date" className="form-input" required />
              <input name="expirationDate" type="date" className="form-input" required />
              <input name="status" placeholder="Status" className="form-input" defaultValue="ACTIVE" />
              <input name="file" type="file" accept="application/pdf,image/*" className="form-input col-span-2" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!homeId || submitting === "license"}>
              {submitting === "license" ? "Creating..." : "Create License"}
            </button>
          </form>
        </div>

        <form onSubmit={createInspection} className="space-y-2">
          <div className="text-sm font-medium">Add Inspection</div>
          <div className="grid grid-cols-2 gap-2">
            <input name="inspectionType" placeholder="Type" className="form-input" required />
            <input name="inspector" placeholder="Inspector" className="form-input" required />
            <input name="inspectionDate" type="date" className="form-input" required />
            <input name="result" placeholder="Result" className="form-input" defaultValue="PASSED" />
            <input name="findings" placeholder="Findings (optional)" className="form-input col-span-2" />
            <input name="file" type="file" accept="application/pdf,image/*" className="form-input col-span-2" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!homeId || submitting === "inspection"}>
            {submitting === "inspection" ? "Creating..." : "Create Inspection"}
          </button>
        </form>
      </div>
    </div>
  );
}
