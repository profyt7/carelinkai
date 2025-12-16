"use client";

import React from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

export interface ResidentFilters {
  careLevel: string;
  status: string;
  ageRange: string;
  roomFloor: string;
  admissionDateRange: string;
  assignedCaregiver: string;
}

export const DEFAULT_FILTERS: ResidentFilters = {
  careLevel: 'all',
  status: 'all',
  ageRange: 'all',
  roomFloor: 'all',
  admissionDateRange: 'all',
  assignedCaregiver: 'all',
};

interface ResidentFiltersProps {
  filters: ResidentFilters;
  onChange: (filters: ResidentFilters) => void;
  onClear: () => void;
  caregivers?: Array<{ id: string; firstName: string; lastName: string }>;
  className?: string;
}

export function ResidentFiltersComponent({
  filters,
  onChange,
  onClear,
  caregivers = [],
  className = '',
}: ResidentFiltersProps) {
  const handleFilterChange = (key: keyof ResidentFilters, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-neutral-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiFilter className="w-5 h-5 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {activeFilterCount}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <FiX className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Care Level Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Care Level
          </label>
          <select
            value={filters.careLevel}
            onChange={(e) => handleFilterChange('careLevel', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Levels</option>
            <option value="INDEPENDENT">Independent</option>
            <option value="ASSISTED">Assisted Living</option>
            <option value="MEMORY_CARE">Memory Care</option>
            <option value="SKILLED_NURSING">Skilled Nursing</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="HOSPITALIZED">Hospitalized</option>
            <option value="DECEASED">Deceased</option>
            <option value="PENDING">Pending</option>
            <option value="INQUIRY">Inquiry</option>
            <option value="DISCHARGED">Discharged</option>
          </select>
        </div>

        {/* Age Range Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Age Range
          </label>
          <select
            value={filters.ageRange}
            onChange={(e) => handleFilterChange('ageRange', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Ages</option>
            <option value="under-60">Under 60</option>
            <option value="60-70">60-70 years</option>
            <option value="70-80">70-80 years</option>
            <option value="80-90">80-90 years</option>
            <option value="90+">90+ years</option>
          </select>
        </div>

        {/* Room Floor Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Floor
          </label>
          <select
            value={filters.roomFloor}
            onChange={(e) => handleFilterChange('roomFloor', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
            <option value="5">Floor 5</option>
          </select>
        </div>

        {/* Admission Date Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Admission Date
          </label>
          <select
            value={filters.admissionDateRange}
            onChange={(e) => handleFilterChange('admissionDateRange', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Time</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
            <option value="lastYear">Last Year</option>
            <option value="moreThanYear">More Than a Year</option>
          </select>
        </div>

        {/* Assigned Caregiver Filter */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Caregiver
          </label>
          <select
            value={filters.assignedCaregiver}
            onChange={(e) => handleFilterChange('assignedCaregiver', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Caregivers</option>
            {caregivers.map((caregiver) => (
              <option key={caregiver.id} value={caregiver.id}>
                {caregiver.firstName} {caregiver.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
