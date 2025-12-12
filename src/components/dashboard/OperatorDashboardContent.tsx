"use client";

import React, { useEffect, useState } from 'react';
import { MetricCard } from './MetricCard';
import { OccupancyTrendChart } from './OccupancyTrendChart';
import { ConversionFunnelChart } from './ConversionFunnelChart';
import { IncidentDistributionChart } from './IncidentDistributionChart';
import { AlertCard } from './AlertCard';
import { ActivityFeedItem } from './ActivityFeedItem';
import { QuickActionButton } from './QuickActionButton';
import { DashboardSkeleton } from './DashboardSkeleton';
import {
  FiUsers,
  FiUserCheck,
  FiFileText,
  FiAlertCircle,
  FiClipboard,
  FiCalendar,
  FiPlus,
  FiDownload,
} from 'react-icons/fi';
import Link from 'next/link';

interface Metrics {
  totalResidents?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  activeCaregivers?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  pendingInquiries?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  criticalIncidents?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  overdueAssessments?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  toursThisWeek?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
}

interface Charts {
  occupancyTrend: Array<{ month: string; occupancyRate: number }>;
  conversionFunnel: Array<{ stage: string; count: number }>;
  incidentDistribution: Array<{ severity: string; count: number }>;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  timestamp?: Date | string | null;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date | string;
  icon?: string;
  url?: string;
}

export function OperatorDashboardContent() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [metricsRes, chartsRes, alertsRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/metrics', { cache: 'no-store' }),
          fetch('/api/dashboard/charts', { cache: 'no-store' }),
          fetch('/api/dashboard/alerts', { cache: 'no-store' }),
          fetch('/api/dashboard/activity', { cache: 'no-store' }),
        ]);

        if (!metricsRes.ok || !chartsRes.ok || !alertsRes.ok || !activityRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [metricsData, chartsData, alertsData, activityData] = await Promise.all([
          metricsRes.json(),
          chartsRes.json(),
          alertsRes.json(),
          activityRes.json(),
        ]);

        setMetrics(metricsData);
        setCharts(chartsData);
        setAlerts(alertsData?.alerts || []);
        setActivities(activityData?.activities || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Dashboard Overview</h1>
        <p className="text-sm text-neutral-600 mt-1">Monitor your operations and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {metrics?.totalResidents && (
          <MetricCard
            title="Total Residents"
            value={metrics.totalResidents.value}
            subtitle={metrics.totalResidents.subtitle}
            icon={FiUsers}
            trend={metrics.totalResidents.trend}
            trendValue={metrics.totalResidents.trendValue}
            href="/operator/residents"
          />
        )}
        {metrics?.activeCaregivers && (
          <MetricCard
            title="Active Caregivers"
            value={metrics.activeCaregivers.value}
            subtitle={metrics.activeCaregivers.subtitle}
            icon={FiUserCheck}
            trend={metrics.activeCaregivers.trend}
            trendValue={metrics.activeCaregivers.trendValue}
            href="/operator/caregivers"
          />
        )}
        {metrics?.pendingInquiries && (
          <MetricCard
            title="Pending Inquiries"
            value={metrics.pendingInquiries.value}
            subtitle={metrics.pendingInquiries.subtitle}
            icon={FiFileText}
            trend={metrics.pendingInquiries.trend}
            trendValue={metrics.pendingInquiries.trendValue}
            href="/operator/inquiries"
          />
        )}
        {metrics?.criticalIncidents && (
          <MetricCard
            title="Critical Incidents"
            value={metrics.criticalIncidents.value}
            subtitle={metrics.criticalIncidents.subtitle}
            icon={FiAlertCircle}
            trend={metrics.criticalIncidents.trend}
            trendValue={metrics.criticalIncidents.trendValue}
            iconColor="text-red-600"
          />
        )}
        {metrics?.overdueAssessments && (
          <MetricCard
            title="Overdue Assessments"
            value={metrics.overdueAssessments.value}
            subtitle={metrics.overdueAssessments.subtitle}
            icon={FiClipboard}
            trend={metrics.overdueAssessments.trend}
            trendValue={metrics.overdueAssessments.trendValue}
            iconColor="text-amber-600"
          />
        )}
        {metrics?.toursThisWeek && (
          <MetricCard
            title="Tours This Week"
            value={metrics.toursThisWeek.value}
            subtitle={metrics.toursThisWeek.subtitle}
            icon={FiCalendar}
            trend={metrics.toursThisWeek.trend}
            trendValue={metrics.toursThisWeek.trendValue}
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {charts?.occupancyTrend && <OccupancyTrendChart data={charts.occupancyTrend} />}
        {charts?.conversionFunnel && <ConversionFunnelChart data={charts.conversionFunnel} />}
      </div>

      <div className="mb-6">
        {charts?.incidentDistribution && (
          <IncidentDistributionChart data={charts.incidentDistribution} />
        )}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Alerts & Notifications</h2>
            <Link href="/operator/inquiries" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activities && activities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Recent Activity</h2>
          </div>
          <div className="space-y-1">
            {activities.slice(0, 10).map((activity) => (
              <ActivityFeedItem key={activity.id} {...activity} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <QuickActionButton label="Add Resident" icon={FiPlus} href="/operator/residents/new" />
          <QuickActionButton label="Add Inquiry" icon={FiPlus} href="/operator/inquiries/new" />
          <QuickActionButton
            label="Schedule Tour"
            icon={FiCalendar}
            href="/operator/inquiries?status=TOUR_SCHEDULED"
          />
          <QuickActionButton label="Report Incident" icon={FiAlertCircle} href="/operator/residents" />
          <QuickActionButton label="Add Caregiver" icon={FiPlus} href="/operator/caregivers/new" />
          <QuickActionButton label="Export Data" icon={FiDownload} href="/operator/residents?export=csv" />
        </div>
      </div>
    </div>
  );
}
