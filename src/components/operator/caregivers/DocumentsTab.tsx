"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiExternalLink, FiFile, FiAlertCircle } from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface DocumentsTabProps {
  caregiverId: string;
}

type Document = {
  id: string;
  type: string;
  title: string;
  documentUrl?: string | null;
  uploadDate?: Date | string | null;
  expiryDate?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const DOCUMENT_TYPES = [
  'Background Check',
  'TB Test',
  'Physical Exam',
  'Drug Screening',
  'Reference Letter',
  'Training Certificate',
  'License',
  'Insurance',
  'Contract',
  'Other',
];

export function DocumentsTab({ caregiverId }: DocumentsTabProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | undefined>(undefined);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    documentUrl: '',
    uploadDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: formData.type,
        title: formData.title,
        documentUrl: formData.documentUrl || null,
        uploadDate: formData.uploadDate || null,
        expiryDate: formData.expiryDate || null,
        notes: formData.notes || null,
      };

      const url = editingDoc
        ? `/api/operator/caregivers/${caregiverId}/documents/${editingDoc.id}`
        : `/api/operator/caregivers/${caregiverId}/documents`;
      const method = editingDoc ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save document');

      toast.success(editingDoc ? 'Document updated successfully' : 'Document added successfully');
      setShowModal(false);
      setEditingDoc(undefined);
      resetForm();
      fetchDocuments();
      router.refresh();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

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

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      type: doc.type,
      title: doc.title,
      documentUrl: doc.documentUrl || '',
      uploadDate: doc.uploadDate
        ? new Date(doc.uploadDate).toISOString().split('T')[0]
        : '',
      expiryDate: doc.expiryDate
        ? new Date(doc.expiryDate).toISOString().split('T')[0]
        : '',
      notes: doc.notes || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: '',
      title: '',
      documentUrl: '',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      notes: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDoc(undefined);
    resetForm();
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
            onClick={() => {
              setEditingDoc(undefined);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Document
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
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Add First Document
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
                        {doc.type}
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

                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
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
                    </div>

                    {doc.notes && (
                      <p className="text-sm text-neutral-700 mb-2">{doc.notes}</p>
                    )}

                    {doc.documentUrl && (
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        View Document
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <PermissionGuard permission={PERMISSIONS.DOCUMENTS_UPDATE}>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit document"
                      >
                        <FiEdit2 className="w-4 h-4 text-neutral-600" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission={PERMISSIONS.DOCUMENTS_DELETE}>
                      <button
                        onClick={() => handleDelete(doc.id)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">
                {editingDoc ? 'Edit Document' : 'Add Document'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Document Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select type</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Document URL
                </label>
                <input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Upload Date
                  </label>
                  <input
                    type="date"
                    value={formData.uploadDate}
                    onChange={(e) => setFormData({ ...formData, uploadDate: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDoc ? 'Update Document' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
