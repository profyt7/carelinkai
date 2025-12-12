/**
 * InquiriesListClient Component
 * Main client component that integrates filters, sorting, search, and pagination
 * - Integrates all filters from InquiryFilters
 * - Sorting with 8 options
 * - Enhanced search (name, email, phone, notes)
 * - Pagination or infinite scroll
 * - Bulk actions support
 * - Empty states
 * - Loading states
 * - Error handling
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InquiryStatus } from '@prisma/client';
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiDownload,
  FiBarChart2,
  FiList,
} from 'react-icons/fi';
import InquiryCard, { InquiryCardData } from './InquiryCard';
import { InquiryCardSkeletonGrid } from './InquiryCardSkeleton';
import InquiryFilters, { InquiryFiltersState, defaultFilters } from './InquiryFilters';
import { InquiryAnalytics } from './InquiryAnalytics';
import {
  exportInquiriesToCSV,
  downloadCSV,
  generateExportFilename,
} from '@/lib/export-utils';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export type SortOption =
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'name-asc'
  | 'name-desc'
  | 'priority-desc'
  | 'status'
  | 'tourDate-asc'
  | 'updatedAt-desc';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InquiriesListClientProps {
  homes?: Array<{ id: string; name: string }>;
  staff?: Array<{ id: string; name: string }>;
  initialFilters?: Partial<InquiryFiltersState>;
  isFamily?: boolean;
}

export default function InquiriesListClient({
  homes = [],
  staff = [],
  initialFilters = {},
  isFamily = false,
}: InquiriesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [inquiries, setInquiries] = useState<InquiryCardData[]>([]);
  const [filters, setFilters] = useState<InquiryFiltersState>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt-desc');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');

  // Debounced search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch inquiries from API
  const fetchInquiries = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', pagination.limit.toString());

        // Add filters
        if (filters.statuses.length > 0) {
          params.set('statuses', filters.statuses.join(','));
        }
        if (filters.homeId) {
          params.set('homeId', filters.homeId);
        }
        if (filters.dateFrom) {
          params.set('dateFrom', filters.dateFrom);
        }
        if (filters.dateTo) {
          params.set('dateTo', filters.dateTo);
        }
        if (filters.assignedTo) {
          params.set('assignedTo', filters.assignedTo);
        }
        if (filters.ageFilter !== 'all') {
          params.set('ageFilter', filters.ageFilter);
        }
        if (filters.tourStatus !== 'all') {
          params.set('tourStatus', filters.tourStatus);
        }
        if (filters.followupStatus !== 'all') {
          params.set('followupStatus', filters.followupStatus);
        }

        // Add search
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        // Add sorting
        const [sortField, sortOrder] = sortBy.split('-');
        params.set('sortBy', sortField);
        params.set('sortOrder', sortOrder);

        // Fetch data
        const res = await fetch(`/api/operator/inquiries?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch inquiries');
        }

        const data = await res.json();
        setInquiries(data.inquiries || []);
        setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
      } catch (err: any) {
        console.error('Error fetching inquiries:', err);
        setError(err.message || 'Failed to load inquiries');
      } finally {
        setLoading(false);
      }
    },
    [filters, debouncedSearch, sortBy, pagination.limit]
  );

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchInquiries(pagination.page);
  }, [fetchInquiries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle filter changes
  const handleFiltersChange = (newFilters: InquiryFiltersState) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      setExporting(true);

      // Build query parameters for export (fetch all inquiries with current filters)
      const params = new URLSearchParams();
      params.set('limit', '10000'); // Large limit to get all inquiries
      params.set('page', '1');

      // Add filters
      if (filters.statuses.length > 0) {
        params.set('statuses', filters.statuses.join(','));
      }
      if (filters.homeId) {
        params.set('homeId', filters.homeId);
      }
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo);
      }
      if (filters.assignedTo) {
        params.set('assignedTo', filters.assignedTo);
      }
      if (filters.ageFilter !== 'all') {
        params.set('ageFilter', filters.ageFilter);
      }
      if (filters.tourStatus !== 'all') {
        params.set('tourStatus', filters.tourStatus);
      }
      if (filters.followupStatus !== 'all') {
        params.set('followupStatus', filters.followupStatus);
      }

      // Add search
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      // Add sorting
      const [sortField, sortOrder] = sortBy.split('-');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      // Fetch all inquiries
      const res = await fetch(`/api/operator/inquiries?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch inquiries for export');
      }

      const data = await res.json();
      const inquiriesToExport = data.inquiries || [];

      if (inquiriesToExport.length === 0) {
        alert('No inquiries to export');
        return;
      }

      // Generate CSV
      const csv = exportInquiriesToCSV(inquiriesToExport);

      // Download CSV
      const filename = generateExportFilename('inquiries-export');
      downloadCSV(csv, filename);

    } catch (err: any) {
      console.error('Error exporting inquiries:', err);
      alert(err.message || 'Failed to export inquiries');
    } finally {
      setExporting(false);
    }
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'followupStatus' || key === 'tourStatus' || key === 'ageFilter') {
        return value !== 'all';
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== null;
    }).length;
  }, [filters]);

  // Empty state component
  const EmptyState = ({ hasFilters }: { hasFilters: boolean }) => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
        <FiAlertCircle className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        {hasFilters ? 'No inquiries found' : 'No inquiries yet'}
      </h3>
      <p className="text-neutral-600 max-w-md mx-auto">
        {hasFilters
          ? 'Try adjusting your filters or search query to find what you\'re looking for.'
          : 'When families express interest in your homes, they\'ll appear here.'}
      </p>
      {hasFilters && (
        <button
          onClick={() => {
            setFilters(defaultFilters);
            setSearchQuery('');
          }}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <FiChevronRight className="w-5 h-5 rotate-45" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="sm:w-64">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="createdAt-desc">Inquiry Date (Newest First)</option>
            <option value="createdAt-asc">Inquiry Date (Oldest First)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="status">Status (Pipeline Order)</option>
            <option value="tourDate-asc">Tour Date (Soonest First)</option>
            <option value="updatedAt-desc">Last Activity (Most Recent)</option>
          </select>
        </div>

        {/* View Toggle - Hide for families */}
        {!isFamily && (
          <div className="flex items-center gap-2 border border-neutral-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title="List view"
            >
              <FiList className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'analytics'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title="Analytics view"
            >
              <FiBarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>
        )}

        {/* Export Button - Hide for families */}
        {!isFamily && (
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 bg-white rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <FiDownload className="w-4 h-4" />
            {exporting ? 'Exporting...' : `Export (${pagination.total})`}
          </button>
        )}
      </div>

      {/* Filters */}
      <InquiryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        homes={homes}
        staff={staff}
        isFamily={isFamily}
      />

      {/* Analytics View */}
      {viewMode === 'analytics' ? (
        loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-neutral-600 mt-4">Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 mb-1">Error loading analytics</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={() => fetchInquiries(pagination.page)}
                  className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <InquiryAnalytics inquiries={inquiries} />
        )
      ) : (
        <>
          {/* Results Summary */}
          {!loading && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-neutral-600">
                {pagination.total > 0 ? (
                  <>
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} inquiries
                  </>
                ) : (
                  'No inquiries found'
                )}
              </div>
              {debouncedSearch && (
                <div className="text-neutral-500">
                  Search results for &quot;{debouncedSearch}&quot;
                </div>
              )}
            </div>
          )}

          {/* Inquiries Grid */}
          {loading ? (
            <InquiryCardSkeletonGrid count={12} />
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 mb-1">Error loading inquiries</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={() => fetchInquiries(pagination.page)}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : inquiries.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0 || !!debouncedSearch} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inquiries.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} isFamily={isFamily} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination - Only show in list view */}
      {viewMode === 'list' && !loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 7) {
                pageNum = i + 1;
              } else if (pagination.page <= 4) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 3) {
                pageNum = pagination.totalPages - 6 + i;
              } else {
                pageNum = pagination.page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
