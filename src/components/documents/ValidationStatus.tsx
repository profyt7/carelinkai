'use client';

import React, { useState } from 'react';
import { ValidationStatus as ValidationStatusEnum } from '@prisma/client';

interface ValidationStatusProps {
  status: ValidationStatusEnum;
  errors?: any;
  showDetails?: boolean;
}

const statusConfig: Record<ValidationStatusEnum, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  VALID: {
    label: 'Valid',
    icon: '✓',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
  },
  INVALID: {
    label: 'Invalid',
    icon: '✗',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
  },
  NEEDS_REVIEW: {
    label: 'Needs Review',
    icon: '⚠',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
  },
  PENDING: {
    label: 'Pending',
    icon: '⏳',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-500',
  },
};

export default function ValidationStatus({ status, errors, showDetails = false }: ValidationStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[status];
  
  const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
  const errorArray = Array.isArray(errors) ? errors : errors ? Object.values(errors).flat() : [];

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor} ${config.color}`}
      >
        <span className="text-lg font-bold">{config.icon}</span>
        <span className="font-semibold text-sm">{config.label}</span>
        
        {hasErrors && showDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-xs underline hover:no-underline focus:outline-none"
          >
            {isExpanded ? 'Hide' : 'Show'} details
          </button>
        )}
      </div>

      {/* Expandable error details */}
      {hasErrors && showDetails && isExpanded && (
        <div className="ml-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Validation Issues:
          </div>
          <ul className="space-y-1.5">
            {errorArray.map((error: any, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-red-500 font-bold mt-0.5">•</span>
                <span className="text-gray-700">
                  {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
