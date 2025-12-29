"use client";

import React, { useMemo } from 'react';
import { 
  FiUsers, 
  FiUserCheck, 
  FiAlertTriangle, 
  FiBriefcase 
} from 'react-icons/fi';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  ResponsiveContainer 
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { 
  computeCaregiverAnalytics,
  CaregiverForAnalytics 
} from '@/lib/caregiver-analytics';

interface CaregiverAnalyticsProps {
  caregivers: CaregiverForAnalytics[];
}

export function CaregiverAnalytics({ caregivers }: CaregiverAnalyticsProps) {
  const analytics = useMemo(
    () => computeCaregiverAnalytics(caregivers),
    [caregivers]
  );

  if (caregivers.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No caregiver data available for analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Caregivers"
          value={analytics.totalCaregivers}
          icon={<FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="blue"
        />
        
        <StatCard
          title="Active Caregivers"
          value={analytics.activeCaregivers}
          subtitle={`${analytics.inactiveCaregivers} inactive`}
          icon={<FiUserCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="green"
        />
        
        <StatCard
          title="Certifications Expiring"
          value={analytics.expiringSoonCerts}
          subtitle="Next 30 days"
          icon={<FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="yellow"
          alert={analytics.expiringSoonCerts > 0}
        />
        
        <StatCard
          title="Current Assignments"
          value={analytics.currentAssignments}
          icon={<FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certification Status Distribution */}
        {analytics.certificationStatusData.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Certification Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.certificationStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.certificationStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Employment Type Distribution */}
        {analytics.employmentTypeData.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Employment Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.employmentTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Assignment Distribution - Full Width */}
      {analytics.assignmentData.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Current Assignment Distribution (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.assignmentData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="caregiver" 
                type="category"
                width={150}
                style={{ fontSize: '12px' }}
              />
              <Tooltip />
              <Bar dataKey="assignments" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
