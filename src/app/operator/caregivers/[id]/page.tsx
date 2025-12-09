"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { OverviewTab } from '@/components/operator/caregivers/OverviewTab';
import { CertificationsTab } from '@/components/operator/caregivers/CertificationsTab';
import { AssignmentsTab } from '@/components/operator/caregivers/AssignmentsTab';
import { DocumentsTab } from '@/components/operator/caregivers/DocumentsTab';

type Tab = 'overview' | 'certifications' | 'assignments' | 'documents';

type Caregiver = {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  };
  photoUrl?: string | null;
  dateOfBirth?: Date | string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  employmentType: string;
  employmentStatus: string;
  hireDate?: Date | string | null;
  specializations?: string[];
  languages?: string[];
  yearsOfExperience?: number | null;
  bio?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function CaregiverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caregiverId = params.id as string;

  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    fetchCaregiver();
  }, [caregiverId]);

  const fetchCaregiver = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operator/caregivers/${caregiverId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Caregiver not found');
          router.push('/operator/caregivers');
          return;
        }
        throw new Error('Failed to fetch caregiver');
      }
      const data = await res.json();
      setCaregiver(data);
    } catch (error) {
      console.error('Error fetching caregiver:', error);
      toast.error('Failed to load caregiver');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this caregiver? This action cannot be undone.'))
      return;

    try {
      const res = await fetch(`/api/operator/caregivers/${caregiverId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete caregiver');

      toast.success('Caregiver deleted successfully');
      router.push('/operator/caregivers');
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Failed to delete caregiver');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Caregiver not found</h2>
          <p className="text-neutral-600 mb-6">
            The caregiver you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/operator/caregivers" className="btn btn-primary">
            Back to Caregivers
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${caregiver.user.firstName} ${caregiver.user.lastName}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Caregivers', href: '/operator/caregivers' },
          { label: fullName },
        ]}
      />

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/operator/caregivers"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Caregivers
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{fullName}</h1>
            <p className="text-neutral-600 mt-1">
              {caregiver.employmentType.replace('_', ' ')} - {caregiver.employmentStatus}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PermissionGuard permission={PERMISSIONS.CAREGIVERS_DELETE}>
              <button
                onClick={handleDelete}
                className="btn btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="border-b border-neutral-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab caregiver={caregiver} onUpdate={fetchCaregiver} />
          )}
          {activeTab === 'certifications' && <CertificationsTab caregiverId={caregiverId} />}
          {activeTab === 'assignments' && <AssignmentsTab caregiverId={caregiverId} />}
          {activeTab === 'documents' && <DocumentsTab caregiverId={caregiverId} />}
        </div>
      </div>
    </div>
  );
}
