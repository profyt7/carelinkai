import Link from 'next/link';
import { ReactNode } from 'react';

interface StatTileProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  description: string;
  href?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatTile({ title, value, icon, description, href, trend }: StatTileProps) {
  const content = (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl">{icon}</div>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
      {trend && (
        <div className="mt-2 flex items-center">
          <span className={`text-xs font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
