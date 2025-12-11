"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { FiSearch, FiX, FiGrid, FiList } from 'react-icons/fi';
import { ResidentCard, ResidentCardGrid } from './ResidentCard';
import { ResidentFiltersComponent, ResidentFilters, DEFAULT_FILTERS } from './ResidentFilters';
import { ResidentListSkeleton, ResidentTableSkeleton } from './ResidentCardSkeleton';
import { calculateAge, isAgeInRange, isAdmissionInRange, getRoomFloor } from '@/lib/resident-utils';
import EmptyState from '@/components/ui/empty-state';
import { FiUsers } from 'react-icons/fi';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  photoUrl?: string | null;
  dateOfBirth?: string;
  admissionDate?: string | null;
  careLevel?: string | null;
  careNeeds?: {
    roomNumber?: string;
    careLevel?: string;
  } | null;
  home?: {
    id: string;
    name: string;
  } | null;
  primaryCaregiver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    assessments?: number;
    incidents?: number;
  };
}

interface ResidentsListClientProps {
  initialResidents: Resident[];
  caregivers?: Array<{ id: string; firstName: string; lastName: string }>;
}

type SortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'admission-desc' 
  | 'admission-asc' 
  | 'age-asc' 
  | 'age-desc' 
  | 'care-level' 
  | 'room';

