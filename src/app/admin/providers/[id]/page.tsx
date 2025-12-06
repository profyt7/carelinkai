"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import DashboardLayout from "@/components/layout/DashboardLayout";

type ProviderDetail = {
  id: string;
  userId: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  name: string | null;
  bio: string | null;
  logoUrl: string | null;
  serviceTypes: string[];
  coverageCity: string | null;
  coverageState: string | null;
  coverageRadius: number | null;
  isVisibleInMarketplace: boolean;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminProviderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN || role === UserRole.STAFF;
    setIsAuthorized(ok);
    if (!ok) router.push("/dashboard");
  }, [session, status, router]);

  // Load
  useEffect(() => {
    if (!id || !isAuthorized) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/providers/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = (await res.json()) as ProviderDetail;
        if (!cancelled) {
          setProvider(json);
          setIsVisible(json.isVisibleInMarketplace);
          setIsVerified(json.isVerified);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isAuthorized]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisibleInMarketplace: isVisible, isVerified }),
      });
      const j = await res.json();
      if (!res.ok || j?.success !== true) throw new Error(j?.error || 'Save failed');
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <DashboardLayout title="Admin • Provider">
      <div className="px-4 py-6">
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : error ? (
          <div className="rounded-md bg-amber-50 p-3 text-amber-800">{error}</div>
        ) : !provider ? (
          <div className="text-neutral-600">Not found</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-lg border bg-white p-4">
              <div className="mb-4 flex items-center gap-4">
                {provider.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={provider.logoUrl} alt="Logo" className="h-16 w-16 rounded-md border object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-md border bg-neutral-50" />
                )}
                <div>
                  <div className="text-xl font-semibold text-neutral-900">{provider.name || 'Provider'}</div>
                  <div className="text-sm text-neutral-600">{provider.user?.email}</div>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{provider.bio || '—'}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-neutral-500">Location:</span> {[provider.coverageCity, provider.coverageState].filter(Boolean).join(', ') || '—'}</div>
                <div><span className="text-neutral-500">Radius:</span> {provider.coverageRadius ?? '—'} miles</div>
                <div className="col-span-2"><span className="text-neutral-500">Services:</span> {provider.serviceTypes?.length ? provider.serviceTypes.join(', ') : '—'}</div>
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="form-checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
                  <span>Visible in marketplace</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="form-checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                  <span>Verified</span>
                </label>
                <button onClick={onSave} disabled={saving} className="mt-2 w-full rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
