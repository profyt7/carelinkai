"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiExternalLink, FiFile, FiAlertCircle, FiDownload, FiEye } from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { DocumentUploadModal } from './DocumentUploadModal';

interface DocumentsTabProps {
  caregiverId: string;
}

type Document = {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  documentType: string;
  expiryDate?: Date | string | null;
  uploadDate?: Date | string | null;
  uploadedBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'CERTIFICATION': 'Certification',
  'BACKGROUND_CHECK': 'Background Check',
  'TRAINING': 'Training Certificate',
  'CONTRACT': 'Employment Contract',
  'IDENTIFICATION': 'Identification',
  'REFERENCE': 'Reference Letter',
  'OTHER': 'Other',
};

export function DocumentsTab({ caregiverId }: DocumentsTabProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [caregiverId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
    router.refresh();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/documents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete document');

      toast.success('Document deleted successfully');
      fetchDocuments();
      router.refresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  // Check for expiring documents
  const checkExpiration = (expiryDate: Date | string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Documents</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Manage caregiver documents and track expiration dates
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.DOCUMENTS_CREATE}>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Upload Document
          </button>
        </PermissionGuard>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <FiFile className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No documents yet</h3>
          <p className="text-neutral-600 mb-6">
            Add documents to track important caregiver files and certifications
          </p>
          <PermissionGuard permission={PERMISSIONS.DOCUMENTS_CREATE}>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Upload First Document
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const expirationStatus = checkExpiration(doc.expiryDate);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-semibold text-neutral-900">{doc.title}</h4>
                      <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </span>
                      {expirationStatus === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          <FiAlertCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                      {expirationStatus === 'expiring' && (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                          <FiAlertCircle className="w-3 h-3" />
                          Expiring Soon
                        </span>
                      )}
                    </div>

                    {doc.description && (
                      <p className="text-sm text-neutral-700 mb-2">{doc.description}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                      {doc.uploadDate && (
                        <div>
                          <span className="text-neutral-500">Uploaded: </span>
                          <span className="text-neutral-900">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {doc.expiryDate && (
                        <div>
                          <span className="text-neutral-500">Expires: </span>
                          <span className="text-neutral-900">
                            {new Date(doc.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {doc.uploadedBy && (
                        <div className="sm:col-span-2">
                          <span className="text-neutral-500">Uploaded by: </span>
                          <span className="text-neutral-900">{doc.uploadedBy}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl)}
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc.fileUrl, doc.title)}
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Delete Action */}
                  <div className="flex items-center">
                    <PermissionGuard permission={PERMISSIONS.DOCUMENTS_DELETE}>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <FiTrash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          caregiverId={caregiverId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
