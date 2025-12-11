/**
 * InquiryCardSkeleton Component
 * Loading skeleton that matches the InquiryCard layout
 */

import React from 'react';

export default function InquiryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border-2 border-neutral-200 shadow-sm p-5 animate-pulse">
      {/* Priority Flag Placeholder */}
      <div className="w-4 h-4 bg-neutral-200 rounded mb-4" />

      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Name */}
          <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2" />
          {/* Home */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-200 rounded" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
          </div>
        </div>
        {/* Status Badge */}
        <div className="h-7 w-24 bg-neutral-200 rounded-full" />
      </div>

      {/* Source Badge */}
      <div className="h-6 w-20 bg-neutral-200 rounded mb-3" />

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-200 rounded" />
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-200 rounded" />
          <div className="h-4 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>

      {/* Key Dates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="h-3 bg-neutral-200 rounded w-20 mb-1" />
          <div className="h-4 bg-neutral-200 rounded w-24" />
        </div>
        <div>
          <div className="h-3 bg-neutral-200 rounded w-16 mb-1" />
          <div className="h-4 bg-neutral-200 rounded w-20" />
        </div>
      </div>

      {/* Next Action */}
      <div className="mb-4 p-3 bg-neutral-100 rounded-md">
        <div className="h-3 bg-neutral-200 rounded w-20 mb-1" />
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
      </div>

      {/* Stage Duration */}
      <div className="h-3 bg-neutral-200 rounded w-32 mb-4" />

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-9 bg-neutral-200 rounded-md" />
        <div className="h-9 w-20 bg-neutral-200 rounded-md" />
        <div className="h-9 w-24 bg-neutral-200 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for initial loading
 */
export function InquiryCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <InquiryCardSkeleton key={index} />
      ))}
    </div>
  );
}
