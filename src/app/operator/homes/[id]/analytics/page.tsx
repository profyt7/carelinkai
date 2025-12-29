'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Calendar, 
  Activity, Star, AlertTriangle, Clock, Target
} from 'lucide-react';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78'];

type AnalyticsData = {
  home: { id: string; name: string; capacity: number };
  occupancy: any;
  inquiries: any;
  financial: any;
  demographics: any;
  staff: any;
  incidents: any;
  reviews: any;
  comparison: any;
};

export default function HomeAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const homeId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('6months');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/operator/homes/${homeId}/analytics`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch analytics');
        }
        
        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (err: any) {
        console.error('Failed to load analytics:', err);
        setError(err?.message ?? 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [homeId, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
          <p className="text-neutral-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <p className="font-medium">Error loading analytics</p>
          <p className="text-sm mt-1">{error ?? 'An error occurred'}</p>
          <button
            onClick={() => router.back()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: any) => (
    <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-3xl font-bold text-neutral-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 bg-${color}-50 rounded-lg`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  );

  // Prepare chart data
  const careLevelData = Object.entries(data.occupancy.byCareLevel).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  const inquiryFunnelData = Object.entries(data.inquiries.funnel).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  const ageData = Object.entries(data.demographics.ageDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const genderData = Object.entries(data.demographics.genderDistribution)
    .filter(([_, value]) => (value as number) > 0)
    .map(([name, value]) => ({ name, value: value as number }));

  const incidentSeverityData = Object.entries(data.incidents.bySeverity).map(([name, value]) => ({
    name,
    value,
  }));

  const ratingData = Object.entries(data.reviews.distribution).map(([name, value]) => ({
    name: `${name} stars`,
    value,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Homes', href: '/operator/homes' },
        { label: data.home.name, href: `/operator/homes/${homeId}` },
        { label: 'Analytics' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{data.home.name}</h1>
          <p className="text-neutral-600 mt-1">Facility Analytics Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          <button
            onClick={() => router.push(`/operator/homes/${homeId}`)}
            className="px-4 py-2 bg-neutral-600 text-white rounded-md hover:bg-neutral-700"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy Rate"
          value={`${data.occupancy.rate}%`}
          subtitle={`${data.occupancy.current} / ${data.home.capacity} beds`}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${data.financial.monthlyRevenue.toLocaleString()}`}
          subtitle={`$${data.financial.revenuePerResident.toLocaleString()}/resident`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.inquiries.conversionRate}%`}
          subtitle={`${data.inquiries.total} total inquiries`}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Average Rating"
          value={data.reviews.avgRating.toFixed(1)}
          subtitle={`${data.reviews.total} reviews`}
          icon={Star}
          color="yellow"
        />
      </div>

      {/* Occupancy Analytics */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Occupancy Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Occupancy Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.occupancy.trend}>
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Month', position: 'insideBottom', offset: -15, style: { fontSize: 11 } }}
                />
                <YAxis 
                  tickLine={false} 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#60B5FF" 
                  strokeWidth={2} 
                  dot={{ fill: '#60B5FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Occupancy by Care Level</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={careLevelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent && percent * 100).toFixed(0) || 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {careLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-200">
          <div>
            <p className="text-sm text-neutral-600">Avg Length of Stay</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.occupancy.avgLengthOfStay} days</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Turnover Rate</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.occupancy.turnoverRate}%</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Available Beds</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.home.capacity - data.occupancy.current}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Active Residents</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.occupancy.current}</p>
          </div>
        </div>
      </div>

      {/* Inquiry & Conversion Analytics */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Inquiry & Conversion Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Inquiry Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inquiryFunnelData} layout="vertical">
                <XAxis type="number" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tickLine={false} 
                  tick={{ fontSize: 9 }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#60B5FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Tours This Month</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{data.inquiries.toursThisMonth}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Conversion Rate</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">{data.inquiries.conversionRate}%</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Total Inquiries</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">{data.inquiries.total}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Financial Overview</h2>
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.financial.revenueTrend}>
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                tick={{ fontSize: 10 }}
                label={{ value: 'Month', position: 'insideBottom', offset: -15, style: { fontSize: 11 } }}
              />
              <YAxis 
                tickLine={false} 
                tick={{ fontSize: 10 }}
                label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#72BF78" 
                strokeWidth={2} 
                dot={{ fill: '#72BF78' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-200">
          <div>
            <p className="text-sm text-neutral-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">${data.financial.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Revenue/Resident</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">${data.financial.revenuePerResident.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Projected Annual</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">${data.financial.projectedAnnualRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Performance Score</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.comparison.performanceScore}/100</p>
          </div>
        </div>
      </div>

      {/* Demographics & Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Resident Demographics</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Age Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageData}>
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF9149" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent && percent * 100).toFixed(0) || 0}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-600">Average Age</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{data.demographics.avgAge} years</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Staff Utilization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Total Staff</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{data.staff.total}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-900">Staff:Resident Ratio</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">1:{Math.round(1 / (data.staff.staffToResidentRatio || 1))}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">Shifts This Month</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{data.staff.shiftsThisMonth}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-900">Avg Hours/Caregiver</p>
              <p className="text-3xl font-bold text-orange-700 mt-2">{data.staff.avgHoursPerCaregiver}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Incident Tracking</h2>
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Incidents by Severity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentSeverityData}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF6363" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">Total Incidents</p>
              <p className="text-2xl font-bold text-neutral-900">{data.incidents.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Reviews & Ratings</h2>
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratingData}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#A19AD3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-neutral-900">{data.reviews.avgRating.toFixed(1)}</p>
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-600">Total Reviews</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{data.reviews.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Facility Comparison */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Facility Comparison</h2>
        <div className="mb-4">
          <p className="text-sm text-neutral-600">
            Ranking: <span className="font-bold text-neutral-900">#{data.comparison.ranking}</span> of {data.comparison.totalFacilities} facilities
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            Performance Score: <span className="font-bold text-neutral-900">{data.comparison.performanceScore}/100</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Facility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Occupancy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase">Inquiries</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {data.comparison.facilities.map((facility: any) => (
                <tr 
                  key={facility.id} 
                  className={facility.id === homeId ? 'bg-primary-50' : ''}
                >
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {facility.name}
                    {facility.id === homeId && (
                      <span className="ml-2 text-xs font-semibold text-primary-600">(Current)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{facility.occupancy}%</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">${facility.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      {facility.rating}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{facility.inquiries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
