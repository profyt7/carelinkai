"use client";

import React from 'react';

export function CaregiverCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Avatar Skeleton */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-neutral-200"></div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name and Status */}
          <div className="space-y-2">
            <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
            <div className="flex items-center gap-2">
              <div className="h-4 bg-neutral-200 rounded w-24"></div>
              <div className="h-5 bg-neutral-200 rounded-full w-16"></div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-1.5">
            <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          </div>

          {/* Badges/Tags */}
          <div className="flex gap-2">
            <div className="h-6 bg-neutral-200 rounded-full w-20"></div>
            <div className="h-6 bg-neutral-200 rounded-full w-24"></div>
            <div className="h-6 bg-neutral-200 rounded-full w-16"></div>
          </div>
        </div>

        {/* Action Badges Skeleton */}
        <div className="flex-shrink-0 flex gap-1">
          <div className="h-7 bg-neutral-200 rounded-full w-20"></div>
        </div>
      </div>
    </div>
  );
}

export function CaregiverCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CaregiverCardSkeleton key={index} />
      ))}
    </div>
  );
}
