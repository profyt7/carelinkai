'use client';

import { TrendingUp, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AnalyticsCardsProps {
  stats: {
    totalInquiries: number;
    newThisWeek: number;
    requiresAttention: number;
    conversionRate: number;
    pendingFollowUps: number;
    isLoading?: boolean;
    error?: any;
  };
}

export function AnalyticsCards({ stats }: AnalyticsCardsProps) {
  const cards = [
    {
      title: 'Total Inquiries',
      value: stats.totalInquiries,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'New This Week',
      value: stats.newThisWeek,
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Requires Attention',
      value: stats.requiresAttention,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      iconBg: 'bg-red-100',
      highlight: stats.requiresAttention > 0,
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Pending Follow-ups',
      value: stats.pendingFollowUps,
      icon: Clock,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
  ];

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`${card.bgColor} rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
              card.highlight ? 'ring-2 ring-red-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
              <div className={`${card.iconBg} rounded-lg p-3`}>
                <Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
