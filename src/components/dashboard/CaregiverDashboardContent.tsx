"use client";

import React, { useEffect, useState } from 'react';
import { MetricCard } from './MetricCard';
import { AlertCard } from './AlertCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Users, Clipboard, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Metrics {
  myResidents?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  todayTasks?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  upcomingShifts?: {
    value: number;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
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

export function CaregiverDashboardContent() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [metricsRes, alertsRes] = await Promise.all([
          fetch('/api/dashboard/metrics', { cache: 'no-store' }),
          fetch('/api/dashboard/alerts', { cache: 'no-store' }),
        ]);

        if (!metricsRes.ok || !alertsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [metricsData, alertsData] = await Promise.all([
          metricsRes.json(),
          alertsRes.json(),
        ]);

        setMetrics(metricsData);
        setAlerts(alertsData?.alerts || []);
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">My Dashboard</h1>
        <p className="text-sm text-neutral-600 mt-1">Manage your residents and daily tasks</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {metrics?.myResidents && (
          <MetricCard
            title="My Residents"
            value={metrics.myResidents.value}
            subtitle={metrics.myResidents.subtitle}
            icon={Users}
            trend={metrics.myResidents.trend}
            href="/operator/residents"
          />
        )}
        {metrics?.todayTasks && (
          <MetricCard
            title="Today's Tasks"
            value={metrics.todayTasks.value}
            subtitle={metrics.todayTasks.subtitle}
            icon={Clipboard}
            trend={metrics.todayTasks.trend}
            iconColor="text-amber-600"
          />
        )}
        {metrics?.upcomingShifts && (
          <MetricCard
            title="Upcoming Shifts"
            value={metrics.upcomingShifts.value}
            subtitle={metrics.upcomingShifts.subtitle}
            icon={Calendar}
            trend={metrics.upcomingShifts.trend}
            href="/shifts"
          />
        )}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Today's Tasks & Shifts</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/operator/residents"
            className="bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <Users size={24} className="text-primary-600" />
              <div>
                <h3 className="font-medium text-neutral-900">My Residents</h3>
                <p className="text-sm text-neutral-600">View assigned residents</p>
              </div>
            </div>
          </Link>
          <Link
            href="/shifts"
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <Calendar size={24} className="text-blue-600" />
              <div>
                <h3 className="font-medium text-neutral-900">My Schedule</h3>
                <p className="text-sm text-neutral-600">View shifts</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
