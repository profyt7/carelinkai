"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Provider = {
  id: string;
  userId: string;
  email: string | null;
  name: string;
  bio: string;
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

export default function AdminProviderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN || role === UserRole.STAFF;
    setIsAuthorized(ok);
    if (!ok) router.push("/dashboard");
  }, [session, status, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/providers/${encodeURIComponent(params.id)}`, { cache: "no-store" });
        if (!res.ok) { const txt = await res.text(); throw new Error(txt || `Request failed (${res.status})`); }
        const json = await res.json();
        if (!cancelled) setProvider(json as Provider);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  async function updateFlags(flags: Partial<Pick<Provider, 'isVisibleInMarketplace' | 'isVerified'>>) {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/providers/${encodeURIComponent(params.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flags),
      });
      if (!res.ok) { const txt = await res.text(); throw new Error(txt || `Update failed (${res.status})`); }
      // Refresh record
      const refreshed = await fetch(`/api/admin/providers/${encodeURIComponent(params.id)}`, { cache: 'no-store' });
      const json = await refreshed.json();
      setProvider(json as Provider);
    } catch (e: any) {
      setError(e?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) return null;

  return (
    <DashboardLayout title="Admin • Provider">
      <div className="px-4 py-6">
        {loading && !provider && <div className="text-neutral-600">Loading…</div>}
        {error && !loading && <div className="text-amber-800 bg-amber-50 p-3 rounded mb-4">{error}</div>}
        {provider && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-2xl">
                  {provider.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900">{provider.name}</div>
                  <div className="text-neutral-700">{provider.email || '—'}</div>
                  <div className="text-neutral-600 text-sm">{[provider.coverageCity, provider.coverageState].filter(Boolean).join(', ') || '—'}{provider.coverageRadius ? ` • ~${provider.coverageRadius}mi radius` : ''}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="font-medium mb-3">Marketplace settings</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => updateFlags({ isVisibleInMarketplace: !provider.isVisibleInMarketplace })} className="rounded-md border px-3 py-1.5 text-sm">
                  {provider.isVisibleInMarketplace ? 'Hide from marketplace' : 'Make visible in marketplace'}
                </button>
                <button onClick={() => updateFlags({ isVerified: !provider.isVerified })} className="rounded-md border px-3 py-1.5 text-sm">
                  {provider.isVerified ? 'Mark as unverified' : 'Verify provider'}
                </button>
              </div>
              <div className="mt-3 text-sm text-neutral-600">Verified: {provider.isVerified ? `Yes${provider.verifiedAt ? ` • ${new Date(provider.verifiedAt).toLocaleString()}` : ''}` : 'No'}</div>
            </div>

            {provider.bio && (
              <div className="bg-white rounded-lg border p-4">
                <div className="font-medium mb-2">Bio</div>
                <div className="prose max-w-none text-neutral-800">{provider.bio}</div>
              </div>
            )}

            {provider.serviceTypes?.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <div className="font-medium mb-2">Services</div>
                <div className="flex flex-wrap gap-2">
                  {provider.serviceTypes.map((s) => (
                    <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">{s.replace(/-/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
