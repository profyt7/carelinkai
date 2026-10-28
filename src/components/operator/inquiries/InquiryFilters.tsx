/**
 * InquiryFilters Component
 * Advanced filtering options for inquiries
 * - Status filter (multi-select)
 * - Source filter
 * - Priority filter
 * - Date range picker
 * - Assigned to filter
 * - Follow-up status filter
 * - Tour status filter
 * - Age filter
 * - Quick filter presets
 * - Persistent filters (localStorage)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InquiryStatus } from '@prisma/client';
import {
  FiFilter,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiSave,
} from 'react-icons/fi';
import { getAllInquiryStatuses } from '@/lib/inquiry-utils';

export interface InquiryFiltersState {
  // Status filter (multi-select)
  statuses: InquiryStatus[];
  // Source filter
  sources: string[];
  // Priority filter
  priorities: ('high' | 'normal')[];
  // Date range
  dateFrom: string;
  dateTo: string;
  // Assigned to
  assignedTo: string;
  // Home filter
  homeId: string;
  // Follow-up status
  followupStatus: 'overdue' | 'today' | 'week' | 'none' | 'all';
  // Tour status
  tourStatus: 'scheduled' | 'completed' | 'none' | 'all';
  // Age filter
  ageFilter: 'new' | 'recent' | 'aging' | 'old' | 'all';
}

export const defaultFilters: InquiryFiltersState = {
  statuses: [],
  sources: [],
  priorities: [],
  dateFrom: '',
  dateTo: '',
  assignedTo: '',
  homeId: '',
  followupStatus: 'all',
  tourStatus: 'all',
  ageFilter: 'all',
};

interface InquiryFiltersProps {
  filters: InquiryFiltersState;
  onFiltersChange: (filters: InquiryFiltersState) => void;
  homes?: Array<{ id: string; name: string }>;
  staff?: Array<{ id: string; name: string }>;
  isFamily?: boolean;
}

// Quick filter presets
const filterPresets = [
  {
    id: 'needs-followup',
    label: 'Needs Follow-up',
    filters: {
      statuses: ['NEW', 'CONTACTED'] as InquiryStatus[],
      ageFilter: 'aging' as const,
    },
  },
  {
    id: 'hot-leads',
    label: 'Hot Leads',
    filters: {
      priorities: ['high'] as const,
      ageFilter: 'new' as const,
    },
  },
  {
    id: 'tours-this-week',
    label: 'Tours This Week',
    filters: {
      tourStatus: 'scheduled' as const,
    },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    filters: {
      followupStatus: 'overdue' as const,
    },
  },
];

export default function InquiryFilters({
  filters,
  onFiltersChange,
  homes = [],
  staff = [],
  isFamily = false,
}: InquiryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'followupStatus' || key === 'tourStatus' || key === 'ageFilter') {
      return value !== 'all';
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== '' && value !== null;
  }).length;

  // Update filter value
  const updateFilter = <K extends keyof InquiryFiltersState>(
    key: K,
    value: InquiryFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Toggle array filter (for multi-select)
  const toggleArrayFilter = <K extends keyof InquiryFiltersState>(
    key: K,
    value: any
  ) => {
    const currentArray = filters[key] as any[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as InquiryFiltersState[K]);
  };

  // Clear all filters
  const clearAll = () => {
    onFiltersChange(defaultFilters);
  };

  // Apply preset
  const applyPreset = (preset: typeof filterPresets[0]) => {
    const presetFilters = { ...preset.filters };
    // Convert readonly arrays to mutable arrays
    const mutableFilters: any = { ...presetFilters };
    if ('priorities' in mutableFilters && mutableFilters.priorities) {
      mutableFilters.priorities = [...mutableFilters.priorities];
    }
    if ('statuses' in mutableFilters && mutableFilters.statuses) {
      mutableFilters.statuses = [...mutableFilters.statuses];
    }
    onFiltersChange({
      ...defaultFilters,
      ...mutableFilters,
    });
  };

  // Save filters to localStorage
  const saveFilters = () => {
    try {
      localStorage.setItem('inquiryFilters', JSON.stringify(filters));
      alert('Filters saved!');
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  };

  // Load filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('inquiryFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        onFiltersChange({ ...defaultFilters, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allStatuses = getAllInquiryStatuses();

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
          >
            <FiFilter className="w-5 h-5" />
            <h3 className="font-semibold">Filters</h3>
            {isExpanded ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
          </button>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <FiX className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={saveFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
            title="Save current filters"
          >
            <FiSave className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Presets - Hide for families */}
          {!isFamily && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Quick Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {filterPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter (Multi-select) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Status
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-neutral-200 rounded-md p-2">
                {allStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => toggleArrayFilter('statuses', status)}
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">
                      {status.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Home Filter */}
            {homes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Home
                </label>
                <select
                  value={filters.homeId}
                  onChange={(e) => updateFilter('homeId', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Homes</option>
                  {homes.map((home) => (
                    <option key={home.id} value={home.id}>
                      {home.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Age Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Inquiry Age
              </label>
              <select
                value={filters.ageFilter}
                onChange={(e) => updateFilter('ageFilter', e.target.value as any)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Ages</option>
                <option value="new">New (0-3 days)</option>
                <option value="recent">Recent (4-7 days)</option>
                <option value="aging">Aging (8-14 days)</option>
                <option value="old">Old (15+ days)</option>
              </select>
            </div>

            {/* Tour Status Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Tour Status
              </label>
              <select
                value={filters.tourStatus}
                onChange={(e) => updateFilter('tourStatus', e.target.value as any)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All</option>
                <option value="scheduled">Tour Scheduled</option>
                <option value="completed">Tour Completed</option>
                <option value="none">No Tour</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            {showAdvanced ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="pt-4 border-t border-neutral-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Follow-up Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Follow-up Status
                  </label>
                  <select
                    value={filters.followupStatus}
                    onChange={(e) => updateFilter('followupStatus', e.target.value as any)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due Today</option>
                    <option value="week">Due This Week</option>
                    <option value="none">No Follow-up Set</option>
                  </select>
                </div>

                {/* Assigned To - Hide for families */}
                {!isFamily && staff && staff.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Assigned To
                    </label>
                    <select
                      value={filters.assignedTo}
                      onChange={(e) => updateFilter('assignedTo', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">All Staff</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
