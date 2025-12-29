'use client';

import { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { FiUsers, FiUserCheck, FiUserX, FiActivity, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import { StatCard } from '@/components/ui/StatCard';
import { calculateResidentAnalytics, ResidentForAnalytics } from '@/lib/resident-analytics';

interface ResidentAnalyticsProps {
  residents: ResidentForAnalytics[];
  totalCapacity?: number;
}

export function ResidentAnalytics({ residents, totalCapacity = 100 }: ResidentAnalyticsProps) {
  const analytics = useMemo(() => calculateResidentAnalytics(residents, totalCapacity), [residents, totalCapacity]);

  if (residents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No resident data available for analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Residents"
          value={analytics.totalResidents}
          icon={<FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${analytics.recentAdmissions} new this month`}
          color="blue"
        />
        <StatCard
          title="Active Residents"
          value={analytics.activeResidents}
          icon={<FiUserCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={`${Math.round((analytics.activeResidents / analytics.totalResidents) * 100)}% of total`}
          color="green"
        />
        <StatCard
          title="Average Age"
          value={`${analytics.averageAge} years`}
          icon={<FiActivity className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="purple"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${analytics.occupancyRate}%`}
          icon={<FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          subtitle={analytics.occupancyRate >= 90 ? 'High occupancy' : 'Capacity available'}
          color="orange"
          alert={analytics.occupancyRate >= 90}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Care Level Distribution */}
        {analytics.byCareLevelData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Care Level Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.byCareLevelData}
                  dataKey="count"
                  nameKey="careLevel"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => `${entry.careLevel || entry.name}: ${entry.percent?.toFixed(0) || 0}%`}
                >
                  {analytics.byCareLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Age Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.ageDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageRange" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Admission Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Admission Trends (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.admissionTrendsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Admissions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Breakdown */}
      {analytics.byStatusData.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Resident Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.byStatusData.map((item) => (
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
    </div>
  );
}
