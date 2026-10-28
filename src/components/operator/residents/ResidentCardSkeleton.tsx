"use client";

import React from 'react';

/**
 * Skeleton loader for resident cards
 * Matches the layout of ResidentCard component
 */
export function ResidentCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Avatar Skeleton */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-full bg-neutral-200" />
        </div>
        
        {/* Main Info Skeleton */}
        <div className="flex-1 space-y-3">
          {/* Name */}
          <div className="h-6 bg-neutral-200 rounded w-48" />
          
          {/* Badges */}
          <div className="flex items-center gap-2">
            <div className="h-6 bg-neutral-200 rounded-full w-24" />
            <div className="h-6 bg-neutral-200 rounded-full w-32" />
          </div>
          
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-20" />
              <div className="h-4 bg-neutral-200 rounded w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-24" />
              <div className="h-4 bg-neutral-200 rounded w-20" />
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-2 mt-3">
            <div className="h-6 bg-neutral-200 rounded-full w-32" />
            <div className="h-6 bg-neutral-200 rounded-full w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Multiple skeleton cards for loading lists
 */
export function ResidentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <ResidentCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Skeleton for table row
 */
export function ResidentTableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-neutral-200" />
          <div className="space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-32" />
            <div className="h-3 bg-neutral-200 rounded w-24" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded w-16" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded w-12" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-neutral-200 rounded-full w-20" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded w-24" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="h-8 bg-neutral-200 rounded w-20 ml-auto" />
      </td>
    </tr>
  );
}

/**
 * Multiple table row skeletons
 */
export function ResidentTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ResidentTableRowSkeleton key={index} />
      ))}
    </>
  );
}
