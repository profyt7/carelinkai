'use client';

import { useState, useEffect } from 'react';
import { FiFileText, FiDownload, FiTrash2, FiUpload, FiEye } from 'react-icons/fi';
import { DocumentUploadModal } from './DocumentUploadModal';
import { formatFileSize } from '@/lib/export-utils';

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  documentType: string;
  description: string | null;
  fileSize: number;
  uploadedAt: Date | string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'MEDICAL_RECORD': 'Medical Record',
  'CARE_PLAN': 'Care Plan',
  'INSURANCE': 'Insurance',
  'ADVANCE_DIRECTIVE': 'Advance Directive',
  'MEDICATION_LIST': 'Medication List',
  'ASSESSMENT_REPORT': 'Assessment Report',
  'INCIDENT_REPORT': 'Incident Report',
  'PHOTO_ID': 'Photo ID',
  'EMERGENCY_CONTACT': 'Emergency Contact',
  'OTHER': 'Other',
};

export function DocumentsSection({ residentId }: { residentId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [residentId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/residents/${residentId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        setError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/operator/residents/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== documentId));
      } else {
        setError('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filteredDocuments = filterType === 'all'
    ? documents
    : documents.filter(doc => doc.documentType === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-600">Loading documents...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Documents</h3>
          <p className="text-sm text-neutral-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiUpload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Filter by Type
        </label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full sm:w-64 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Documents</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
          <FiFileText className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 mb-4">
            {filterType === 'all' ? 'No documents found' : `No ${DOCUMENT_TYPE_LABELS[filterType]} documents found`}
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FiFileText className="w-5 h-5 text-primary-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-neutral-900 truncate">{doc.fileName}</h4>
                    <p className="text-sm text-neutral-600 mt-1">
                      {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                    </p>
                    {doc.description && (
                      <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500">
                      <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                      <span>by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleView(doc.fileUrl)}
                    className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="View"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                    className="p-2 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Download"
                  >
                    <FiDownload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        residentId={residentId}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
