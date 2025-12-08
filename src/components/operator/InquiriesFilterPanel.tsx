"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { InquiryStatus } from '@prisma/client';
import { FiFilter, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type Home = {
  id: string;
  name: string;
};

type Inquiry = {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  tourDate: string | null;
  home: { id: string; name: string };
  family: { id: string; name: string };
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

interface InquiriesFilterPanelProps {
  homes: Home[];
  initialFilters?: {
    status?: string;
    homeId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export default function InquiriesFilterPanel({ homes, initialFilters = {} }: InquiriesFilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [status, setStatus] = useState(initialFilters.status || '');
  const [homeId, setHomeId] = useState(initialFilters.homeId || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'createdAt');
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder || 'desc');

  const statuses: InquiryStatus[] = [
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST',
  ];

  // Fetch inquiries
  const fetchInquiries = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (status) params.set('status', status);
      if (homeId) params.set('homeId', homeId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/operator/inquiries?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch inquiries');
      }

      const data = await res.json();
      setInquiries(data.inquiries || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e: any) {
      setError(e.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  // Update URL with filters
  const updateURL = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (homeId) params.set('homeId', homeId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    const queryString = params.toString();
    router.push(`/operator/inquiries${queryString ? `?${queryString}` : ''}`);
  };

  // Apply filters
  const applyFilters = () => {
    updateURL();
    fetchInquiries(1);
  };

  // Clear filters
  const clearFilters = () => {
    setStatus('');
    setHomeId('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    router.push('/operator/inquiries');
    fetchInquiries(1);
  };

  // Handle page change
  const changePage = (newPage: number) => {
    fetchInquiries(newPage);
  };

  // Initial load
  useEffect(() => {
    fetchInquiries(parseInt(initialFilters.page || '1'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if filters are active
  const hasActiveFilters = status || homeId || startDate || endDate || sortBy !== 'createdAt' || sortOrder !== 'desc';

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiFilter className="h-5 w-5 text-neutral-600" />
            <h3 className="font-medium text-neutral-800">Filters</h3>
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-neutral-600 hover:text-neutral-800 flex items-center gap-1"
            >
              <FiX className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Home Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Home
            </label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={homeId}
              onChange={(e) => setHomeId(e.target.value)}
            >
              <option value="">All Homes</option>
              {homes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-600">Sort by:</label>
              <select
                className="px-2 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Date Created</option>
                <option value="status">Status</option>
                <option value="tourDate">Tour Date</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-600">Order:</label>
              <select
                className="px-2 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <div>
            Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit + 1) : 0} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} inquiries
          </div>
        </div>
      )}

      {/* Inquiries Table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Home
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Family
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Tour Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {inquiry.home.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {inquiry.family.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {inquiry.tourDate ? new Date(inquiry.tourDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        inquiry.status === 'NEW' ? 'bg-red-100 text-red-800' :
                        inquiry.status === 'CONTACTED' ? 'bg-blue-100 text-blue-800' :
                        inquiry.status === 'TOUR_SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                        inquiry.status === 'TOUR_COMPLETED' ? 'bg-purple-100 text-purple-800' :
                        inquiry.status === 'PLACEMENT_OFFERED' ? 'bg-indigo-100 text-indigo-800' :
                        inquiry.status === 'PLACEMENT_ACCEPTED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inquiry.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/operator/inquiries/${inquiry.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {inquiries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-neutral-500">
                        <p className="text-lg font-medium mb-2">No inquiries found</p>
                        <p className="text-sm">
                          {hasActiveFilters
                            ? 'Try adjusting your filters'
                            : 'When families express interest in your homes, they\'ll appear here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
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
                  onClick={() => changePage(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium ${
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
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
