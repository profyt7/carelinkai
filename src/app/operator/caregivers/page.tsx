"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiSearch, FiFilter, FiUsers } from 'react-icons/fi';
import { PermissionGuard, useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import EmptyState from '@/components/ui/empty-state';
import { CaregiverCard } from '@/components/operator/caregivers/CaregiverCard';
import { CaregiverModal } from '@/components/operator/caregivers/CaregiverModal';

type Caregiver = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  };
  photoUrl?: string | null;
  specializations?: string[];
  employmentType: string;
  employmentStatus: string;
  certifications?: {
    id: string;
    expiryDate?: Date | string | null;
  }[];
};

export default function CaregiversPage() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('ALL');
  const [employmentType, setEmploymentType] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const canCreate = useHasPermission(PERMISSIONS.CAREGIVERS_CREATE);

  useEffect(() => {
    fetchCaregivers();
  }, [employmentStatus, employmentType]);

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (employmentStatus !== 'ALL') params.append('status', employmentStatus);
      if (employmentType !== 'ALL') params.append('type', employmentType);
      
      const res = await fetch(`/api/operator/caregivers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch caregivers');
      const data = await res.json();
      setCaregivers(data.caregivers || []);
    } catch (error) {
      console.error('Error fetching caregivers:', error);
      toast.error('Failed to load caregivers');
    } finally {
      setLoading(false);
    }
  };

  // Filter caregivers by search query
  const filteredCaregivers = caregivers.filter(caregiver => {
    if (!searchQuery) return true;
    const fullName = `${caregiver.user.firstName} ${caregiver.user.lastName}`.toLowerCase();
    const email = caregiver.user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const handleSuccess = () => {
    fetchCaregivers();
    setShowModal(false);
    router.refresh();
  };

  return (
    <div className="p-6">
      <Breadcrumbs
        items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Caregivers' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Caregivers</h1>
          <p className="text-neutral-600 mt-1">
            Manage caregiver profiles, certifications, and assignments
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.CAREGIVERS_CREATE}>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Caregiver
          </button>
        </PermissionGuard>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            <FiFilter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-200">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Employment Status
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="PER_DIEM">Per Diem</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-neutral-600">
            Showing {filteredCaregivers.length} of {caregivers.length} caregivers
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && caregivers.length === 0 && (
        <EmptyState
          icon={FiUsers}
          title="No caregivers yet"
          description="Add caregivers to manage their profiles, certifications, and resident assignments."
          action={
            canCreate
              ? {
                  label: 'Add Caregiver',
                  onClick: () => setShowModal(true),
                }
              : undefined
          }
        />
      )}

      {/* Caregivers Grid */}
      {!loading && filteredCaregivers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCaregivers.map((caregiver) => (
            <CaregiverCard key={caregiver.id} caregiver={caregiver} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && caregivers.length > 0 && filteredCaregivers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-600">No caregivers match your search criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setEmploymentStatus('ALL');
              setEmploymentType('ALL');
            }}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <CaregiverModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
