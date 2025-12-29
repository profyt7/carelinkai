'use client';

import React, { useEffect, useState } from 'react';
import { FiDownload, FiSearch, FiFilter } from 'react-icons/fi';
import { FileText } from 'lucide-react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

type Doc = {
  id: string;
  title: string;
  type: string;
  fileSize: number;
  createdAt: string;
  tags: string[];
  uploader: {
    firstName?: string | null;
    lastName?: string | null;
  };
};

interface DocumentsTabProps {
  familyId: string | null;
  showMock?: boolean;
  onUploadClick?: () => void;
}

export default function DocumentsTab({ familyId, showMock = false, onUploadClick }: DocumentsTabProps) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>('');

  const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    if (kb >= 1) return `${kb.toFixed(1)} KB`;
    return `${bytes} B`;
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (showMock) {
          const now = Date.now();
          let mockDocs: Doc[] = [
            { id: 'doc-1', title: 'Care Plan', type: 'CARE_PLAN', fileSize: 250_000, createdAt: new Date(now - 86400000).toISOString(), tags: ['plan','medical'], uploader: { firstName: 'Ava', lastName: 'Johnson' } },
            { id: 'doc-2', title: 'Medical Records Summary', type: 'MEDICAL_RECORD', fileSize: 512_000, createdAt: new Date(now - 2*86400000).toISOString(), tags: ['records'], uploader: { firstName: 'Noah', lastName: 'Williams' } },
            { id: 'doc-3', title: 'Insurance Policy', type: 'INSURANCE_DOCUMENT', fileSize: 780_000, createdAt: new Date(now - 3*86400000).toISOString(), tags: ['insurance'], uploader: { firstName: 'Sophia', lastName: 'Martinez' } },
            { id: 'doc-4', title: 'Facility Photos', type: 'PHOTO', fileSize: 1_200_000, createdAt: new Date(now - 4*86400000).toISOString(), tags: ['photos'], uploader: { firstName: 'Oliver', lastName: 'Brown' } },
          ];
          
          // Apply client-side filtering for mock data
          if (search) {
            const searchLower = search.toLowerCase();
            mockDocs = mockDocs.filter(doc => 
              doc.title.toLowerCase().includes(searchLower) ||
              doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
          }
          
          if (docType) {
            mockDocs = mockDocs.filter(doc => doc.type === docType);
          }
          
          setDocs(mockDocs);
          setLoading(false);
          return;
        }
        
        // Enhanced guard clause to catch all invalid familyId values
        if (!familyId || familyId === 'null' || familyId.trim() === '') {
          console.warn('[DocumentsTab] Invalid familyId, skipping fetch:', familyId);
          setLoading(false);
          setError('Unable to load documents: family information not available');
          return;
        }

        // Additional validation: ensure familyId looks like a valid ID
        if (familyId.length < 10) {
          console.warn('[DocumentsTab] familyId too short, likely invalid:', familyId);
          setLoading(false);
          setError('Unable to load documents: invalid family ID');
          return;
        }

        console.log('[DocumentsTab] Valid familyId confirmed:', familyId);

        // Build query parameters - ALWAYS include familyId first
        const params = new URLSearchParams();
        params.append('familyId', familyId);
        params.append('limit', '12');
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', 'desc');

        // Add optional search parameter
        if (search && search.trim()) {
          params.append('search', search.trim());
          console.log('[DocumentsTab] Including search term:', search.trim());
        }

        // Add optional docType parameter
        if (docType) {
          params.append('type', docType);
          console.log('[DocumentsTab] Including docType:', docType);
        }

        const url = `/api/family/documents?${params.toString()}`;
        console.log('[DocumentsTab] Fetching from:', url);

        const res = await fetch(url, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${res.status}`);
        }

        const json = await res.json();
        console.log('[DocumentsTab] Received documents:', json.documents?.length || 0);
        
        setDocs(json.documents ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('[DocumentsTab] Error fetching documents:', err);
        setError(err.message ?? 'Error loading documents');
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
    return () => controller.abort();
  }, [search, docType, familyId, showMock]);

  // SSE for real-time updates
  useEffect(() => {
    if (showMock || !familyId) return;
    
    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`
    );

    const parseData = (e: MessageEvent<any>) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('document:created', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.document) {
        setDocs((prev) => [data.document, ...prev]);
      }
    });

    es.addEventListener('document:updated', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.document) {
        setDocs((prev) =>
          prev.map((d) => (d.id === data.document.id ? data.document : d))
        );
      }
    });

    es.addEventListener('document:deleted', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.documentId) {
        setDocs((prev) => prev.filter((d) => d.id !== data.documentId));
      }
    });

    return () => {
      es.close();
    };
  }, [familyId, showMock]);

  if (loading) {
    return <LoadingState type="cards" count={4} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading documents</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (docs.length === 0 && !search && !docType) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload your first document to get started. You can upload care plans, medical records, insurance documents, and more."
        actionLabel="Upload Document"
        onAction={onUploadClick}
      />
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FiSearch className="w-4 h-4" />
              Search documents
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or tags..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FiFilter className="w-4 h-4" />
              Filter by type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="CARE_PLAN">Care Plan</option>
              <option value="MEDICAL_RECORD">Medical Record</option>
              <option value="INSURANCE_DOCUMENT">Insurance</option>
              <option value="PHOTO">Photo</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {docs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No documents found matching your filters</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300"
            >
              {/* Icon Header */}
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <FileText className="h-6 w-6 text-white" />
              </div>
              
              {/* Title */}
              <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors duration-200">
                {doc.title}
              </h3>
              
              {/* Type Badge */}
              <span className="mb-3 inline-block w-fit rounded-full bg-gradient-to-r from-blue-100 to-cyan-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                {doc.type.replace(/_/g, ' ')}
              </span>
              
              {/* Meta Info */}
              <div className="mb-3 text-xs text-gray-500 flex items-center gap-2 font-medium">
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                <span className="font-semibold text-gray-700">{formatBytes(doc.fileSize)}</span>
              </div>
              
              {/* Tags */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {doc.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gradient-to-r from-gray-100 to-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors duration-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              
              {/* Footer */}
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white shadow-md">
                    {`${doc.uploader.firstName?.[0] ?? ''}${doc.uploader.lastName?.[0] ?? ''}`}
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {doc.uploader.firstName} {doc.uploader.lastName}
                  </span>
                </div>
                <a
                  href={`/api/family/documents/${doc.id}/download`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
