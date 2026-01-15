'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FiUsers,
  FiHome,
  FiFileText,
  FiTrendingUp,
  FiActivity,
  FiPercent,
  FiRefreshCw,
} from 'react-icons/fi';

interface KPIs {
  totalUsers: number;
  newUsersInPeriod: number;
  totalInquiries: number;
  newInquiriesInPeriod: number;
  totalHomes: number;
  occupancyRate: number;
  conversionRate: number;
  recentLogins: number;
  capacity: number;
  occupancy: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface GrowthData {
  date: string;
  count: number;
}

interface AnalyticsData {
  kpis: KPIs;
  charts: {
    userRoleDistribution: ChartData[];
    userStatusDistribution: ChartData[];
    inquiryStatusDistribution: ChartData[];
    homeStatusDistribution: ChartData[];
    userGrowthData: GrowthData[];
    inquiryGrowthData: GrowthData[];
    activityByType: ChartData[];
  };
  timeRange: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10B981',
  PENDING: '#F59E0B',
  INACTIVE: '#6B7280',
  SUSPENDED: '#EF4444',
  NEW: '#3B82F6',
  CONTACTED: '#8B5CF6',
  TOURED: '#06B6D4',
  CONVERTED: '#10B981',
  CLOSED: '#6B7280',
  DRAFT: '#9CA3AF',
  PUBLISHED: '#10B981',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch analytics');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const KPICard = ({ title, value, subValue, icon: Icon, color }: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, charts } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-1">Platform performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Users"
            value={kpis.totalUsers.toLocaleString()}
            subValue={`+${kpis.newUsersInPeriod} in period`}
            icon={FiUsers}
            color="bg-blue-500"
          />
          <KPICard
            title="Total Inquiries"
            value={kpis.totalInquiries.toLocaleString()}
            subValue={`+${kpis.newInquiriesInPeriod} in period`}
            icon={FiFileText}
            color="bg-purple-500"
          />
          <KPICard
            title="Total Homes"
            value={kpis.totalHomes.toLocaleString()}
            subValue={`${kpis.occupancy}/${kpis.capacity} occupied`}
            icon={FiHome}
            color="bg-emerald-500"
          />
          <KPICard
            title="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            subValue={`${kpis.occupancyRate}% occupancy`}
            icon={FiPercent}
            color="bg-amber-500"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-blue-500" />
              User Growth
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Inquiry Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-purple-500" />
              Inquiry Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.inquiryGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                  name="New Inquiries"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Role Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUsers className="text-blue-500" />
              Users by Role
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={charts.userRoleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.userRoleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Inquiry Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiFileText className="text-purple-500" />
              Inquiries by Status
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={charts.inquiryStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.inquiryStatusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Home Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiHome className="text-emerald-500" />
              Homes by Status
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={charts.homeStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.homeStatusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiActivity className="text-emerald-500" />
            Activity by Type (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={charts.activityByType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11 }} 
                stroke="#6B7280"
                width={120}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
              />
              <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Stats */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-500">Recent Logins (7d)</p>
              <p className="text-xl font-bold text-gray-900">{kpis.recentLogins.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-xl font-bold text-emerald-600">{kpis.occupancyRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Capacity</p>
              <p className="text-xl font-bold text-gray-900">{kpis.capacity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Occupancy</p>
              <p className="text-xl font-bold text-blue-600">{kpis.occupancy.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
