"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import DashboardLayout from "@/components/layout/DashboardLayout";

type CaregiverListItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  city: string | null;
  state: string | null;
  createdAt: string;
  isVisibleInMarketplace: null | boolean;
  credentialCount: number;
  verifiedCredentialCount: number;
  hasUnverifiedCredentials: boolean;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: CaregiverListItem[];
};

export default function AdminAidesListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [hasUnverified, setHasUnverified] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN || role === UserRole.STAFF;
    setIsAuthorized(ok);
    if (!ok) router.push("/dashboard");
  }, [session, status, router]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (city.trim()) sp.set("city", city.trim());
    if (stateCode.trim()) sp.set("state", stateCode.trim());
    if (hasUnverified) sp.set("hasUnverifiedCredentials", "true");
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, city, stateCode, hasUnverified, page]);

  // Fetch list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/caregivers?${query}`, { cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as ListResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!isAuthorized) return null;

  return (
    <DashboardLayout title="Admin • Aides">
      <div className="px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-neutral-600 mb-1">Search (name or email)</label>
            <input className="form-input w-full" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="e.g. Jane or jane@example.com" />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">City</label>
            <input className="form-input w-48" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">State</label>
            <input className="form-input w-28" value={stateCode} onChange={(e) => { setStateCode(e.target.value.toUpperCase()); setPage(1); }} maxLength={2} />
          </div>
          <label className="inline-flex items-center gap-2 mt-1">
            <input type="checkbox" className="form-checkbox" checked={hasUnverified} onChange={(e) => { setHasUnverified(e.target.checked); setPage(1); }} />
            <span className="text-sm text-neutral-700">Has unverified credentials</span>
          </label>
        </div>

        <div className="rounded-lg border border-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50 text-sm text-neutral-600">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Credentials</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">Loading…</td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-amber-800 bg-amber-50">{error}</td>
                </tr>
              )}
              {(!loading && !error && data?.items?.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">No results</td>
                </tr>
              )}
              {data?.items?.map((it) => (
                <tr key={it.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{it.name || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{it.email}</td>
                  <td className="px-4 py-3 text-neutral-700">{[it.city, it.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-neutral-700">{it.verifiedCredentialCount}/{it.credentialCount}</td>
                  <td className="px-4 py-3 text-neutral-700">{new Date(it.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => router.push(`/admin/aides/${it.id}`)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Page {data.page} of {data.totalPages} • {data.total} total</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
