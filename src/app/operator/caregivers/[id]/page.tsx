"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiTrash2, 
  FiUser, 
  FiAward, 
  FiUsers, 
  FiFileText,
  FiCheckCircle,
  FiBriefcase
} from 'react-icons/fi';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { StatCard } from '@/components/ui/StatCard';
import { QuickActionsMenu } from '@/components/operator/caregivers/QuickActionsMenu';
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
  certifications?: any[];
  assignments?: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function CaregiverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caregiverId = params.id as string;

  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [certCount, setCertCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);

  // Handle tab from URL query parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['overview', 'certifications', 'assignments', 'documents'].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

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
      
      // Set counts from the data
      setCertCount(data.certifications?.length || 0);
      setAssignmentCount(data.assignments?.length || 0);
      
      // Fetch document count separately
      try {
        const docRes = await fetch(`/api/operator/caregivers/${caregiverId}/documents`);
        if (docRes.ok) {
          const docData = await docRes.json();
          setDocumentCount(docData.documents?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching document count:', err);
      }
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

  // Count active certifications
  const activeCertCount = caregiver.certifications?.filter((cert: any) => {
    if (!cert.expiryDate) return true;
    return new Date(cert.expiryDate) > new Date();
  }).length || 0;

  const tabs: { 
    id: Tab; 
    label: string; 
    icon: React.ReactNode;
    count?: number;
  }[] = [
    { 
      id: 'overview', 
      label: 'Overview',
      icon: <FiUser className="w-4 h-4" />
    },
    { 
      id: 'certifications', 
      label: 'Certifications',
      icon: <FiAward className="w-4 h-4" />,
      count: certCount
    },
    { 
      id: 'assignments', 
      label: 'Assignments',
      icon: <FiUsers className="w-4 h-4" />,
      count: assignmentCount
    },
    { 
      id: 'documents', 
      label: 'Documents',
      icon: <FiFileText className="w-4 h-4" />,
      count: documentCount
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
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
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4 font-medium transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Caregivers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                {(caregiver.employmentType || '').replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                caregiver.employmentStatus === 'ACTIVE' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {caregiver.employmentStatus || 'Unknown'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <QuickActionsMenu 
              caregiver={caregiver}
              onUpdate={fetchCaregiver}
            />
            <PermissionGuard permission={PERMISSIONS.CAREGIVERS_DELETE}>
              <button
                onClick={handleDelete}
                className="btn btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Certifications"
          value={certCount}
          icon={<FiAward className="w-5 h-5" />}
          color="blue"
        />
        
        <StatCard
          title="Active Certifications"
          value={activeCertCount}
          icon={<FiCheckCircle className="w-5 h-5" />}
          color="green"
        />
        
        <StatCard
          title="Current Assignments"
          value={assignmentCount}
          icon={<FiBriefcase className="w-5 h-5" />}
          color="purple"
        />
        
        <StatCard
          title="Documents"
          value={documentCount}
          icon={<FiFileText className="w-5 h-5" />}
          color="gray"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="border-b border-neutral-200 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-6 py-4 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-primary-600'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`transition-colors ${
                    activeTab === tab.id ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'
                  }`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t"></div>
                )}
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
