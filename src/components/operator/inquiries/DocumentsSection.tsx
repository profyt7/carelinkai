'use client';

import { useState, useEffect } from 'react';
import { FiFileText, FiDownload, FiTrash2, FiUpload, FiFile, FiImage, FiFilter } from 'react-icons/fi';
import { DocumentUploadModal } from './DocumentUploadModal';
import { formatFileSize, formatDateForCSV } from '@/lib/export-utils';

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  documentType: string;
  description: string | null;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
}

interface DocumentsSectionProps {
  inquiryId: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'APPLICATION_FORM': 'Application Form',
  'PHOTO_ID': 'Photo ID',
  'INSURANCE_DOCUMENT': 'Insurance Document',
  'MEDICAL_RECORD': 'Medical Record',
  'FINANCIAL_INFORMATION': 'Financial Information',
  'BACKGROUND_CHECK': 'Background Check',
  'REFERENCE_LETTER': 'Reference Letter',
  'TOUR_NOTES': 'Tour Notes',
  'CONTRACT': 'Contract',
  'OTHER': 'Other',
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <FiImage className="w-5 h-5 text-blue-500" />;
  } else if (fileType === 'application/pdf') {
    return <FiFile className="w-5 h-5 text-red-500" />;
  } else {
    return <FiFileText className="w-5 h-5 text-neutral-500" />;
  }
};

export function DocumentsSection({ inquiryId }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operator/inquiries/${inquiryId}/documents`);
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [inquiryId]);

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeleting(documentId);
      const res = await fetch(`/api/operator/inquiries/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    // Open in new tab for download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.download = fileName;
    link.click();
  };

  const filteredDocuments = filterType === 'all'
    ? documents
    : documents.filter((doc) => doc.documentType === filterType);

  // Get unique document types for filter
  const uniqueTypes = Array.from(new Set(documents.map((doc) => doc.documentType)));

  return (
    <div className="space-y-4">
      {/* Header with Upload Button and Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-neutral-900">Documents</h3>
          <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded">
            {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          {uniqueTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-neutral-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiUpload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
          <FiFileText className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
          <p className="text-neutral-600 mb-2">
            {filterType === 'all' ? 'No documents uploaded yet' : 'No documents of this type'}
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(doc.fileType)}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-neutral-900 truncate">{doc.fileName}</h4>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                    {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </span>
                </div>
                {doc.description && (
                  <p className="text-sm text-neutral-600 mb-1">{doc.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>Uploaded by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</span>
                  <span>•</span>
                  <span>{formatDateForCSV(doc.uploadedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                  className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <FiDownload className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        inquiryId={inquiryId}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
