'use client';

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiUsers, FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import InquiryStatusBadge from './InquiryStatusBadge';
import Link from 'next/link';

interface PipelineStats {
  total: number;
  converted: number;
  conversionRate: number;
  byStatus: Record<string, number>;
}

interface StageMetric {
  status: string;
  count: number;
  avgDaysInStage: number;
}

interface RecentConversion {
  id: string;
  conversionDate: string;
  family: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  home: {
    name: string;
  };
  convertedResident: {
    id: string;
    firstName: string;
    lastName: string;
  };
  convertedBy: {
    firstName: string;
    lastName: string;
  };
}

interface PipelineData {
  stats: PipelineStats;
  pipeline: Array<{ status: string; count: number }>;
  stageMetrics: StageMetric[];
  recentConversions: RecentConversion[];
}

export default function ConversionPipelineDashboard() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      const response = await fetch('/api/operator/inquiries/pipeline');
      if (!response.ok) throw new Error('Failed to fetch pipeline data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{ error || 'Failed to load pipeline data'}</p>
      </div>
    );
  }

  const { stats, pipeline, stageMetrics, recentConversions } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inquiries"
          value={stats.total}
          icon={<FiUsers />}
          color="blue"
        />
        <MetricCard
          title="Converted"
          value={stats.converted}
          icon={<FiCheckCircle />}
          color="green"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={<FiTrendingUp />}
          color="purple"
        />
        <MetricCard
          title="In Pipeline"
          value={stats.total - stats.converted - (stats.byStatus.CLOSED_LOST || 0)}
          icon={<FiClock />}
          color="yellow"
        />
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Pipeline</h3>
        <div className="space-y-3">
          {stageMetrics.map((stage, idx) => (
            <div key={stage.status} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <InquiryStatusBadge status={stage.status as any} size="sm" />
                  <span className="text-sm font-medium text-gray-900">{stage.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(stage.count / stats.total) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-600 w-24 text-right">
                {stage.avgDaysInStage.toFixed(1)} days avg
              </div>
              {idx < stageMetrics.length - 1 && (
                <FiArrowRight className="text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Conversions */}
      {recentConversions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Conversions</h3>
          <div className="space-y-3">
            {recentConversions.map((conversion) => (
              <div
                key={conversion.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <Link
                    href={`/operator/residents/${conversion.convertedResident.id}`}
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    {conversion.convertedResident.firstName}{' '}
                    {conversion.convertedResident.lastName}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {conversion.home.name} • Converted by{' '}
                    {conversion.convertedBy.firstName} {conversion.convertedBy.lastName}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(conversion.conversionDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
        </div>
      </div>
    </div>
  );
}
