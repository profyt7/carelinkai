'use client';

import { useState } from 'react';
import { InquiryFilters, InquiryUrgency, InquiryStatus, InquirySource } from '@/types/inquiry';
import { X, Search } from 'lucide-react';

interface FilterPanelProps {
  filters: InquiryFilters;
  onFiltersChange: (filters: InquiryFilters) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<InquiryFilters>(filters);

  const handleChange = (key: keyof InquiryFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleUrgencyToggle = (urgency: InquiryUrgency) => {
    const current = localFilters.urgency || [];
    const newUrgency = current.includes(urgency)
      ? current.filter((u) => u !== urgency)
      : [...current, urgency];
    handleChange('urgency', newUrgency);
  };

  const handleStatusToggle = (status: InquiryStatus) => {
    const current = localFilters.status || [];
    const newStatus = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    handleChange('status', newStatus);
  };

  const handleSourceToggle = (source: InquirySource) => {
    const current = localFilters.source || [];
    const newSource = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    handleChange('source', newSource);
  };

  const handleClearAll = () => {
    const emptyFilters: InquiryFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some((key) => {
    const value = localFilters[key as keyof InquiryFilters];
    return Array.isArray(value) ? value.length > 0 : !!value;
  });

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Contact name, email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgency
          </label>
          <div className="space-y-2">
            {Object.values(InquiryUrgency).map((urgency) => (
              <label key={urgency} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.urgency?.includes(urgency) || false}
                  onChange={() => handleUrgencyToggle(urgency)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{urgency}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.values(InquiryStatus).map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.status?.includes(status) || false}
                  onChange={() => handleStatusToggle(status)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {status.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source
          </label>
          <div className="space-y-2">
            {Object.values(InquirySource).map((source) => (
              <label key={source} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.source?.includes(source) || false}
                  onChange={() => handleSourceToggle(source)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{source}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date From
          </label>
          <input
            type="date"
            value={
              localFilters.dateFrom
                ? new Date(localFilters.dateFrom).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date To
          </label>
          <input
            type="date"
            value={
              localFilters.dateTo
                ? new Date(localFilters.dateTo).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Requires Attention */}
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.requiresAttention || false}
              onChange={(e) => handleChange('requiresAttention', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Requires Attention
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
