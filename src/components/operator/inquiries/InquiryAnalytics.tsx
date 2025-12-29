'use client';

import { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { FiUsers, FiUserCheck, FiTrendingUp, FiClock, FiCalendar, FiTarget } from 'react-icons/fi';
import { StatCard } from '@/components/ui/StatCard';
import { calculateInquiryAnalytics, InquiryForAnalytics } from '@/lib/inquiry-analytics';

interface InquiryAnalyticsProps {
  inquiries: InquiryForAnalytics[];
}

export function InquiryAnalytics({ inquiries }: InquiryAnalyticsProps) {
  const analytics = useMemo(() => calculateInquiryAnalytics(inquiries), [inquiries]);

  if (inquiries.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No inquiry data available for analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inquiries"
          value={analytics.totalInquiries}
          icon={<FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${analytics.activeInquiries} active`}
          color="blue"
        />
        <StatCard
          title="Conversion Rate"
          value={`${analytics.conversionRate}%`}
          icon={<FiTarget className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${analytics.convertedInquiries} converted`}
          color="green"
        />
        <StatCard
          title="Avg. Time to Convert"
          value={`${analytics.averageTimeToConversion} days`}
          icon={<FiClock className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${analytics.averageResponseTime}h response time`}
          color="purple"
        />
        <StatCard
          title="Tour Completion"
          value={`${analytics.tourMetrics.tourCompletionRate}%`}
          icon={<FiCalendar className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${analytics.tourMetrics.toursCompleted}/${analytics.tourMetrics.toursScheduled} tours`}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.conversionFunnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Distribution */}
        {analytics.bySourceData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Inquiry Sources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.bySourceData}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                >
                  {analytics.bySourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Monthly Trends (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.monthlyTrendsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="inquiries" stroke="#3b82f6" strokeWidth={2} name="Inquiries" />
            <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Breakdown */}
      {analytics.byStatusData.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Inquiry Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {analytics.byStatusData.slice(0, 10).map((item) => (
              <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold" style={{ color: item.fill }}>
                  {item.count}
                </div>
                <div className="text-sm text-gray-600 mt-1">{item.status}</div>
                <div className="text-xs text-gray-500 mt-1">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Breakdown */}
      {analytics.byPriorityData.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.byPriorityData.map((item) => (
              <div key={item.priority} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold" style={{ color: item.fill }}>
                  {item.count}
                </div>
                <div className="text-sm text-gray-600 mt-1">{item.priority}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tour Metrics Detail */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Tour Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{analytics.tourMetrics.toursScheduled}</div>
            <div className="text-sm text-gray-600 mt-1">Tours Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{analytics.tourMetrics.toursCompleted}</div>
            <div className="text-sm text-gray-600 mt-1">Tours Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{analytics.tourMetrics.averageDaysToTour}</div>
            <div className="text-sm text-gray-600 mt-1">Avg Days to Tour</div>
          </div>
        </div>
      </div>
    </div>
  );
}
