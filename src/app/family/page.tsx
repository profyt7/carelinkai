'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentUploadModal from '@/components/family/DocumentUploadModal';

export default function FamilyPage() {
  /* ------------------------------------------------------------------
     Local state
  ------------------------------------------------------------------*/
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

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const FAMILY_ID = 'cmdhjmp2x0000765nc52usnp7';

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------*/
  const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  /* ------------------------------------------------------------------
     Fetch documents
  ------------------------------------------------------------------*/
  useEffect(() => {
    const controller = new AbortController();
    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          familyId: FAMILY_ID,
          limit: '12',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (search) params.set('search', search);
        if (docType) params.append('type', docType);

        const res = await fetch(`/api/family/documents?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load documents');
        const json = await res.json();
        setDocs(json.documents ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
    return () => controller.abort();
  }, [search, docType]);

  /* ------------------------------------------------------------------
     Real-time updates via SSE
  ------------------------------------------------------------------*/
  useEffect(() => {
    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${FAMILY_ID}`)}`
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
     Upload handler passed to modal
  ------------------------------------------------------------------*/
  interface UploadDocument {
    familyId: string;
    title: string;
    description?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    file: File;
    type: string;
    isEncrypted: boolean;
    tags: string[];
  }

  const handleUpload = async (items: UploadDocument[]) => {
    for (const item of items) {
      const form = new FormData();
      form.append('familyId', item.familyId);
      form.append('title', item.title);
      form.append('description', item.description ?? '');
      form.append('type', item.type);
      form.append('isEncrypted', item.isEncrypted ? 'true' : 'false');
      form.append('tags', JSON.stringify(item.tags));
      form.append('file', item.file);

      const res = await fetch('/api/family/documents', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const json = await res.json();
      if (json.document) {
        setDocs((prev) => [json.document, ...prev]);
      }
    }
  };

  /* ------------------------------------------------------------------
     Render
  ------------------------------------------------------------------*/
  return (
    <DashboardLayout title="Family Collaboration">
      <div className="space-y-6">
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Family Collaboration</h1>
              <p className="mt-1 text-primary-100">
                Shared documents and resources for your family.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30"
            >
              Upload Documents
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 md:max-w-xs"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 md:max-w-xs"
          >
            <option value="">All Types</option>
            {['CARE_PLAN','MEDICAL_RECORD','LEGAL_DOCUMENT','INSURANCE_DOCUMENT','PHOTO','VIDEO','PERSONAL_DOCUMENT','OTHER'].map(
              (t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              )
            )}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading documents…</div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : docs.length === 0 ? (
          <div className="py-20 text-center text-gray-500">No documents found</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col rounded-md border bg-white p-4 shadow-sm"
              >
                {/* title */}
                <h3 className="mb-1 line-clamp-2 font-medium text-gray-900">
                  {doc.title}
                </h3>
                {/* type badge */}
                <span className="mb-2 inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                  {doc.type.replace(/_/g, ' ')}
                </span>
                {/* meta */}
                <div className="mb-2 text-xs text-gray-500">
                  {new Date(doc.createdAt).toLocaleDateString()} •{' '}
                  {formatBytes(doc.fileSize)}
                </div>
                {/* tags */}
                <div className="mb-3 flex flex-wrap gap-1">
                  {doc.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {/* uploader initials */}
                <div className="mt-auto flex items-center">
                  <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                    {`${doc.uploader.firstName?.[0] ?? ''}${doc.uploader.lastName?.[0] ?? ''}`}
                  </div>
                  <span className="text-xs text-gray-600">
                    {doc.uploader.firstName} {doc.uploader.lastName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Upload modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        familyId={FAMILY_ID}
      />
    </DashboardLayout>
  );
}