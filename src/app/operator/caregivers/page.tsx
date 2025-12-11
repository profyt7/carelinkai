"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, 
  FiSearch, 
  FiFilter, 
  FiUsers, 
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiDownload
} from 'react-icons/fi';
import { PermissionGuard, useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import EmptyState from '@/components/ui/empty-state';
import { CaregiverCard } from '@/components/operator/caregivers/CaregiverCard';
import { CaregiverCardSkeletonGrid } from '@/components/operator/caregivers/CaregiverCardSkeleton';
import { CaregiverModal } from '@/components/operator/caregivers/CaregiverModal';
import { CaregiverFilters, CaregiverFilterState } from '@/components/operator/caregivers/CaregiverFilters';
import { exportCaregiversToCSV, downloadCSV, generateExportFilename } from '@/lib/export-utils';

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
  yearsOfExperience?: number | null;
  certifications?: {
    id: string;
    name?: string;
    expiryDate?: Date | string | null;
  }[];
  _count?: {
    certifications?: number;
    assignments?: number;
    documents?: number;
  };
};

type SortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'date-asc' 
  | 'date-desc' 
  | 'certs-desc' 
  | 'assignments-desc'
  | 'experience-desc';

export default function CaregiversPage() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Search with debounce
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Advanced filters
  const [filters, setFilters] = useState<CaregiverFilterState>({
    certificationStatus: 'all',
    employmentType: 'ALL',
    employmentStatus: 'ALL',
    hasCertification: '',
    availability: 'all'
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);

  const canCreate = useHasPermission(PERMISSIONS.CAREGIVERS_CREATE);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch caregivers when filters change
  useEffect(() => {
    fetchCaregivers();
  }, [filters.employmentStatus, filters.employmentType]);

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.employmentStatus !== 'ALL') params.append('status', filters.employmentStatus);
      if (filters.employmentType !== 'ALL') params.append('type', filters.employmentType);
      
      const res = await fetch(`/api/operator/caregivers?${params.toString()}`);
      if (!res.ok) {
        try {
          const errorData = await res.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch caregivers';
          const errorDetails = errorData.type ? ` (${errorData.type})` : '';
          throw new Error(errorMessage + errorDetails);
        } catch (parseError) {
          throw new Error(`Failed to fetch caregivers (${res.status})`);
        }
      }
      const data = await res.json();
      setCaregivers(data.caregivers || []);
    } catch (error) {
      console.error('Error fetching caregivers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load caregivers';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters and sorting
  const filteredAndSortedCaregivers = useMemo(() => {
    let result = [...caregivers];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(caregiver => {
        const fullName = `${caregiver.user.firstName || ''} ${caregiver.user.lastName || ''}`.toLowerCase();
        const email = (caregiver.user.email || '').toLowerCase();
        const phone = (caregiver.user.phoneNumber || '').toLowerCase();
        
        // Search in certifications
        const certNames = (caregiver.certifications || [])
          .map(c => (c.name || '').toLowerCase())
          .join(' ');
        
        return fullName.includes(query) || 
               email.includes(query) || 
               phone.includes(query) ||
               certNames.includes(query);
      });
    }

    // Certification status filter
    if (filters.certificationStatus !== 'all') {
      result = result.filter(caregiver => {
        const certs = caregiver.certifications || [];
        const today = new Date();
        
        if (filters.certificationStatus === 'current') {
          return certs.some(cert => {
            if (!cert.expiryDate) return true;
            return new Date(cert.expiryDate) > today;
          });
        }
        
        if (filters.certificationStatus === 'expiring') {
          return certs.some(cert => {
            if (!cert.expiryDate) return false;
            const expiry = new Date(cert.expiryDate);
            const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
          });
        }
        
        if (filters.certificationStatus === 'expired') {
          return certs.some(cert => {
            if (!cert.expiryDate) return false;
            return new Date(cert.expiryDate) < today;
          });
        }
        
        return true;
      });
    }

    // Specific certification filter
    if (filters.hasCertification) {
      result = result.filter(caregiver => {
        const certs = caregiver.certifications || [];
        return certs.some(cert => 
          (cert.name || '').toLowerCase().includes(filters.hasCertification.toLowerCase())
        );
      });
    }

    // Availability filter (placeholder - would need assignment data)
    // This can be enhanced when assignment data is available

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`);
        case 'name-desc':
          return `${b.user.firstName} ${b.user.lastName}`.localeCompare(`${a.user.firstName} ${a.user.lastName}`);
        case 'certs-desc':
          return (b._count?.certifications || 0) - (a._count?.certifications || 0);
        case 'assignments-desc':
          return (b._count?.assignments || 0) - (a._count?.assignments || 0);
        case 'experience-desc':
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [caregivers, debouncedSearch, filters, sortBy]);

  const handleSuccess = () => {
    fetchCaregivers();
    setShowModal(false);
    router.refresh();
  };

  const handleClearFilters = useCallback(() => {
    setFilters({
      certificationStatus: 'all',
      employmentType: 'ALL',
      employmentStatus: 'ALL',
      hasCertification: '',
      availability: 'all'
    });
    setSearchQuery('');
    setSortBy('name-asc');
  }, []);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      
      // Get the filtered and sorted caregivers (respects current filters)
      const dataToExport = filteredAndSortedCaregivers;
      
      if (dataToExport.length === 0) {
        toast.error('No caregivers to export');
        return;
      }
      
      // Convert to CSV
      const csv = exportCaregiversToCSV(dataToExport);
      
      // Generate filename and download
      const filename = generateExportFilename('caregivers-export');
      downloadCSV(csv, filename);
      
      toast.success(`Exported ${dataToExport.length} caregiver${dataToExport.length !== 1 ? 's' : ''} successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export caregivers');
    } finally {
      setExporting(false);
    }
  }, [filteredAndSortedCaregivers]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Caregivers' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Caregivers</h1>
          <p className="text-neutral-600 mt-1">
            Manage caregiver profiles, certifications, and assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || loading || caregivers.length === 0}
            className="btn btn-secondary flex items-center gap-2 whitespace-nowrap"
            title="Export filtered caregivers to CSV"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                Exporting...
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4" />
                Export CSV
              </>
            )}
          </button>
          
          {/* Add Caregiver Button */}
          <PermissionGuard permission={PERMISSIONS.CAREGIVERS_CREATE}>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <FiPlus className="w-4 h-4" />
              Add Caregiver
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Search, Sort, and Filter Bar */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or certification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
            {debouncedSearch && (
              <p className="text-xs text-neutral-500 mt-1.5 ml-1">
                Found {filteredAndSortedCaregivers.length} caregiver{filteredAndSortedCaregivers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Sort */}
          <div className="w-full lg:w-56">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="certs-desc">Most Certifications</option>
              <option value="assignments-desc">Most Assignments</option>
              <option value="experience-desc">Most Experience</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
          >
            <FiFilter className="w-4 h-4" />
            Advanced Filters
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <CaregiverFilters 
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm font-medium text-neutral-700">
            Showing <span className="text-primary-600">{filteredAndSortedCaregivers.length}</span> of {caregivers.length} caregiver{caregivers.length !== 1 ? 's' : ''}
          </p>
          {(debouncedSearch || filters.certificationStatus !== 'all' || filters.hasCertification) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Loading State with Skeletons */}
      {loading && <CaregiverCardSkeletonGrid count={6} />}

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
      {!loading && filteredAndSortedCaregivers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
          {filteredAndSortedCaregivers.map((caregiver) => (
            <CaregiverCard key={caregiver.id} caregiver={caregiver} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && caregivers.length > 0 && filteredAndSortedCaregivers.length === 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <FiSearch className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No caregivers match your criteria
          </h3>
          <p className="text-neutral-600 mb-6">
            Try adjusting your filters or search query to find what you're looking for.
          </p>
          <button
            onClick={handleClearFilters}
            className="btn btn-secondary"
          >
            Clear all filters
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
