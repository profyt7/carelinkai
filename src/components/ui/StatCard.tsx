import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';
  alert?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'blue', 
  alert,
  className = '' 
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };
  
  return (
    <div 
      className={`
        bg-white rounded-lg border p-4 sm:p-6 transition-all duration-200 hover:shadow-md
        ${alert ? 'border-yellow-400 border-2 shadow-sm' : 'border-neutral-200'}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
