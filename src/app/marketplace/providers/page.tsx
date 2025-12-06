"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiMapPin } from "react-icons/fi";

type Provider = {
  id: string;
  userId: string;
  name: string;
  city: string;
  state: string;
  bio: string;
  serviceTypes: string[];
  coverageRadius: number | null;
};

type ListResponse = {
  data: Provider[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export default function ProvidersPage() {
  // Filters/UI state
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [services, setServices] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (city.trim()) sp.set("city", city.trim());
    if (stateCode.trim()) sp.set("state", stateCode.trim());
    if (services.trim()) sp.set("services", services.trim());
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, city, stateCode, services, page]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/marketplace/providers?${query}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = (await res.json()) as ListResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Transportation Providers</h1>
      <p className="text-gray-600 mb-4">Find trusted transportation providers for medical appointments and daily needs.</p>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-sm text-neutral-600 mb-1">Search (name or bio)</label>
          <input className="form-input w-full" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="e.g., Reliable Transport" />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">City</label>
          <input className="form-input w-48" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">State</label>
          <input className="form-input w-28" value={stateCode} onChange={(e) => { setStateCode(e.target.value.toUpperCase()); setPage(1); }} maxLength={2} />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-neutral-600 mb-1">Services (comma-separated slugs)</label>
          <input className="form-input w-full" value={services} onChange={(e) => { setServices(e.target.value); setPage(1); }} placeholder="e.g., wheelchair-accessible,airport-transfers" />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="text-neutral-600">Loading…</div>}
        {error && !loading && <div className="text-amber-800 bg-amber-50 p-3 rounded">{error}</div>}
        {!loading && !error && data?.data?.length === 0 && <div className="text-neutral-600">No providers found.</div>}
        {data?.data?.map((p) => {
          const location = [p.city, p.state].filter(Boolean).join(", ");
          return (
            <div key={p.id} className="bg-white border rounded-md p-4 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-3">
                {location && (
                  <span className="inline-flex items-center"><FiMapPin className="mr-1" />{location}</span>
                )}
                {p.coverageRadius ? (
                  <span className="text-xs text-neutral-600">~{p.coverageRadius}mi radius</span>
                ) : null}
              </div>

              {p.bio && (<p className="text-sm text-gray-700 line-clamp-3 mb-3">{p.bio}</p>)}

              {p.serviceTypes?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.serviceTypes.slice(0, 4).map((s) => (
                    <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {s.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto">
                <Link
                  href={`/marketplace/providers/${p.id}`}
                  className="block text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  View provider
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-neutral-600">Page {data.pagination.page} of {data.pagination.totalPages} • {data.pagination.total} total</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>
            <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