export function ResidentsListClient({ 
  initialResidents, 
  caregivers = [] 
}: ResidentsListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ResidentFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isLoading, setIsLoading] = useState(false);

  // Apply filters, search, and sorting
  const processedResidents = useMemo(() => {
    let result = [...initialResidents];

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(resident => {
        const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
        const roomNumber = resident.careNeeds?.roomNumber?.toLowerCase() || '';
        return fullName.includes(searchLower) || roomNumber.includes(searchLower);
      });
    }

    // Apply filters
    result = result.filter(resident => {
      // Care level filter
      if (filters.careLevel !== 'all') {
        const residentCareLevel = resident.careLevel || resident.careNeeds?.careLevel;
        if (residentCareLevel !== filters.careLevel) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && resident.status !== filters.status) {
        return false;
      }

      // Age range filter
      if (filters.ageRange !== 'all' && resident.dateOfBirth) {
        const age = calculateAge(resident.dateOfBirth);
        if (!isAgeInRange(age, filters.ageRange)) {
          return false;
        }
      }

      // Room floor filter
      if (filters.roomFloor !== 'all') {
        const roomNumber = resident.careNeeds?.roomNumber;
        if (roomNumber) {
          const floor = getRoomFloor(roomNumber);
          if (floor !== parseInt(filters.roomFloor)) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Admission date filter
      if (filters.admissionDateRange !== 'all' && resident.admissionDate) {
        if (!isAdmissionInRange(resident.admissionDate, filters.admissionDateRange)) {
          return false;
        }
      }

      // Assigned caregiver filter
      if (filters.assignedCaregiver !== 'all') {
        if (!resident.primaryCaregiver || resident.primaryCaregiver.id !== filters.assignedCaregiver) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name-desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'admission-desc':
          if (!a.admissionDate) return 1;
          if (!b.admissionDate) return -1;
          return new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime();
        case 'admission-asc':
          if (!a.admissionDate) return 1;
          if (!b.admissionDate) return -1;
          return new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
        case 'age-asc':
          if (!a.dateOfBirth) return 1;
          if (!b.dateOfBirth) return -1;
          return calculateAge(a.dateOfBirth) - calculateAge(b.dateOfBirth);
        case 'age-desc':
          if (!a.dateOfBirth) return 1;
          if (!b.dateOfBirth) return -1;
          return calculateAge(b.dateOfBirth) - calculateAge(a.dateOfBirth);
        case 'care-level':
          const careLevelOrder: Record<string, number> = { 
            INDEPENDENT: 1, 
            ASSISTED_LIVING: 2, 
            MEMORY_CARE: 3, 
            SKILLED_NURSING: 4 
          };
          const aLevel = a.careLevel || a.careNeeds?.careLevel || 'INDEPENDENT';
          const bLevel = b.careLevel || b.careNeeds?.careLevel || 'INDEPENDENT';
          return (careLevelOrder[aLevel] || 0) - (careLevelOrder[bLevel] || 0);
        case 'room':
          const aRoom = parseInt(a.careNeeds?.roomNumber || '0');
          const bRoom = parseInt(b.careNeeds?.roomNumber || '0');
          return aRoom - bRoom;
        default:
          return 0;
      }
    });

    return result;
  }, [initialResidents, searchTerm, filters, sortBy]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');
  const showingResults = searchTerm || hasActiveFilters;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Sort Dropdown */}
          <div className="sm:w-56">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="admission-desc">Newest Admission</option>
              <option value="admission-asc">Oldest Admission</option>
              <option value="age-asc">Youngest First</option>
              <option value="age-desc">Oldest First</option>
              <option value="care-level">By Care Level</option>
              <option value="room">By Room Number</option>
            </select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border border-neutral-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${
                viewMode === 'table'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="Table View"
            >
              <FiList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="Grid View"
            >
              <FiGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Count */}
        {showingResults && (
          <div className="mt-3 text-sm text-neutral-600">
            Found {processedResidents.length} resident{processedResidents.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>

      {/* Filters */}
      <ResidentFiltersComponent
        filters={filters}
        onChange={setFilters}
        onClear={handleClearFilters}
        caregivers={caregivers}
      />

      {/* Results */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <ResidentListSkeleton count={6} />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Care Level</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                <ResidentTableSkeleton count={5} />
              </tbody>
            </table>
          </div>
        )
      ) : processedResidents.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title={showingResults ? "No residents found" : "No residents yet"}
          description={
            showingResults
              ? "No residents match your search or filter criteria. Try adjusting your filters."
              : "Add residents to track their care and information. Start by creating your first resident profile."
          }
          action={
            showingResults
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchTerm('');
                    handleClearFilters();
                  }
                }
              : {
                  label: "Add Resident",
                  href: "/operator/residents/new"
                }
          }
        />
      ) : viewMode === 'grid' ? (
        <ResidentCardGrid residents={processedResidents} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Care Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {processedResidents.map((resident) => {
                  const age = resident.dateOfBirth ? calculateAge(resident.dateOfBirth) : null;
                  const roomNumber = resident.careNeeds?.roomNumber || '—';
                  const careLevel = resident.careLevel || resident.careNeeds?.careLevel;
                  const admissionFormatted = resident.admissionDate 
                    ? new Date(resident.admissionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  
                  return (
                    <tr key={resident.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            {resident.photoUrl ? (
                              <Image
                                src={resident.photoUrl}
                                alt={`${resident.firstName} ${resident.lastName}`}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                <span className="text-neutral-600 font-medium text-sm">
                                  {resident.firstName[0]}{resident.lastName[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <a href={`/operator/residents/${resident.id}`} className="text-sm font-medium text-neutral-900 hover:text-primary-600">
                              {resident.firstName} {resident.lastName}
                            </a>
                            {resident.home && (
                              <p className="text-xs text-neutral-500">{resident.home.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {age ? `${age} yrs` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {roomNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          resident.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          resident.status === 'INQUIRY' ? 'bg-blue-100 text-blue-800' :
                          resident.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          resident.status === 'DISCHARGED' ? 'bg-neutral-100 text-neutral-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {resident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {careLevel && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            careLevel === 'INDEPENDENT' ? 'bg-green-100 text-green-800' :
                            careLevel === 'ASSISTED_LIVING' ? 'bg-blue-100 text-blue-800' :
                            careLevel === 'MEMORY_CARE' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {careLevel.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {admissionFormatted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
