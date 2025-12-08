"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUsers,
  FiFileText,
  FiShoppingBag,
  FiMessageSquare,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";

// ========== TYPE DEFINITIONS ==========

type MetricsData = {
  users: {
    totalByRole: Record<string, number>;
    newLast7DaysByRole: Record<string, number>;
    newLast30DaysByRole: Record<string, number>;
  };
  leads: {
    total: number;
    byStatus: Record<string, number>;
    byTargetType: Record<string, number>;
    createdLast7Days: number;
    createdLast30Days: number;
  };
  marketplace: {
    activeAides: number;
    activeProviders: number;
    verifiedProviders: number;
    unverifiedProviders: number;
    aidesByBackgroundCheck: Record<string, number>;
  };
  engagement: {
    totalMessages: number;
    messagesLast7Days: number;
  };
  generatedAt: string;
};

// ========== COMPONENT ==========

export default function AdminMetricsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  
  // Time range filter state
  type TimeRange = "7days" | "30days" | "all";
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("all");

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN;
    setIsAuthorized(ok);
    if (!ok) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch metrics
  useEffect(() => {
    if (!isAuthorized) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/metrics", { cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as MetricsData;
        if (!cancelled) setMetrics(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  if (!isAuthorized) return null;

  // ========== HELPER FUNCTIONS ==========

  const getTotalUsers = () => {
    if (!metrics) return 0;
    return Object.values(metrics.users.totalByRole).reduce((sum, count) => sum + count, 0);
  };

  // Ratio calculation helpers with divide-by-zero handling
  const getVerifiedProviderRate = () => {
    if (!metrics || metrics.marketplace.activeProviders === 0) return null;
    return (
      (metrics.marketplace.verifiedProviders / metrics.marketplace.activeProviders) *
      100
    ).toFixed(1);
  };

  const getVerifiedAideRate = () => {
    if (!metrics || metrics.marketplace.activeAides === 0) return null;
    const clearAides = metrics.marketplace.aidesByBackgroundCheck.CLEAR || 0;
    return ((clearAides / metrics.marketplace.activeAides) * 100).toFixed(1);
  };

  const getLeadsPerProvider = () => {
    if (!metrics || metrics.marketplace.activeProviders === 0) return null;
    return (metrics.leads.total / metrics.marketplace.activeProviders).toFixed(1);
  };

  const getLeadsPerAide = () => {
    if (!metrics || metrics.marketplace.activeAides === 0) return null;
    return (metrics.leads.total / metrics.marketplace.activeAides).toFixed(1);
  };

  const getMessagesPerLead = () => {
    if (!metrics || metrics.leads.total === 0) return null;
    return (metrics.engagement.totalMessages / metrics.leads.total).toFixed(1);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      FAMILY: "Family",
      CAREGIVER: "Caregiver",
      PROVIDER: "Provider",
      OPERATOR: "Operator",
      ADMIN: "Admin",
      STAFF: "Staff",
      AFFILIATE: "Affiliate",
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      NEW: "New",
      IN_REVIEW: "In Review",
      CONTACTED: "Contacted",
      CLOSED: "Closed",
      CANCELLED: "Cancelled",
    };
    return labels[status] || status;
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      AIDE: "Aide",
      PROVIDER: "Provider",
    };
    return labels[type] || type;
  };

  const getBackgroundCheckLabel = (status: string) => {
    const labels: Record<string, string> = {
      NOT_STARTED: "Not Started",
      PENDING: "Pending",
      CLEAR: "Clear",
      CONSIDER: "Consider",
      EXPIRED: "Expired",
      FAILED: "Failed",
    };
    return labels[status] || status;
  };

  const getBackgroundCheckColor = (status: string) => {
    const colors: Record<string, string> = {
      CLEAR: "text-green-700 bg-green-50",
      PENDING: "text-amber-700 bg-amber-50",
      NOT_STARTED: "text-neutral-600 bg-neutral-50",
      CONSIDER: "text-orange-700 bg-orange-50",
      EXPIRED: "text-red-700 bg-red-50",
      FAILED: "text-red-700 bg-red-50",
    };
    return colors[status] || "text-neutral-600 bg-neutral-50";
  };

  // ========== RENDER ==========

  return (
    <DashboardLayout title="Admin • Platform Metrics">
      <div className="px-4 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Platform Metrics</h1>
            <p className="mt-1 text-neutral-600">
              Comprehensive analytics and performance indicators for CareLinkAI.
            </p>
          </div>
          {/* Last Updated Timestamp */}
          {metrics && (
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
              <FiClock className="h-4 w-4 text-neutral-600" />
              <div className="text-right">
                <p className="text-xs text-neutral-600">Last Updated</p>
                <p className="text-sm font-medium text-neutral-900">
                  {new Date(metrics.generatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Time Range Toggle */}
        {!loading && !error && metrics && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-200">
              <button
                onClick={() => setSelectedTimeRange("7days")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTimeRange === "7days"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setSelectedTimeRange("30days")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTimeRange === "30days"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setSelectedTimeRange("all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTimeRange === "all"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-neutral-600">Loading metrics...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <p className="font-medium">Error loading metrics</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Metrics Display */}
        {!loading && !error && metrics && (
          <div className="space-y-6">
            {/* Overview Cards - Clickable KPI Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users - No specific deep-link route exists yet */}
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Total Users</p>
                    <p className="text-3xl font-bold text-neutral-900 mt-1">
                      {getTotalUsers()}
                    </p>
                  </div>
                  <div className="bg-primary-100 rounded-full p-3">
                    <FiUsers className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
              </div>

              {/* Total Leads - Deep-links to /operator/leads */}
              <Link
                href="/operator/leads"
                className="bg-white border border-neutral-200 rounded-lg p-6 hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 group-hover:text-green-700 transition-colors">
                      Total Leads
                    </p>
                    <p className="text-3xl font-bold text-neutral-900 mt-1">
                      {metrics.leads.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 rounded-full p-3">
                      <FiFileText className="h-6 w-6 text-green-600" />
                    </div>
                    <FiArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>

              {/* Active Aides - Deep-links to /marketplace/caregivers */}
              <Link
                href="/marketplace/caregivers"
                className="bg-white border border-neutral-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 group-hover:text-blue-700 transition-colors">
                      Active Aides
                    </p>
                    <p className="text-3xl font-bold text-neutral-900 mt-1">
                      {metrics.marketplace.activeAides}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 rounded-full p-3">
                      <FiShoppingBag className="h-6 w-6 text-blue-600" />
                    </div>
                    <FiArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>

              {/* Active Providers - Deep-links to /admin/providers */}
              <Link
                href="/admin/providers"
                className="bg-white border border-neutral-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 group-hover:text-purple-700 transition-colors">
                      Active Providers
                    </p>
                    <p className="text-3xl font-bold text-neutral-900 mt-1">
                      {metrics.marketplace.activeProviders}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 rounded-full p-3">
                      <FiShoppingBag className="h-6 w-6 text-purple-600" />
                    </div>
                    <FiArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Key Ratios Section */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FiTrendingUp className="mr-2 h-5 w-5 text-primary-600" />
                Key Ratios & Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Verified Provider Rate */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary-100">
                  <p className="text-xs text-neutral-600 mb-1">Verified Provider Rate</p>
                  {getVerifiedProviderRate() !== null ? (
                    <p className="text-2xl font-bold text-primary-700">
                      {getVerifiedProviderRate()}%
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">N/A</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {metrics.marketplace.verifiedProviders} of {metrics.marketplace.activeProviders}
                  </p>
                </div>

                {/* Verified Aide Rate */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-green-100">
                  <p className="text-xs text-neutral-600 mb-1">Background Check Clear</p>
                  {getVerifiedAideRate() !== null ? (
                    <p className="text-2xl font-bold text-green-700">
                      {getVerifiedAideRate()}%
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">N/A</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {metrics.marketplace.aidesByBackgroundCheck.CLEAR || 0} of{" "}
                    {metrics.marketplace.activeAides} aides
                  </p>
                </div>

                {/* Leads per Provider */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100">
                  <p className="text-xs text-neutral-600 mb-1">Leads per Provider</p>
                  {getLeadsPerProvider() !== null ? (
                    <p className="text-2xl font-bold text-purple-700">
                      {getLeadsPerProvider()}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">N/A</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Avg. inquiry volume
                  </p>
                </div>

                {/* Leads per Aide */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100">
                  <p className="text-xs text-neutral-600 mb-1">Leads per Aide</p>
                  {getLeadsPerAide() !== null ? (
                    <p className="text-2xl font-bold text-blue-700">
                      {getLeadsPerAide()}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">N/A</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Avg. demand per aide
                  </p>
                </div>

                {/* Messages per Lead */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100">
                  <p className="text-xs text-neutral-600 mb-1">Messages per Lead</p>
                  {getMessagesPerLead() !== null ? (
                    <p className="text-2xl font-bold text-indigo-700">
                      {getMessagesPerLead()}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">N/A</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Avg. engagement level
                  </p>
                </div>
              </div>
            </div>

            {/* User Metrics Section */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FiUsers className="mr-2 h-5 w-5 text-primary-600" />
                User Metrics
              </h2>
              <div className="space-y-4">
                {/* Users by Role Table */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Users by Role</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">
                            Role
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">
                            Total
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">
                            Last 7 Days
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">
                            Last 30 Days
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {Object.entries(metrics.users.totalByRole).map(([role, count]) => (
                          <tr key={role}>
                            <td className="px-4 py-2 text-sm text-neutral-900">
                              {getRoleLabel(role)}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-neutral-900">
                              {count}
                            </td>
                            <td className="px-4 py-2 text-sm text-neutral-600">
                              {metrics.users.newLast7DaysByRole[role] || 0}
                            </td>
                            <td className="px-4 py-2 text-sm text-neutral-600">
                              {metrics.users.newLast30DaysByRole[role] || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Metrics Section */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FiFileText className="mr-2 h-5 w-5 text-green-600" />
                Lead Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Leads by Status */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Leads by Status</h3>
                  <div className="space-y-2">
                    {Object.entries(metrics.leads.byStatus).map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded"
                      >
                        <span className="text-sm text-neutral-900">
                          {getStatusLabel(status)}
                        </span>
                        <span className="text-sm font-medium text-neutral-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leads by Target Type */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">
                    Leads by Target Type
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(metrics.leads.byTargetType).map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded"
                      >
                        <span className="text-sm text-neutral-900">
                          {getTargetTypeLabel(type)}
                        </span>
                        <span className="text-sm font-medium text-neutral-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lead Trends - With Time Range Emphasis */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`flex items-center p-4 rounded-lg transition-all duration-300 ${
                    selectedTimeRange === "7days"
                      ? "bg-blue-100 ring-2 ring-blue-400 shadow-md scale-105"
                      : "bg-blue-50"
                  }`}
                >
                  <FiTrendingUp
                    className={`h-8 w-8 mr-3 transition-all ${
                      selectedTimeRange === "7days" ? "text-blue-700" : "text-blue-600"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm transition-all ${
                        selectedTimeRange === "7days"
                          ? "text-blue-900 font-semibold"
                          : "text-blue-900"
                      }`}
                    >
                      Leads (Last 7 Days)
                      {selectedTimeRange === "7days" && (
                        <span className="ml-2 text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-2xl font-bold transition-all ${
                        selectedTimeRange === "7days" ? "text-blue-900" : "text-blue-900"
                      }`}
                    >
                      {metrics.leads.createdLast7Days}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center p-4 rounded-lg transition-all duration-300 ${
                    selectedTimeRange === "30days"
                      ? "bg-green-100 ring-2 ring-green-400 shadow-md scale-105"
                      : "bg-green-50"
                  }`}
                >
                  <FiTrendingUp
                    className={`h-8 w-8 mr-3 transition-all ${
                      selectedTimeRange === "30days" ? "text-green-700" : "text-green-600"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm transition-all ${
                        selectedTimeRange === "30days"
                          ? "text-green-900 font-semibold"
                          : "text-green-900"
                      }`}
                    >
                      Leads (Last 30 Days)
                      {selectedTimeRange === "30days" && (
                        <span className="ml-2 text-xs bg-green-700 text-white px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-2xl font-bold transition-all ${
                        selectedTimeRange === "30days" ? "text-green-900" : "text-green-900"
                      }`}
                    >
                      {metrics.leads.createdLast30Days}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Marketplace Metrics Section */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FiShoppingBag className="mr-2 h-5 w-5 text-blue-600" />
                Marketplace Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Active Aides */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">Active Aides</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {metrics.marketplace.activeAides}
                  </p>
                </div>

                {/* Active Providers */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900">Active Providers</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {metrics.marketplace.activeProviders}
                  </p>
                </div>

                {/* Verified Providers */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-900 flex items-center">
                    <FiCheckCircle className="mr-1 h-4 w-4" />
                    Verified Providers
                  </p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {metrics.marketplace.verifiedProviders}
                  </p>
                </div>

                {/* Unverified Providers */}
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-900 flex items-center">
                    <FiAlertCircle className="mr-1 h-4 w-4" />
                    Unverified Providers
                  </p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {metrics.marketplace.unverifiedProviders}
                  </p>
                </div>
              </div>

              {/* Background Check Status */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">
                  Aide Background Check Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {Object.entries(metrics.marketplace.aidesByBackgroundCheck).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className={`p-3 rounded text-center ${getBackgroundCheckColor(status)}`}
                      >
                        <p className="text-xs font-medium">
                          {getBackgroundCheckLabel(status)}
                        </p>
                        <p className="text-lg font-bold mt-1">{count}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Engagement Metrics Section */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FiMessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
                Engagement Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Messages */}
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-900">Total Messages</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    {metrics.engagement.totalMessages}
                  </p>
                </div>

                {/* Messages Last 7 Days */}
                <div className="p-4 bg-purple-50 rounded-lg flex items-center">
                  <FiClock className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-purple-900">Messages (Last 7 Days)</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {metrics.engagement.messagesLast7Days}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
