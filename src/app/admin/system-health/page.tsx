'use client';

import { useState, useEffect } from 'react';

interface HealthMetrics {
  status: string;
  timestamp: string;
  responseTime: number;
  metrics: {
    database: {
      status: string;
      responseTime: number;
      error: string | null;
    };
    statistics: {
      totalUsers: number;
      totalHomes: number;
      totalInquiries: number;
      activeSessions: number;
    };
    errors: {
      last24Hours: number;
      errorRate: number;
    };
    performance: {
      dbResponseTime: number;
      avgApiResponseTime: number;
    };
    uptime: {
      status: string;
      lastDeployment: string;
    };
  };
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/health');
      if (!response.ok) throw new Error('Failed to fetch health');
      
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading && !health) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-gray-600">Loading system health...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-2">
            Monitor platform status and performance
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {health && (
        <>
          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Status</h3>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.status)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                    {health.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Last Check</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(health.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Response time: {health.responseTime}ms
                </div>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.metrics.database.status)}
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(health.metrics.database.status)}`}>
                    {health.metrics.database.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Response Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {health.metrics.database.responseTime}ms
                </div>
              </div>
              {health.metrics.database.error && (
                <div className="col-span-full">
                  <div className="text-sm text-gray-600 mb-1">Error</div>
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {health.metrics.database.error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Total Users"
              value={health.metrics.statistics.totalUsers}
              color="blue"
            />
            <StatCard
              title="Total Homes"
              value={health.metrics.statistics.totalHomes}
              color="green"
            />
            <StatCard
              title="Total Inquiries"
              value={health.metrics.statistics.totalInquiries}
              color="purple"
            />
            <StatCard
              title="Active Sessions"
              subtitle="Last 24h"
              value={health.metrics.statistics.activeSessions}
              color="orange"
            />
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Database Response Time</div>
                <div className="text-3xl font-bold text-blue-600">
                  {health.metrics.performance.dbResponseTime}ms
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {health.metrics.performance.dbResponseTime < 100 ? '✓ Excellent' : 
                   health.metrics.performance.dbResponseTime < 500 ? '⚠ Good' : '⚠ Needs Attention'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Avg API Response Time</div>
                <div className="text-3xl font-bold text-green-600">
                  {health.metrics.performance.avgApiResponseTime.toFixed(3)}s
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Average across recent requests
                </div>
              </div>
            </div>
          </div>

          {/* Error Metrics */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Errors (Last 24h)</div>
                <div className="text-3xl font-bold text-red-600">
                  {health.metrics.errors.last24Hours}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Error Rate</div>
                <div className="text-3xl font-bold text-orange-600">
                  {health.metrics.errors.errorRate}/hour
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Uptime Status</div>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(health.metrics.uptime.status)}`}>
                  {health.metrics.uptime.status}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Last Deployment</div>
                <div className="text-sm font-medium text-gray-900">
                  {health.metrics.uptime.lastDeployment}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  color, 
  subtitle 
}: { 
  title: string; 
  value: number; 
  color: string; 
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  }[color];

  return (
    <div className={`${colorClasses} border rounded-lg p-4`}>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
    </div>
  );
}
