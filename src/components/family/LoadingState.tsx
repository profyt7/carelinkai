'use client';

import React from 'react';

interface LoadingStateProps {
  type?: 'cards' | 'list' | 'table';
  count?: number;
}

export default function LoadingState({ type = 'cards', count = 3 }: LoadingStateProps) {
  if (type === 'cards') {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-6 shadow-sm animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 w-1/3 bg-gray-200 rounded mb-4"></div>
            <div className="flex gap-2 mb-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-3 w-12 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="mt-4 flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-gray-200"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-6 shadow-sm animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
      ))}
    </div>
  );
}
