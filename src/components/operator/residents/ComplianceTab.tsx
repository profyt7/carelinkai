"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiCalendar, FiFileText, FiCheckCircle, FiAlertCircle, FiFile, FiShield } from 'react-icons/fi';
import { PermissionGuard, RoleGuard, ActionGuard, useHasPermission, useUserRole } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

// Compliance Types
const COMPLIANCE_TYPES = [
  { value: 'MEDICAL_RECORDS', label: 'Medical Records', icon: FiFileText },
  { value: 'INSURANCE', label: 'Insurance Documentation', icon: FiFile },
  { value: 'LEGAL_DOCUMENTS', label: 'Legal Documents', icon: FiFile },
  { value: 'CARE_PLANS', label: 'Care Plans', icon: FiFileText },
  { value: 'MEDICATION_LISTS', label: 'Medication Lists', icon: FiFileText },
  { value: 'EMERGENCY_CONTACTS', label: 'Emergency Contacts', icon: FiFileText },
  { value: 'HEALTH_ASSESSMENTS', label: 'Health Assessments', icon: FiFileText },
  { value: 'BACKGROUND_CHECKS', label: 'Background Checks', icon: FiFile },
  { value: 'IMMUNIZATION_RECORDS', label: 'Immunization Records', icon: FiFileText },
  { value: 'ADVANCE_DIRECTIVES', label: 'Advance Directives', icon: FiFile },
  { value: 'OTHER', label: 'Other', icon: FiFile },
];

