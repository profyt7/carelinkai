"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiSearch, FiHome, FiUsers, FiFileText, FiTrendingUp, FiExternalLink } from "react-icons/fi";

type OperatorListItem = {
  id: string;
  userId: string;
  companyName: string;
  userName: string | null;
  email: string;
  homesCount: number;
  caregiversCount: number;
  inquiriesCount: number;
  residentsCount: number;
  createdAt: string;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: OperatorListItem[];
};

export default function OperatorManagementPage() {
  const router = useRouter();

  // Filters
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("detailed", "true");
    if (q.trim()) sp.set("q", q.trim());
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, page]);

  // Fetch list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/operators?${query}`, { cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as ListResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load operators");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleReset = () => {
    setQ("");
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Operator Management</h1>
          <p className="text-sm text-neutral-600 mt-1">
            View and manage all operators in the system
          </p>
        </div>
        <div className="text-sm text-neutral-500">
          Total: <span className="font-semibold text-neutral-800">{data?.total ?? 0}</span> operators
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by company name, email, or contact name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin"></div>
            <p className="text-neutral-600 font-medium">Loading operators...</p>
          </div>
        </div>
      )}

      {/* Operators Table */}
      {data && (
        <div className="card overflow-hidden">
          {data.items.length === 0 ? (
            <div className="text-center py-12">
              <FiUsers className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-600 font-medium">No operators found</p>
              <p className="text-sm text-neutral-500 mt-1">
                {q.trim() ? "Try adjusting your search criteria" : "No operators have been registered yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Homes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Residents
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Inquiries
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Caregivers
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {data.items.map((op) => (
                      <tr key={op.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary-700">
                                {op.companyName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-neutral-900">
                                {op.companyName}
                              </div>
                              <div className="text-xs text-neutral-500">
                                Joined {new Date(op.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-neutral-900">
                            {op.userName || "N/A"}
                          </div>
                          <div className="text-xs text-neutral-500">{op.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FiHome className="h-4 w-4 text-neutral-400" />
                            <span className="text-sm font-semibold text-neutral-900">
                              {op.homesCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FiUsers className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-semibold text-neutral-900">
                              {op.residentsCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FiFileText className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-neutral-900">
                              {op.inquiriesCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FiUsers className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-semibold text-neutral-900">
                              {op.caregiversCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/operator/homes?operatorId=${op.id}`}
                              className="text-sm text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1"
                            >
                              View Homes
                              <FiExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between">
                  <div className="text-sm text-neutral-600">
                    Page {data.page} of {data.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={data.page === 1 || loading}
                      className="btn btn-secondary btn-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                      disabled={data.page === data.totalPages || loading}
                      className="btn btn-secondary btn-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Total Homes</div>
                <div className="mt-1 text-2xl font-semibold">
                  {data.items.reduce((sum, op) => sum + op.homesCount, 0)}
                </div>
              </div>
              <FiHome className="h-8 w-8 text-primary-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Total Residents</div>
                <div className="mt-1 text-2xl font-semibold">
                  {data.items.reduce((sum, op) => sum + op.residentsCount, 0)}
                </div>
              </div>
              <FiUsers className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Total Inquiries</div>
                <div className="mt-1 text-2xl font-semibold">
                  {data.items.reduce((sum, op) => sum + op.inquiriesCount, 0)}
                </div>
              </div>
              <FiFileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Total Caregivers</div>
                <div className="mt-1 text-2xl font-semibold">
                  {data.items.reduce((sum, op) => sum + op.caregiversCount, 0)}
                </div>
              </div>
              <FiUsers className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
