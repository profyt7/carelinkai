"use client";

import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-neutral-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-neutral-200 rounded w-64"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="h-4 bg-neutral-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-neutral-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-neutral-200 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="h-6 bg-neutral-200 rounded w-40 mb-4"></div>
            <div className="h-64 bg-neutral-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
        <div className="h-6 bg-neutral-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