const COMPLIANCE_STATUSES = [
  { value: 'CURRENT', label: 'Current', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800', icon: FiAlertCircle },
  { value: 'EXPIRED', label: 'Expired', color: 'bg-red-100 text-red-800', icon: FiAlertCircle },
  { value: 'NOT_REQUIRED', label: 'Not Required', color: 'bg-neutral-100 text-neutral-800', icon: FiX },
];

type ComplianceItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  issuedDate?: string | null;
  expiryDate?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ComplianceTab({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState<ComplianceItem | null>(null);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [formData, setFormData] = useState({
    type: 'MEDICAL_RECORDS',
    title: '',
    status: 'CURRENT',
    issuedDate: '',
    expiryDate: '',
    documentUrl: '',
    notes: '',
    verifiedBy: '',
    verifiedAt: '',
  });

  useEffect(() => {
    fetchItems();
  }, [residentId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/compliance?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch compliance items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching compliance items:', error);
      toast.error('Failed to load compliance items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: formData.type,
        title: formData.title,
        status: formData.status,
        issuedDate: formData.issuedDate ? new Date(formData.issuedDate).toISOString() : null,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
        documentUrl: formData.documentUrl || null,
        notes: formData.notes || null,
        verifiedBy: formData.verifiedBy || null,
        verifiedAt: formData.verifiedAt ? new Date(formData.verifiedAt).toISOString() : null,
      };

      const url = editingItem
        ? `/api/residents/${residentId}/compliance/${editingItem.id}`
        : `/api/residents/${residentId}/compliance`;
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save compliance item');

      toast.success(editingItem ? 'Compliance item updated' : 'Compliance item created');
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
      router.refresh();
    } catch (error) {
      console.error('Error saving compliance item:', error);
      toast.error('Failed to save compliance item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this compliance item?')) return;

    try {
      const res = await fetch(`/api/residents/${residentId}/compliance/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete compliance item');

      toast.success('Compliance item deleted');
      fetchItems();
      router.refresh();
    } catch (error) {
      console.error('Error deleting compliance item:', error);
      toast.error('Failed to delete compliance item');
    }
  };

  const openEditModal = (item: ComplianceItem) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      status: item.status,
      issuedDate: item.issuedDate ? new Date(item.issuedDate).toISOString().slice(0, 10) : '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
      documentUrl: item.documentUrl || '',
      notes: item.notes || '',
      verifiedBy: item.verifiedBy || '',
      verifiedAt: item.verifiedAt ? new Date(item.verifiedAt).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'MEDICAL_RECORDS',
      title: '',
      status: 'CURRENT',
      issuedDate: '',
      expiryDate: '',
      documentUrl: '',
      notes: '',
      verifiedBy: '',
      verifiedAt: '',
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    resetForm();
  };

  const getTypeLabel = (type: string) => {
    return COMPLIANCE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusColor = (status: string) => {
    return COMPLIANCE_STATUSES.find(s => s.value === status)?.color || 'bg-neutral-100 text-neutral-800';
  };

  const getStatusIcon = (status: string) => {
    const Icon = COMPLIANCE_STATUSES.find(s => s.value === status)?.icon || FiFileText;
    return Icon;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <RoleGuard 
      roles={["ADMIN", "OPERATOR"]}
      fallback={
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <FiShield className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-amber-900 mb-2">Restricted Access</h3>
          <p className="text-amber-800">
            Compliance information is only accessible to administrators and operators.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Compliance</h2>
            <p className="text-neutral-600 mt-1">Track regulatory compliance and documentation</p>
          </div>
          <ActionGuard resourceType="compliance" action="create">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <FiPlus className="w-5 h-5" />
              Add Compliance Item
            </button>
          </ActionGuard>
        </div>

      {/* Compliance Grid */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <FiFileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No compliance items yet</h3>
          <p className="text-neutral-600 mb-4">Start tracking compliance documents and requirements</p>
          <ActionGuard resourceType="compliance" action="create">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <FiPlus className="w-5 h-5" />
              Add Compliance Item
            </button>
          </ActionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const StatusIcon = getStatusIcon(item.status);
            const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null;
            return (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mb-2">{getTypeLabel(item.type)}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      <StatusIcon className="w-3 h-3" />
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewModal(item)}
                      className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 rounded"
                      title="View details"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <ActionGuard resourceType="compliance" action="update">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-50 rounded"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                    </ActionGuard>
                    <ActionGuard resourceType="compliance" action="delete">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-neutral-50 rounded"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </ActionGuard>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {item.expiryDate && (
                    <div>
                      <div className="flex items-center gap-2 text-neutral-600 mb-1">
                        <FiCalendar className="w-4 h-4" />
                        <span className="font-medium">Expires:</span>
                      </div>
                      <p className={`${daysUntilExpiry !== null && daysUntilExpiry < 30 ? 'text-orange-600 font-medium' : 'text-neutral-900'}`}>
                        {formatDate(item.expiryDate)}
                        {daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry < 30 && (
                          <span className="ml-1">({daysUntilExpiry} days)</span>
                        )}
                      </p>
                    </div>
                  )}
                  {item.verifiedBy && (
                    <div className="text-neutral-600">
                      <span className="font-medium">Verified by:</span> {item.verifiedBy}
                    </div>
                  )}
                  {item.documentUrl && (
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                    >
                      <FiFile className="w-4 h-4" />
                      View Document
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editingItem ? 'Edit Compliance Item' : 'New Compliance Item'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {COMPLIANCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Annual Health Insurance Card"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {COMPLIANCE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Issued Date
                  </label>
                  <input
                    type="date"
                    value={formData.issuedDate}
                    onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Verified By
                  </label>
                  <input
                    type="text"
                    value={formData.verifiedBy}
                    onChange={(e) => setFormData({ ...formData, verifiedBy: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Staff member name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Verified At
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.verifiedAt}
                    onChange={(e) => setFormData({ ...formData, verifiedAt: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Additional notes or details..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Compliance Item Details</h3>
              <button onClick={() => setViewModal(null)} className="p-1 hover:bg-neutral-100 rounded">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-1">Title</h4>
                <p className="text-lg font-semibold text-neutral-900">{viewModal.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-1">Type</h4>
                <p className="text-neutral-900">{getTypeLabel(viewModal.type)}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Status</h4>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewModal.status)}`}>
                  {React.createElement(getStatusIcon(viewModal.status), { className: 'w-4 h-4' })}
                  {viewModal.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {viewModal.issuedDate && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Issued Date</h4>
                    <p className="text-neutral-900">{formatDate(viewModal.issuedDate)}</p>
                  </div>
                )}

                {viewModal.expiryDate && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Expiry Date</h4>
                    <p className="text-neutral-900">{formatDate(viewModal.expiryDate)}</p>
                  </div>
                )}
              </div>

              {viewModal.verifiedBy && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 mb-1">Verified By</h4>
                    <p className="text-neutral-900">{viewModal.verifiedBy}</p>
                  </div>
                  {viewModal.verifiedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500 mb-1">Verified At</h4>
                      <p className="text-neutral-900">{formatDate(viewModal.verifiedAt)}</p>
                    </div>
                  )}
                </div>
              )}

              {viewModal.documentUrl && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Document</h4>
                  <a
                    href={viewModal.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                  >
                    <FiFile className="w-4 h-4" />
                    View Document
                  </a>
                </div>
              )}

              {viewModal.notes && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Notes</h4>
                  <p className="text-neutral-900 whitespace-pre-wrap">{viewModal.notes}</p>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(viewModal.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {formatDate(viewModal.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(viewModal);
                    setViewModal(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Edit Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </RoleGuard>
  );
}
