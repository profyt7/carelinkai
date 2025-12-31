"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiSearch, 
  FiCalendar, 
  FiCheckCircle, 
  FiClock,
  FiSend,
  FiTrendingUp,
  FiUsers,
  FiFileText
} from "react-icons/fi";
import { motion } from "framer-motion";

type DashboardData = {
  recentSearches: any[];
  pendingRequests: any[];
  stats: {
    totalSearches: number;
    totalPlacements: number;
    successfulPlacements: number;
    pendingResponses: number;
    searchesLast30Days: number;
    placementsLast30Days: number;
  };
};

export default function DischargePlannerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/discharge-planner/dashboard", {
        cache: "no-store",
      });

      if (!response?.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response?.json?.();
      setData(result);
    } catch (err: any) {
      console.error("Error fetching dashboard:", err);
      setError(err?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FiFileText size={48} className="mx-auto mb-2" />
            <p className="font-medium">Failed to load dashboard</p>
            <p className="text-sm text-neutral-600 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, recentSearches, pendingRequests } = data;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white"
      >
        <h1 className="text-3xl font-bold mb-2">Discharge Planning Assistant</h1>
        <p className="text-blue-100 mb-6">
          AI-powered placement search for senior care facilities. Find the perfect match in seconds.
        </p>
        <button
          onClick={() => router.push("/discharge-planner/search")}
          className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors inline-flex items-center shadow-md"
        >
          <FiSearch className="mr-2" size={20} />
          Start New Search
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Total Searches</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.totalSearches ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats?.searchesLast30Days ?? 0} this month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiSearch className="text-blue-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Placement Requests</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.totalPlacements ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats?.placementsLast30Days ?? 0} this month
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiSend className="text-green-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Pending Responses</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.pendingResponses ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">Awaiting reply</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <FiClock className="text-amber-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Successful Placements</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.successfulPlacements ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats?.totalPlacements > 0 
                  ? `${Math.round((stats.successfulPlacements / stats.totalPlacements) * 100)}% success rate`
                  : "No placements yet"
                }
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <FiCheckCircle className="text-emerald-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Searches */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Recent Searches</h2>
              <FiSearch className="text-neutral-400" size={20} />
            </div>
          </div>
          <div className="divide-y divide-neutral-100">
            {(!recentSearches || recentSearches.length === 0) ? (
              <div className="p-6 text-center text-neutral-500">
                <p>No searches yet</p>
                <p className="text-sm mt-2">Start your first placement search above</p>
              </div>
            ) : (
              (recentSearches ?? [])?.slice?.(0, 5)?.map?.((search: any, index: number) => (
                <div key={search?.id ?? index} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {search?.queryText ?? ""}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-neutral-500">
                        <FiCalendar size={12} className="mr-1" />
                        {new Date(search?.createdAt ?? "")?.toLocaleDateString?.()}
                        <span className="mx-2">•</span>
                        <span className="font-medium">
                          {search?.placementRequests?.length ?? 0} requests sent
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      search?.status === "COMPLETED" 
                        ? "bg-green-100 text-green-700"
                        : search?.status === "SEARCHING"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}>
                      {search?.status ?? ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentSearches && recentSearches.length > 5 && (
            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
              <button
                onClick={() => router.push("/discharge-planner/history")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all searches →
              </button>
            </div>
          )}
        </motion.div>

        {/* Pending Requests */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Pending Requests</h2>
              <FiClock className="text-neutral-400" size={20} />
            </div>
          </div>
          <div className="divide-y divide-neutral-100">
            {(!pendingRequests || pendingRequests.length === 0) ? (
              <div className="p-6 text-center text-neutral-500">
                <p>No pending requests</p>
                <p className="text-sm mt-2">All placements are up to date</p>
              </div>
            ) : (
              (pendingRequests ?? [])?.slice?.(0, 5)?.map?.((request: any, index: number) => (
                <div key={request?.id ?? index} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {request?.home?.name ?? "Unknown Home"}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1 truncate">
                        {request?.search?.queryText ?? ""}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-neutral-500">
                        <FiCalendar size={12} className="mr-1" />
                        Sent {new Date(request?.createdAt ?? "")?.toLocaleDateString?.()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 ${
                      request?.status === "VIEWED"
                        ? "bg-blue-100 text-blue-700"
                        : request?.status === "SENT"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}>
                      {request?.status ?? ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingRequests && pendingRequests.length > 5 && (
            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
              <button
                onClick={() => router.push("/discharge-planner/requests")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all requests →
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/discharge-planner/search"
            className="p-4 border-2 border-neutral-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <FiSearch className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
            <p className="font-medium text-neutral-900">New Search</p>
            <p className="text-xs text-neutral-600 mt-1">Find placement options</p>
          </Link>

          <Link
            href="/discharge-planner/history"
            className="p-4 border-2 border-neutral-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <FiFileText className="text-green-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
            <p className="font-medium text-neutral-900">Search History</p>
            <p className="text-xs text-neutral-600 mt-1">View past searches</p>
          </Link>

          <Link
            href="/discharge-planner/requests"
            className="p-4 border-2 border-neutral-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors group"
          >
            <FiSend className="text-amber-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
            <p className="font-medium text-neutral-900">All Requests</p>
            <p className="text-xs text-neutral-600 mt-1">Track placements</p>
          </Link>

          <Link
            href="/discharge-planner/analytics"
            className="p-4 border-2 border-neutral-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
          >
            <FiTrendingUp className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
            <p className="font-medium text-neutral-900">Analytics</p>
            <p className="text-xs text-neutral-600 mt-1">View performance</p>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
