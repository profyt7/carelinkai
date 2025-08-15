'use client';

/* ------------------------------------------------------------------
 * Family Collaboration – Documents
 * ------------------------------------------------------------------
 * Minimal but functional implementation that:
 *   • Resolves familyId (query param > API fallback)
 *   • Lists documents using existing useDocuments hook
 *   • Provides basic filters & upload via DocumentUploadModal
 *   • Allows download (open in new tab) & delete
 * ----------------------------------------------------------------- */

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'next/navigation';
import { useDocuments } from '@/hooks/useDocuments';
import dynamic from 'next/dynamic';
import { DOCUMENT_TYPE_LABELS, formatFileSize } from '@/lib/types/family';
import type { DocumentType } from '@/lib/types/family';
import { FiPlus, FiSearch, FiTrash2, FiDownload, FiTag } from 'react-icons/fi';

// Lazy load modal to avoid big bundle
const DocumentUploadModal = dynamic(
  () => import('@/components/family/DocumentUploadModal'),
  { ssr: false }
);

export default function FamilyPage() {
  const searchParams = useSearchParams();
  const queryFamilyId = searchParams?.get('familyId') || '';
  const [familyId, setFamilyId] = useState<string>(queryFamilyId);
  const [modalOpen, setModalOpen] = useState(false);
  /* ------------------- new UI state ------------------------- */
  const [activeTab, setActiveTab] = useState<
    'documents' | 'notes' | 'photos' | 'members' | 'activity'
  >('documents');

  // Fetch fallback familyId if not provided
  useEffect(() => {
    if (familyId) return;
    (async () => {
      try {
        const res = await fetch('/api/user/family');
        if (res.ok) {
          const json = await res.json();
          if (json.familyId) setFamilyId(json.familyId as string);
        }
      } catch (_) {
        /* noop – handled in UI */
      }
    })();
  }, [familyId]);

  /* --------------------- Documents Hook ---------------------- */
  const {
    documents,
    uploadDocuments,
    deleteDocument,
    setFilters,
    filters,
    loading,
  } = useDocuments({
    familyId,
    autoFetch: !!familyId,
  });

  /* --------------------- Handlers ---------------------------- */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchQuery: e.target.value });
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as DocumentType | '';
    setFilters({ type: val || undefined });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ sortBy: e.target.value as any });
  };

  const onUpload = async (payload: any) => {
    await uploadDocuments(payload);
  };

  /* --------------------- Memo helpers ------------------------ */
  const docTypes = useMemo(() => Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[], []);

  /* --------------------- Stats helpers ----------------------- */
  const { totalDocs, totalSize, uploads30d } = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const uploads30d = documents.filter(
      (d) => now - new Date(d.createdAt).getTime() <= THIRTY_DAYS
    ).length;

    return { totalDocs, totalSize, uploads30d };
  }, [documents]);

  return (
    <DashboardLayout title="Family Collaboration">
      <div className="space-y-6">
        {/* Hero */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Family Portal</h1>
              <p className="mt-1 text-primary-100">
                Securely share and collaborate with your family.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Upload Document
              </button>
              <button
                onClick={() => {/* placeholder */}}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Create Note
              </button>
              <button
                onClick={() => {/* placeholder */}}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Add Photos
              </button>
              <button
                onClick={() => {/* placeholder */}}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Invite Member
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-6 text-sm font-medium">
            {(['documents', 'notes', 'photos', 'members', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Missing family notice */}
        {!familyId && (
          <p className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            Unable to determine family. Provide <code>?familyId=&lt;cuid&gt;</code> in the URL
            or ensure you belong to a family.
          </p>
        )}

        {familyId && (
          <div className="rounded-md border bg-white p-4 shadow-sm">
            {/* ---------------------- DOCUMENTS TAB -------------------- */}
            {activeTab === 'documents' && (
            <>
            {/* Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full md:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents…"
                    className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    onChange={handleSearchChange}
                  />
                </div>

                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onChange={handleTypeFilter}
                  value={filters.type ?? ''}
                >
                  <option value="">All Types</option>
                  {docTypes.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>

                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onChange={handleSortChange}
                  value={filters.sortBy}
                >
                  <option value="createdAt">Newest</option>
                  <option value="title">Title</option>
                  <option value="fileSize">Size</option>
                </select>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <FiPlus className="h-4 w-4" />
                Upload
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{totalDocs}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {formatFileSize(totalSize)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Uploaded (30&nbsp;days)</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{uploads30d}</p>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="mt-8">
              {loading.isFetching ? (
                <p className="text-center text-sm text-gray-600">Loading…</p>
              ) : documents.length === 0 ? (
                <p className="text-center text-sm text-gray-500">No documents found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex h-full flex-col justify-between rounded-lg border bg-white p-4 shadow-sm"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">{doc.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.type]}</p>

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                              >
                                <FiTag className="mr-1 h-3 w-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-xs text-gray-500">
                        <div>{formatFileSize(doc.fileSize)}</div>
                        <div>
                          {new Date(doc.createdAt).toLocaleDateString()} · {doc.uploader.firstName}{' '}
                          {doc.uploader.lastName}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary-600 hover:underline"
                        >
                          <FiDownload className="mr-1" />
                          View
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="inline-flex items-center text-red-600 hover:underline"
                          title="Delete"
                        >
                          <FiTrash2 className="mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </>
            )}

            {/* --------------------- PLACEHOLDERS ---------------------- */}
            {activeTab !== 'documents' && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                <p className="text-gray-500">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {familyId && (
        <DocumentUploadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onUpload={onUpload}
          familyId={familyId}
        />
      )}
    </DashboardLayout>
  );
}