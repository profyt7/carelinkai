"use client";

import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-200 rounded ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Shimmer className="h-3 w-16 mb-2" />
        <Shimmer className="h-7 w-52" />
      </div>

      {/* Metric cards — Direction B top-border style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[0,1,2,3,4,5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 border-t-4 border-t-neutral-200 p-5">
            <div className="mb-4">
              <Shimmer className="h-9 w-9 rounded-lg" />
            </div>
            <Shimmer className="h-8 w-20 mb-2" />
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-28" />
              <Shimmer className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6">
            <Shimmer className="h-5 w-40 mb-4" />
            <Shimmer className="h-64 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
        <Shimmer className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
