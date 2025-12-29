"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import {
  CertificationStatusBadge,
  getCertificationStatus,
} from './CertificationStatusBadge';
import { CertificationModal } from './CertificationModal';

interface CertificationsTabProps {
  caregiverId: string;
}

type Certification = {
  id: string;
  type: string;
  certificationNumber?: string | null;
  issuingOrganization?: string | null;
  issueDate?: Date | string | null;
  expiryDate?: Date | string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function CertificationsTab({ caregiverId }: CertificationsTabProps) {
  const router = useRouter();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | undefined>(undefined);

  useEffect(() => {
    fetchCertifications();
  }, [caregiverId]);

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/certifications`);
      if (!res.ok) throw new Error('Failed to fetch certifications');
      const data = await res.json();
      setCertifications(data.certifications || []);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      toast.error('Failed to load certifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;

    try {
      const res = await fetch(
        `/api/operator/caregivers/${caregiverId}/certifications/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) throw new Error('Failed to delete certification');

      toast.success('Certification deleted successfully');
      fetchCertifications();
      router.refresh();
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast.error('Failed to delete certification');
    }
  };

  const openEditModal = (cert: Certification) => {
    setEditingCert(cert);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCert(undefined);
  };

  const handleSuccess = () => {
    fetchCertifications();
    closeModal();
    router.refresh();
  };

  // Calculate compliance summary
  const summary = {
    total: certifications.length,
    current: 0,
    expiringSoon: 0,
    expired: 0,
  };

  certifications.forEach((cert) => {
    const status = getCertificationStatus(cert.expiryDate);
    if (status === 'CURRENT') summary.current++;
    else if (status === 'EXPIRING_SOON') summary.expiringSoon++;
    else if (status === 'EXPIRED') summary.expired++;
  });

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
          <h3 className="text-lg font-semibold text-neutral-900">Certifications</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Manage certifications and track expiration dates
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS}>
          <button
            onClick={() => {
              setEditingCert(undefined);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Certification
          </button>
        </PermissionGuard>
      </div>

      {/* Compliance Summary */}
      {certifications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-neutral-900">{summary.total}</p>
                <p className="text-sm text-neutral-600 mt-1">Total Certifications</p>
              </div>
              <FiFileText className="w-8 h-8 text-neutral-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-900">{summary.current}</p>
                <p className="text-sm text-green-700 mt-1">Current</p>
              </div>
              <FiCheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-900">{summary.expiringSoon}</p>
                <p className="text-sm text-yellow-700 mt-1">Expiring Soon</p>
              </div>
              <FiAlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-900">{summary.expired}</p>
                <p className="text-sm text-red-700 mt-1">Expired</p>
              </div>
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Certifications List */}
      {certifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <FiFileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No certifications yet
          </h3>
          <p className="text-neutral-600 mb-6">
            Add certifications to track compliance and expiration dates
          </p>
          <PermissionGuard permission={PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS}>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Add First Certification
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert) => {
            const status = getCertificationStatus(cert.expiryDate);
            return (
              <div
                key={cert.id}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-base font-semibold text-neutral-900">
                        {cert.type}
                      </h4>
                      <CertificationStatusBadge
                        status={status}
                        expiryDate={cert.expiryDate}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {cert.certificationNumber && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-0.5">
                            Certification Number
                          </p>
                          <p className="text-sm text-neutral-900 font-medium">
                            {cert.certificationNumber}
                          </p>
                        </div>
                      )}
                      {cert.issuingOrganization && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-0.5">Issuing Organization</p>
                          <p className="text-sm text-neutral-900">{cert.issuingOrganization}</p>
                        </div>
                      )}
                      {cert.issueDate && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-0.5">Issue Date</p>
                          <p className="text-sm text-neutral-900">
                            {new Date(cert.issueDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {cert.expiryDate && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-0.5">Expiry Date</p>
                          <p className="text-sm text-neutral-900">
                            {new Date(cert.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {cert.notes && (
                      <div className="mb-4">
                        <p className="text-xs text-neutral-500 mb-1">Notes</p>
                        <p className="text-sm text-neutral-700">{cert.notes}</p>
                      </div>
                    )}

                    {cert.documentUrl && (
                      <div>
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <FiExternalLink className="w-4 h-4" />
                          View Document
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <PermissionGuard permission={PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS}>
                      <button
                        onClick={() => openEditModal(cert)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit certification"
                      >
                        <FiEdit2 className="w-4 h-4 text-neutral-600" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission={PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS}>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete certification"
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
        <CertificationModal
          caregiverId={caregiverId}
          certification={editingCert}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
