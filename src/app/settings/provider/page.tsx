"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

type ProviderProfile = {
  id: string;
  name: string | null;
  bio: string | null;
  logoUrl: string | null;
  serviceTypes: string[];
  coverageCity: string | null;
  coverageState: string | null;
  coverageRadius: number | null;
};

export default function ProviderSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "" | "success" | "error"; text: string }>({ type: "", text: "" });

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    coverageCity: "",
    coverageState: "",
    coverageRadius: "",
    serviceTypes: [] as string[],
  });
  const [serviceOptions, setServiceOptions] = useState<{ slug: string; name: string }[]>([]);

  // Guard: providers only
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?callbackUrl=/settings/provider");
    if (status === "authenticated" && session?.user?.role !== "PROVIDER") router.replace("/settings/profile");
  }, [status, session?.user?.role, router]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/categories", { cache: "no-store" });
      const json = await res.json();
      const svc = (json?.data?.SERVICE || []) as { slug: string; name: string }[];
      setServiceOptions(svc);
    } catch {
      setServiceOptions([]);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/provider/profile", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const j = await res.json();
      const p = j?.data as ProviderProfile;
      setProfile(p);
      setForm({
        name: p?.name || "",
        bio: p?.bio || "",
        coverageCity: p?.coverageCity || "",
        coverageState: p?.coverageState || "",
        coverageRadius: typeof p?.coverageRadius === "number" ? String(p.coverageRadius) : "",
        serviceTypes: Array.isArray(p?.serviceTypes) ? p.serviceTypes : [],
      });
    } catch {
      setMessage({ type: "error", text: "Failed to load provider profile." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "PROVIDER") {
      loadCategories();
      loadProfile();
    }
  }, [status, session?.user?.role, loadCategories, loadProfile]);

  const toggleService = (slug: string) => {
    setForm((prev) => {
      const exists = prev.serviceTypes.includes(slug);
      return {
        ...prev,
        serviceTypes: exists ? prev.serviceTypes.filter((s) => s !== slug) : [...prev.serviceTypes, slug],
      };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const payload: any = {
        name: form.name?.trim() || null,
        bio: form.bio?.trim() || null,
        coverageCity: form.coverageCity?.trim() || null,
        coverageState: form.coverageState?.trim() || null,
        coverageRadius: form.coverageRadius ? Number(form.coverageRadius) : null,
        serviceTypes: form.serviceTypes,
      };
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || j?.success !== true) throw new Error(j?.error || "save failed");
      setMessage({ type: "success", text: "Profile saved." });
      await loadProfile();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to save profile." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-neutral-600">Loading provider settings…</div>
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "PROVIDER") {
    return null;
  }

  return (
    <DashboardLayout title="Settings • Provider" showSearch={false}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Provider Settings</h1>
          <p className="text-sm text-neutral-500">Update your business profile and services.</p>
        </div>

        {message.text && (
          <div className={`mb-4 rounded-md p-3 ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={onSubmit} className="rounded-lg border bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Business / Provider Name</label>
              <input
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Sunrise Care Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Bio / Description</label>
              <textarea
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell operators and families about your services."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Coverage City</label>
                <input
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={form.coverageCity}
                  onChange={(e) => setForm((p) => ({ ...p, coverageCity: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Coverage State</label>
                <input
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={form.coverageState}
                  onChange={(e) => setForm((p) => ({ ...p, coverageState: e.target.value }))}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Coverage Radius (miles)</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={form.coverageRadius}
                  onChange={(e) => setForm((p) => ({ ...p, coverageRadius: e.target.value }))}
                  placeholder="e.g. 25"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Service Types</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {serviceOptions.length === 0 ? (
                  <span className="text-sm text-neutral-500">Loading…</span>
                ) : (
                  serviceOptions.map((opt) => (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => toggleService(opt.slug)}
                      className={`px-3 py-1 rounded-full border text-sm ${
                        form.serviceTypes.includes(opt.slug)
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-neutral-700 border-neutral-300"
                      }`}
                      aria-pressed={form.serviceTypes.includes(opt.slug)}
                    >
                      {opt.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
