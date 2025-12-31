"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiTrendingUp, 
  FiCalendar,
  FiBarChart2,
  FiPieChart,
  FiActivity,
  FiFileText
} from "react-icons/fi";
import { motion } from "framer-motion";

type AnalyticsData = {
  overview: {
    totalSearches: number;
    totalRequests: number;
    successRate: number;
    avgMatchesPerSearch: number;
    avgResponseTime: string;
  };
  searchesByDate: Array<{ date: string; count: number }>;
  requestsByStatus: Array<{ status: string; count: number; percentage: number }>;
  topMatchedHomes: Array<{ homeId: string; homeName: string; matchCount: number; successRate: number }>;
  monthlyTrends: Array<{ month: string; searches: number; placements: number }>;
};

type TimeFilter = "week" | "month" | "quarter" | "year";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/discharge-planner/analytics?period=${timeFilter}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACCEPTED: "bg-green-500",
      RESPONDED: "bg-blue-500",
      VIEWED: "bg-amber-500",
      SENT: "bg-purple-500",
      PENDING: "bg-neutral-500",
      DECLINED: "bg-red-500",
    };
    return colors[status] || "bg-neutral-500";
  };

  if (loading) {
    return (
      <DashboardLayout title="Analytics" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Analytics" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FiBarChart2 size={48} className="mx-auto mb-2" />
              <p className="font-medium">Failed to load analytics</p>
              <p className="text-sm text-neutral-600 mt-1">{error}</p>
            </div>
            <button onClick={fetchAnalytics} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, searchesByDate, requestsByStatus, topMatchedHomes, monthlyTrends } = data;

  return (
    <DashboardLayout title="Analytics" showSearch={false}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">Analytics Dashboard</h1>
              <p className="text-neutral-600">Track your placement search performance and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <FiBarChart2 size={24} />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Total</div>
            </div>
            <p className="text-3xl font-bold mb-1">{overview.totalSearches}</p>
            <p className="text-sm text-blue-100">Total Searches</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <FiActivity size={24} />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Total</div>
            </div>
            <p className="text-3xl font-bold mb-1">{overview.totalRequests}</p>
            <p className="text-sm text-green-100">Placement Requests</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <FiTrendingUp size={24} />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Rate</div>
            </div>
            <p className="text-3xl font-bold mb-1">{overview.successRate.toFixed(1)}%</p>
            <p className="text-sm text-purple-100">Success Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow p-6 text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <FiPieChart size={24} />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Avg</div>
            </div>
            <p className="text-3xl font-bold mb-1">{overview.avgMatchesPerSearch.toFixed(1)}</p>
            <p className="text-sm text-amber-100">Matches per Search</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-6 text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <FiCalendar size={24} />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Avg</div>
            </div>
            <p className="text-3xl font-bold mb-1">{overview.avgResponseTime}</p>
            <p className="text-sm text-indigo-100">Response Time</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Searches Timeline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow"
          >
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <FiBarChart2 className="mr-2" size={20} />
                Searches Over Time
              </h2>
            </div>
            <div className="p-6">
              {searchesByDate.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">No data available</p>
              ) : (
                <div className="space-y-3">
                  {searchesByDate.map((item, index) => {
                    const maxCount = Math.max(...searchesByDate.map((d) => d.count));
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-neutral-600">{item.date}</span>
                          <span className="font-medium text-neutral-900">{item.count}</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Requests by Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow"
          >
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <FiPieChart className="mr-2" size={20} />
                Requests by Status
              </h2>
            </div>
            <div className="p-6">
              {requestsByStatus.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">No data available</p>
              ) : (
                <div className="space-y-4">
                  {requestsByStatus.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(item.status)}`} />
                          <span className="text-sm font-medium text-neutral-900">{item.status}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-neutral-900">{item.count}</span>
                          <span className="text-xs text-neutral-600 ml-2">({item.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Top Matched Homes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
              <FiTrendingUp className="mr-2" size={20} />
              Top Matched Homes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Home Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {topMatchedHomes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No homes matched yet
                    </td>
                  </tr>
                ) : (
                  topMatchedHomes.map((home, index) => (
                    <tr key={home.homeId} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-neutral-900">{home.homeName}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-neutral-900 font-medium">{home.matchCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-neutral-900 font-medium">{home.successRate.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-neutral-200 rounded-full h-2 max-w-xs">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${home.successRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
              <FiActivity className="mr-2" size={20} />
              Monthly Trends
            </h2>
          </div>
          <div className="p-6">
            {monthlyTrends.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">No trend data available</p>
            ) : (
              <div className="space-y-4">
                {monthlyTrends.map((trend, index) => {
                  const maxValue = Math.max(
                    ...monthlyTrends.flatMap((t) => [t.searches, t.placements])
                  );

                  return (
                    <div key={index}>
                      <p className="text-sm font-medium text-neutral-900 mb-2">{trend.month}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-neutral-600">Searches</span>
                            <span className="font-medium">{trend.searches}</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${maxValue > 0 ? (trend.searches / maxValue) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-neutral-600">Placements</span>
                            <span className="font-medium">{trend.placements}</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${maxValue > 0 ? (trend.placements / maxValue) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
