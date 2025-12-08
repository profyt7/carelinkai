"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiChevronRight } from "react-icons/fi";

type ProviderListItem = {
  id: string;
  userId: string;
  businessName: string;
  contactEmail: string;
  city: string | null;
  state: string | null;
  serviceTypes: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  credentialCount: number;
  verifiedCredentialCount: number;
  hasUnverifiedCredentials: boolean;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ProviderListItem[];
};

export default function AdminProvidersListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [hasUnverified, setHasUnverified] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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
    if (verifiedOnly) sp.set("verified", "true");
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, city, stateCode, hasUnverified, verifiedOnly, page]);

  // Fetch list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/providers?${query}`, { cache: "no-store" });
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
    <div className="px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Provider Management</h1>
          <p className="mt-1 text-neutral-600">
            Manage and verify service providers in the marketplace.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 bg-white rounded-lg border border-neutral-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">
                Search (name or email)
              </label>
              <input
                className="form-input w-full text-sm"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. ABC Services"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">City</label>
              <input
                className="form-input w-full text-sm"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">State</label>
              <input
                className="form-input w-full text-sm"
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value.toUpperCase());
                  setPage(1);
                }}
                maxLength={2}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={hasUnverified}
                  onChange={(e) => {
                    setHasUnverified(e.target.checked);
                    setPage(1);
                  }}
                />
                <span className="text-sm text-neutral-700">Unverified credentials</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                <span className="text-sm text-neutral-700">Verified only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50 text-sm text-neutral-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Business Name</th>
                  <th className="px-4 py-3 text-left font-medium">Contact Email</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Services</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Credentials</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-amber-800 bg-amber-50"
                    >
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && data?.items?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                      No results
                    </td>
                  </tr>
                )}
                {data?.items?.map((provider) => {
                  const location = [provider.city, provider.state]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={provider.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-neutral-900">
                          {provider.businessName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {provider.contactEmail}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {location || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div className="flex flex-wrap gap-1">
                          {provider.serviceTypes.slice(0, 2).map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-800"
                            >
                              {service}
                            </span>
                          ))}
                          {provider.serviceTypes.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600">
                              +{provider.serviceTypes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                          {provider.isVerified ? (
                            <span className="inline-flex items-center text-xs text-green-700">
                              <FiCheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-amber-700">
                              <FiAlertCircle className="mr-1 h-3 w-3" />
                              Not Verified
                            </span>
                          )}
                          {provider.isActive ? (
                            <span className="inline-flex items-center text-xs text-green-700">
                              <FiCheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-red-700">
                              <FiXCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div>
                          {provider.verifiedCredentialCount}/{provider.credentialCount}
                        </div>
                        {provider.hasUnverifiedCredentials && (
                          <span className="text-xs text-amber-600">
                            Pending review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/providers/${provider.id}`}
                          className="inline-flex items-center text-primary-600 hover:text-primary-700"
                        >
                          View
                          <FiChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, data.total)} of {data.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
