'use client';

import { useState } from 'react';
import { useInquiries, useInquiryStats } from '@/hooks/useInquiries';
import { KanbanBoard } from '@/components/inquiries/KanbanBoard';
import { InquiryDetailModal } from '@/components/inquiries/InquiryDetailModal';
import { NewInquiryModal } from '@/components/inquiries/NewInquiryModal';
import { FilterPanel } from '@/components/inquiries/FilterPanel';
import { AnalyticsCards } from '@/components/inquiries/AnalyticsCards';
import { Inquiry, InquiryFilters } from '@/types/inquiry';
import { 
  LayoutGrid, 
  List, 
  Plus, 
  RefreshCw, 
  Filter,
  TrendingUp
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function PipelineDashboardPage() {
  const [filters, setFilters] = useState<InquiryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showNewInquiryModal, setShowNewInquiryModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  const { inquiries, isLoading, error, mutate } = useInquiries(filters);
  const stats = useInquiryStats();

  const handleRefresh = () => {
    mutate();
  };

  const handleInquiryClick = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
  };

  const handleCloseDetail = () => {
    setSelectedInquiry(null);
    mutate(); // Refresh data after modal closes
  };

  const handleNewInquiry = () => {
    setShowNewInquiryModal(true);
  };

  const handleNewInquirySuccess = () => {
    setShowNewInquiryModal(false);
    mutate(); // Refresh data after new inquiry
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pipeline Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage inquiries through your sales pipeline
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Analytics Toggle */}
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                title={showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-l-lg transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-r-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* New Inquiry Button */}
              <button
                onClick={handleNewInquiry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Inquiry</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Analytics Cards */}
        {showAnalytics && (
          <AnalyticsCards stats={stats} />
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error loading inquiries</p>
            <p className="text-red-600 text-sm mt-1">{error.message || 'Please try again'}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">Loading inquiries...</p>
          </div>
        )}

        {/* Kanban View */}
        {!isLoading && !error && viewMode === 'kanban' && inquiries && (
          <KanbanBoard
            inquiries={inquiries}
            onInquiryClick={handleInquiryClick}
            onUpdate={mutate}
          />
        )}

        {/* List View */}
        {!isLoading && !error && viewMode === 'list' && inquiries && (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Care Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urgency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      onClick={() => handleInquiryClick(inquiry)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inquiry.contactName}</div>
                        <div className="text-sm text-gray-500">{inquiry.contactEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inquiry.careRecipientName}</div>
                        {inquiry.careRecipientAge && (
                          <div className="text-sm text-gray-500">Age {inquiry.careRecipientAge}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          inquiry.urgency === 'URGENT' ? 'bg-red-100 text-red-800' :
                          inquiry.urgency === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          inquiry.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {inquiry.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{inquiry.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{inquiry.source}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquiry.assignedTo ? (
                          <span className="text-sm text-gray-900">
                            {inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inquiry.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inquiries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No inquiries found</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && inquiries && inquiries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <LayoutGrid className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No inquiries yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first inquiry
            </p>
            <button
              onClick={handleNewInquiry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Inquiry
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={handleCloseDetail}
        />
      )}

      {/* New Inquiry Modal */}
      {showNewInquiryModal && (
        <NewInquiryModal
          onClose={() => setShowNewInquiryModal(false)}
          onSuccess={handleNewInquirySuccess}
        />
      )}
    </div>
  );
}
