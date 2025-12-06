"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiLoader, FiSave, FiAlertCircle, FiCheck } from "react-icons/fi";

type ProviderProfile = {
  id: string;
  name: string | null;
  bio: string | null;
  logoUrl: string | null;
  serviceTypes: string[];
  coverageCity: string | null;
  coverageState: string | null;
  coverageRadius: number | null;
  isVisibleInMarketplace: boolean;
};

export default function ProviderSettingsPage() {
  const { status, data } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({ type: "", text: "" });

  const [form, setForm] = useState<any>({
    name: "",
    bio: "",
    logoUrl: "",
    serviceTypes: [] as string[],
    coverageCity: "",
    coverageState: "",
    coverageRadius: "",
    isVisibleInMarketplace: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/provider");
    }
  }, [status, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/provider/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load provider profile");
        const { data } = await res.json();
        const p: ProviderProfile = data;
        setForm({
          name: p.name || "",
          bio: p.bio || "",
          logoUrl: p.logoUrl || "",
          serviceTypes: Array.isArray(p.serviceTypes) ? p.serviceTypes : [],
          coverageCity: p.coverageCity || "",
          coverageState: p.coverageState || "",
          coverageRadius: p.coverageRadius ?? "",
          isVisibleInMarketplace: !!p.isVisibleInMarketplace,
        });
      } catch (e) {
        setMessage({ type: "error", text: "Failed to load provider profile." });
      } finally {
        setLoading(false);
      }
    };
    if (status === "authenticated") load();
  }, [status]);

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        name: form.name || null,
        bio: form.bio || null,
        logoUrl: form.logoUrl || null,
        serviceTypes: form.serviceTypes,
        coverageCity: form.coverageCity || null,
        coverageState: form.coverageState || null,
        coverageRadius: form.coverageRadius === "" ? null : Number(form.coverageRadius),
        isVisibleInMarketplace: !!form.isVisibleInMarketplace,
      };
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Update failed");
      setMessage({ type: "success", text: "Provider profile saved." });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to save changes." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return (
    <DashboardLayout title="Settings • Provider" showSearch={false}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-neutral-800">Provider Settings</h1>

        {message.text && (
          <div className={`mb-6 rounded-md p-4 ${message.type === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
            <div className="flex items-center">
              {message.type === "error" ? <FiAlertCircle className="mr-2 h-5 w-5" /> : <FiCheck className="mr-2 h-5 w-5" />}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={update} className="rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Business Name</label>
              <input className="form-input w-full" value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Bio / Description</label>
              <textarea className="form-textarea w-full" rows={4} value={form.bio} onChange={(e) => setForm((p: any) => ({ ...p, bio: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Logo URL</label>
              <input className="form-input w-full" value={form.logoUrl} onChange={(e) => setForm((p: any) => ({ ...p, logoUrl: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Service Types (comma-separated slugs)</label>
              <input
                className="form-input w-full"
                value={(form.serviceTypes || []).join(", ")}
                onChange={(e) => setForm((p: any) => ({ ...p, serviceTypes: e.target.value.split(/,\s*/).filter(Boolean) }))}
              />
              <p className="mt-1 text-xs text-neutral-500">Enter valid service slugs configured in Marketplace Categories → Service.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">City</label>
                <input className="form-input w-full" value={form.coverageCity} onChange={(e) => setForm((p: any) => ({ ...p, coverageCity: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">State</label>
                <input className="form-input w-full" maxLength={2} value={form.coverageState} onChange={(e) => setForm((p: any) => ({ ...p, coverageState: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Radius (miles)</label>
                <input type="number" className="form-input w-full" value={form.coverageRadius} onChange={(e) => setForm((p: any) => ({ ...p, coverageRadius: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="vis" type="checkbox" checked={!!form.isVisibleInMarketplace} onChange={(e) => setForm((p: any) => ({ ...p, isVisibleInMarketplace: e.target.checked }))} />
              <label htmlFor="vis" className="text-sm text-neutral-800">Show my provider profile in marketplace</label>
            </div>
          </div>

          <div className="mt-6 text-right">
            <button type="submit" disabled={saving} className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {saving ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : <FiSave className="mr-2 h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
