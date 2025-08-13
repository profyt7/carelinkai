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
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types/family';
import { FiPlus, FiSearch, FiTrash2, FiDownload } from 'react-icons/fi';

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

  return (
    <DashboardLayout title="Family Collaboration">
      <div className="space-y-6">
        {/* Hero */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <h1 className="text-2xl font-bold md:text-3xl">Family Documents</h1>
          <p className="mt-1 text-primary-100">
            Securely share and manage important family documents.
          </p>
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

            {/* Documents Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Size</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Uploader</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Created</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading.isFetching ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Loading…
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                        No documents found.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-3 py-2">{doc.title}</td>
                        <td className="px-3 py-2">{DOCUMENT_TYPE_LABELS[doc.type]}</td>
                        <td className="px-3 py-2">{(doc.fileSize / 1024 / 1024).toFixed(1)} MB</td>
                        <td className="px-3 py-2">
                          {doc.uploader.firstName} {doc.uploader.lastName}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 inline-flex items-center text-primary-600 hover:underline"
                          >
                            <FiDownload className="mr-1" /> View
                          </a>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="inline-flex items-center text-red-600 hover:underline"
                            title="Delete"
                          >
                            <FiTrash2 className="mr-1" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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