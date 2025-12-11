"use client";

import React from 'react';
import { FiX } from 'react-icons/fi';

export interface CaregiverFilterState {
  certificationStatus: 'all' | 'current' | 'expiring' | 'expired';
  employmentType: string;
  employmentStatus: string;
  hasCertification: string;
  availability: 'all' | 'available' | 'assigned' | 'unavailable';
}

interface CaregiverFiltersProps {
  filters: CaregiverFilterState;
  onFiltersChange: (filters: CaregiverFilterState) => void;
  onClearFilters: () => void;
}

export function CaregiverFilters({ 
  filters, 
  onFiltersChange,
  onClearFilters 
}: CaregiverFiltersProps) {
  const updateFilter = (key: keyof CaregiverFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== 'all' && value !== '' && value !== 'ALL'
  ).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Certification Status */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Certification Status
          </label>
          <select
            value={filters.certificationStatus}
            onChange={(e) => updateFilter('certificationStatus', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="current">Current</option>
            <option value="expiring">Expiring Soon (30 days)</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Employment Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Employment Type
          </label>
          <select
            value={filters.employmentType}
            onChange={(e) => updateFilter('employmentType', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="PER_DIEM">Per Diem</option>
            <option value="CONTRACT">Contract</option>
            <option value="TEMPORARY">Temporary</option>
          </select>
        </div>

        {/* Employment Status */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Employment Status
          </label>
          <select
            value={filters.employmentStatus}
            onChange={(e) => updateFilter('employmentStatus', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Specific Certification */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Certification Type
          </label>
          <select
            value={filters.hasCertification}
            onChange={(e) => updateFilter('hasCertification', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">Any Certification</option>
            <option value="CNA">CNA (Certified Nursing Assistant)</option>
            <option value="CPR">CPR Certification</option>
            <option value="First Aid">First Aid</option>
            <option value="HHA">HHA (Home Health Aide)</option>
            <option value="Medication Management">Medication Management</option>
            <option value="Dementia Care">Dementia Care</option>
            <option value="Hospice Care">Hospice Care</option>
          </select>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Availability
          </label>
          <select
            value={filters.availability}
            onChange={(e) => updateFilter('availability', e.target.value as any)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="assigned">Currently Assigned</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </p>
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <FiX className="w-4 h-4" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
