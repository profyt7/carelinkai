'use client';

import React, { useState, useEffect } from 'react';
import { Document, DocumentType, ValidationStatus, ReviewStatus } from '@prisma/client';
import DocumentCard from '@/components/documents/DocumentCard';
import DocumentReviewModal from '@/components/documents/DocumentReviewModal';
import { useRouter } from 'next/navigation';

type DocumentWithDetails = Document & {
  classificationConfidence?: number | null;
  classificationReasoning?: string | null;
  autoClassified?: boolean | null;
  validationStatus?: ValidationStatus | null;
  validationErrors?: any;
  reviewStatus?: ReviewStatus | null;
  reviewedAt?: Date | null;
};

interface Filters {
  documentTypes: DocumentType[];
  validationStatuses: ValidationStatus[];
  reviewStatuses: ReviewStatus[];
  confidenceMin: number;
  confidenceMax: number;
  dateFrom?: Date;
  dateTo?: Date;
  entityType?: 'RESIDENT' | 'INQUIRY' | 'ALL';
}

export default function DocumentLibraryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'confidence'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<Filters>({
    documentTypes: [],
    validationStatuses: [],
    reviewStatuses: [],
    confidenceMin: 0,
    confidenceMax: 100,
    entityType: 'ALL',
  });

  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDetails | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch documents
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [documents, filters, searchQuery, sortBy, sortOrder]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/search');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.fileName.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      );
    }

    // Document type filter
    if (filters.documentTypes.length > 0) {
      filtered = filtered.filter(doc => filters.documentTypes.includes(doc.type));
    }

    // Validation status filter
    if (filters.validationStatuses.length > 0) {
      filtered = filtered.filter(doc =>
        doc.validationStatus && filters.validationStatuses.includes(doc.validationStatus)
      );
    }

    // Review status filter
    if (filters.reviewStatuses.length > 0) {
      filtered = filtered.filter(doc =>
        doc.reviewStatus && filters.reviewStatuses.includes(doc.reviewStatus)
      );
    }

    // Confidence range filter
    filtered = filtered.filter(doc => {
      const confidence = doc.classificationConfidence || 0;
      return confidence >= filters.confidenceMin && confidence <= filters.confidenceMax;
    });

    // Entity type filter
    if (filters.entityType !== 'ALL') {
      filtered = filtered.filter(doc =>
        filters.entityType === 'RESIDENT' ? doc.residentId : doc.inquiryId
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(doc => new Date(doc.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(doc => new Date(doc.createdAt) <= filters.dateTo!);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'name') {
        compareValue = a.fileName.localeCompare(b.fileName);
      } else if (sortBy === 'confidence') {
        compareValue = (a.classificationConfidence || 0) - (b.classificationConfidence || 0);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredDocuments(filtered);
  };

  const handleReview = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setSelectedDocument(doc);
    }
  };

  const handleSaveReview = async (documentId: string, newType?: DocumentType, notes?: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newDocumentType: newType,
          reviewNotes: notes,
        }),
      });

      if (response.ok) {
        // Refresh documents
        await fetchDocuments();
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Error saving review:', error);
      throw error;
    }
  };

  const handleDownload = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const toggleFilter = <K extends keyof Filters>(
    filterKey: K,
    value: Filters[K] extends any[] ? Filters[K][number] : Filters[K]
  ) => {
    setFilters(prev => {
      const currentValue = prev[filterKey];
      if (Array.isArray(currentValue)) {
        const newArray = (currentValue as any[]).includes(value)
          ? currentValue.filter(v => v !== value)
          : [...currentValue, value as any];
        return { ...prev, [filterKey]: newArray };
      }
      return prev;
    });
  };

  const clearFilters = () => {
    setFilters({
      documentTypes: [],
      validationStatuses: [],
      reviewStatuses: [],
      confidenceMin: 0,
      confidenceMax: 100,
      entityType: 'ALL',
    });
    setSearchQuery('');
  };

  const pendingReviewCount = documents.filter(doc =>
    doc.reviewStatus === 'PENDING_REVIEW' ||
    doc.validationStatus === 'NEEDS_REVIEW' ||
    (doc.classificationConfidence && doc.classificationConfidence < 80)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
              <p className="mt-1 text-sm text-gray-600">
                {filteredDocuments.length} documents
                {pendingReviewCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    {pendingReviewCount} need review
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search documents by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sort options */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Upload Date</option>
              <option value="name">File Name</option>
              <option value="confidence">Confidence Score</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear all
                  </button>
                </div>

                {/* Document Type Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Document Type</h4>
                  <div className="space-y-2">
                    {Object.values(DocumentType).map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.documentTypes.includes(type)}
                          onChange={() => toggleFilter('documentTypes', type)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {type.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Validation Status Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Validation Status</h4>
                  <div className="space-y-2">
                    {Object.values(ValidationStatus).map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.validationStatuses.includes(status)}
                          onChange={() => toggleFilter('validationStatuses', status)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {status.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Review Status Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Review Status</h4>
                  <div className="space-y-2">
                    {Object.values(ReviewStatus).map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.reviewStatuses.includes(status)}
                          onChange={() => toggleFilter('reviewStatuses', status)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {status.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Confidence Range Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Confidence Level: {filters.confidenceMin}% - {filters.confidenceMax}%
                  </h4>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.confidenceMin}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      confidenceMin: parseInt(e.target.value),
                    }))}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.confidenceMax}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      confidenceMax: parseInt(e.target.value),
                    }))}
                    className="w-full mt-2"
                  />
                </div>

                {/* Entity Type Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Entity Type</h4>
                  <select
                    value={filters.entityType}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      entityType: e.target.value as any,
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="ALL">All Documents</option>
                    <option value="RESIDENT">Resident Documents</option>
                    <option value="INQUIRY">Inquiry Documents</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Documents grid/list */}
          <div className="flex-1">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl">📄</span>
                <p className="mt-4 text-gray-600">No documents found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {filteredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onReview={handleReview}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedDocument && (
        <DocumentReviewModal
          document={selectedDocument}
          isOpen={true}
          onClose={() => setSelectedDocument(null)}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
}
