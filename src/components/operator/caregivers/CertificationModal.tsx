"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiAward, FiCalendar, FiFileText } from 'react-icons/fi';

interface CertificationModalProps {
  caregiverId: string;
  certification?: {
    id: string;
    type: string;
    certificationNumber?: string | null;
    issuingOrganization?: string | null;
    issueDate?: Date | string | null;
    expiryDate?: Date | string | null;
    documentUrl?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const CERTIFICATION_TYPES = [
  'CNA - Certified Nursing Assistant',
  'HHA - Home Health Aide',
  'CPR - Cardiopulmonary Resuscitation',
  'First Aid',
  'Medication Administration',
  'Dementia Care Specialist',
  "Alzheimer's Care Specialist",
  'Wound Care Certification',
  'IV Therapy',
  'Physical Therapy Assistant',
  'Occupational Therapy Assistant',
  'Food Handler',
  'Background Check',
  'TB Test',
  'Other',
];

export function CertificationModal({
  caregiverId,
  certification,
  onClose,
  onSuccess,
}: CertificationModalProps) {
  const isEdit = !!certification;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: certification?.type || '',
    certificationNumber: certification?.certificationNumber || '',
    issuingOrganization: certification?.issuingOrganization || '',
    issueDate: certification?.issueDate
      ? new Date(certification.issueDate).toISOString().split('T')[0]
      : '',
    expiryDate: certification?.expiryDate
      ? new Date(certification.expiryDate).toISOString().split('T')[0]
      : '',
    documentUrl: certification?.documentUrl || '',
    notes: certification?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        issueDate: formData.issueDate || null,
        expiryDate: formData.expiryDate || null,
        certificationNumber: formData.certificationNumber || null,
        issuingOrganization: formData.issuingOrganization || null,
        documentUrl: formData.documentUrl || null,
        notes: formData.notes || null,
      };

      const url = isEdit
        ? `/api/operator/caregivers/${caregiverId}/certifications/${certification.id}`
        : `/api/operator/caregivers/${caregiverId}/certifications`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save certification');
      }

      toast.success(
        isEdit ? 'Certification updated successfully' : 'Certification added successfully'
      );
      onSuccess();
    } catch (error: any) {
      console.error('Error saving certification:', error);
      toast.error(error.message || 'Failed to save certification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {isEdit ? 'Edit Certification' : 'Add Certification'}
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              {isEdit ? 'Update certification details' : 'Add a new certification for this caregiver'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Certification Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select certification type</option>
              {CERTIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Certification Number
              </label>
              <input
                type="text"
                value={formData.certificationNumber}
                onChange={(e) =>
                  setFormData({ ...formData, certificationNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., CNA-123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Issuing Organization
              </label>
              <input
                type="text"
                value={formData.issuingOrganization}
                onChange={(e) =>
                  setFormData({ ...formData, issuingOrganization: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., State Board of Nursing"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://..."
            />
            <p className="text-xs text-neutral-500 mt-1">
              Link to the certification document (e.g., uploaded to cloud storage)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional notes about this certification..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Certification' : 'Add Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
