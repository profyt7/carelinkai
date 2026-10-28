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
  FiDollarSign,
  FiCreditCard,
  FiLink,
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
  [key: string]: unknown;
}

interface GrowthData {
  date: string;
  count: number;
}

interface RevenuePayment {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null; email: string } | null;
}

interface SubscriptionBreakdownItem {
  plan: string | null;
  status: string | null;
  count: number;
}

interface Revenue {
  mrr: number;
  activeSubscribers: number;
  planCounts: Record<string, number>;
  placementFeesCollected: number;
  placementFeesPending: number;
  placementFeesCollectedCount: number;
  affiliateCommissionsOwed: number;
  affiliateCommissionsOwedCount: number;
  recentPayments: RevenuePayment[];
  subscriptionBreakdown: SubscriptionBreakdownItem[];
}

interface AnalyticsData {
  kpis: KPIs;
  revenue: Revenue;
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
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        credentials: 'include',
      });
      
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
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-neutral-500 mt-1">{subValue}</p>
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-neutral-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-error-200 p-8 text-center">
          <p className="text-error-600 font-medium">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, revenue, charts } = data;

  const fmt$ = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const PLAN_ORDER = ['STARTER', 'PROFESSIONAL', 'GROWTH', 'ENTERPRISE'];
  const PLAN_COLORS: Record<string, string> = {
    STARTER: 'bg-primary-100 text-primary-800',
    PROFESSIONAL: 'bg-secondary-100 text-secondary-800',
    GROWTH: 'bg-emerald-100 text-emerald-800',
    ENTERPRISE: 'bg-amber-100 text-amber-800',
  };
  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    PLACEMENT_FEE: 'Placement Fee',
    AFFILIATE_COMMISSION: 'Affiliate Commission',
    DEPOSIT: 'Deposit',
    MONTHLY_FEE: 'Monthly Fee',
  };
  const PAYMENT_STATUS_COLORS: Record<string, string> = {
    COMPLETED: 'text-emerald-700 bg-emerald-50',
    PENDING: 'text-amber-700 bg-amber-50',
    PROCESSING: 'text-primary-700 bg-primary-50',
    FAILED: 'text-error-700 bg-error-50',
    REFUNDED: 'text-neutral-700 bg-neutral-100',
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
            <p className="text-neutral-500 mt-1">Platform performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
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
            color="bg-primary-500"
          />
          <KPICard
            title="Total Inquiries"
            value={kpis.totalInquiries.toLocaleString()}
            subValue={`+${kpis.newInquiriesInPeriod} in period`}
            icon={FiFileText}
            color="bg-secondary-500"
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

        {/* Revenue Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <FiDollarSign className="text-emerald-500" />
            Revenue
          </h2>

          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <KPICard
              title="Monthly Recurring Revenue"
              value={fmt$(revenue.mrr)}
              subValue={`${revenue.activeSubscribers} active subscribers`}
              icon={FiDollarSign}
              color="bg-emerald-500"
            />
            <KPICard
              title="Placement Fees Collected"
              value={fmt$(revenue.placementFeesCollected)}
              subValue={`${revenue.placementFeesCollectedCount} completed`}
              icon={FiCreditCard}
              color="bg-primary-500"
            />
            <KPICard
              title="Placement Fees Pending"
              value={fmt$(revenue.placementFeesPending)}
              subValue="In processing"
              icon={FiCreditCard}
              color="bg-amber-500"
            />
            <KPICard
              title="Affiliate Commissions Owed"
              value={fmt$(revenue.affiliateCommissionsOwed)}
              subValue={`${revenue.affiliateCommissionsOwedCount} pending payouts`}
              icon={FiLink}
              color="bg-secondary-500"
            />
          </div>

          {/* Subscription plan breakdown + recent payments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Subscriptions by Plan</h3>
              <div className="space-y-3">
                {PLAN_ORDER.map((plan) => {
                  const count = revenue.planCounts[plan] || 0;
                  return (
                    <div key={plan} className="flex items-center justify-between">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[plan] || 'bg-neutral-100 text-neutral-700'}`}>
                        {plan}
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">{count}</span>
                    </div>
                  );
                })}
                {revenue.subscriptionBreakdown
                  .filter(r => r.status === 'TRIALING')
                  .map(r => (
                    <div key={`trial-${r.plan}`} className="flex items-center justify-between text-neutral-500">
                      <span className="text-xs">{r.plan} (trial)</span>
                      <span className="text-sm font-medium">{r.count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent payments table */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Recent Payments</h3>
              {revenue.recentPayments.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-8">No payments recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-neutral-500 border-b border-neutral-100">
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Amount</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {revenue.recentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50">
                          <td className="py-2 text-neutral-700">
                            {PAYMENT_TYPE_LABELS[p.type] || p.type}
                          </td>
                          <td className="py-2 font-medium text-neutral-900">{fmt$(p.amount)}</td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] || 'bg-neutral-100 text-neutral-700'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2 text-neutral-600 truncate max-w-[120px]">
                            {p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || p.user.email : '—'}
                          </td>
                          <td className="py-2 text-neutral-500">
                            {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-primary-500" />
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
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-secondary-500" />
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
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiUsers className="text-primary-500" />
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
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FiFileText className="text-secondary-500" />
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
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
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
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
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
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm text-neutral-500">Recent Logins (7d)</p>
              <p className="text-xl font-bold text-neutral-900">{kpis.recentLogins.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Occupancy Rate</p>
              <p className="text-xl font-bold text-emerald-600">{kpis.occupancyRate}%</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Capacity</p>
              <p className="text-xl font-bold text-neutral-900">{kpis.capacity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Current Occupancy</p>
              <p className="text-xl font-bold text-primary-600">{kpis.occupancy.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
