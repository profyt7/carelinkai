"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PostShiftForm from '@/components/shifts/PostShiftForm';
import ShiftsList from '@/components/shifts/ShiftsList';

interface Home {
  id: string;
  name: string;
  address?: any;
  operator?: {
    id: string;
    name: string;
  };
}

export default function ShiftsPage() {
  const { data: session, status } = useSession();
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user role
  const userRole = session?.user?.role as 'OPERATOR' | 'CAREGIVER' | 'ADMIN' | 'STAFF' | undefined;
  
  // Check if user can post shifts
  const canPostShifts = ['OPERATOR', 'ADMIN', 'STAFF'].includes(userRole || '');

  // Caregiver tab state
  const [caregiverView, setCaregiverView] = useState<
    'open' | 'mine' | 'offers' | 'applications'
  >('open');

  // Logged-in caregiver id (for offer/accept logic downstream)
  const [caregiverId, setCaregiverId] = useState<string>('');

  // Operator filters
  const [operatorHomeId, setOperatorHomeId] = useState<string>('');
  const [operatorStatus, setOperatorStatus] = useState<
    '' | 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELED'
  >('');
  // Sorting / paging
  const [sortBy, setSortBy] = useState<'startTime' | 'createdAt' | 'hourlyRate'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Fetch homes for operators, admins, and staff
  useEffect(() => {
    if (status === 'loading' || !canPostShifts) return;

    const fetchHomes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/operator/homes');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch homes: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setHomes(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch homes');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching homes');
        console.error('Error fetching homes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomes();
  }, [status, canPostShifts]);

  // Fetch caregiverId for CAREGIVER role
  useEffect(() => {
    if (status !== 'authenticated' || userRole !== 'CAREGIVER') return;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data?.roleSpecificData?.id) {
          setCaregiverId(data.data.roleSpecificData.id as string);
        }
      } catch {
        /* ignore */
      }
    };
    fetchProfile();
  }, [status, userRole]);

  return (
    <div data-layout="dashboard">
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Caregiver Shifts</h1>
          <p className="text-neutral-600">Manage caregiver shifts for your homes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Post Shift Form (for operators, admins, staff) */}
          {canPostShifts && (
            <div className="lg:col-span-1">
              {loading ? (
                <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">Error: {error}</p>
                  </div>
                </div>
              ) : (
                <PostShiftForm homes={homes} />
              )}
            </div>
          )}

          {/* Right column - Shifts List (for all users) */}
          <div className={`${canPostShifts ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {userRole ? (
              <>
                {/* Caregiver tabs */}
                {userRole === 'CAREGIVER' && (
                  <div className="mb-4 flex border-b border-neutral-200">
                    <button
                      onClick={() => setCaregiverView('open')}
                      className={`px-4 py-2 text-sm font-medium ${
                        caregiverView === 'open'
                          ? 'border-b-2 border-primary-600 text-primary-700'
                          : 'text-neutral-600 hover:text-primary-700'
                      }`}
                    >
                      Open Shifts
                    </button>
                    <button
                      onClick={() => setCaregiverView('mine')}
                      className={`ml-4 px-4 py-2 text-sm font-medium ${
                        caregiverView === 'mine'
                          ? 'border-b-2 border-primary-600 text-primary-700'
                          : 'text-neutral-600 hover:text-primary-700'
                      }`}
                    >
                      My Shifts
                    </button>
                    <button
                      onClick={() => setCaregiverView('offers')}
                      className={`ml-4 px-4 py-2 text-sm font-medium ${
                        caregiverView === 'offers'
                          ? 'border-b-2 border-primary-600 text-primary-700'
                          : 'text-neutral-600 hover:text-primary-700'
                      }`}
                    >
                      My Offers
                    </button>
                    <button
                      onClick={() => setCaregiverView('applications')}
                      className={`ml-4 px-4 py-2 text-sm font-medium ${
                        caregiverView === 'applications'
                          ? 'border-b-2 border-primary-600 text-primary-700'
                          : 'text-neutral-600 hover:text-primary-700'
                      }`}
                    >
                      My Applications
                    </button>
                  </div>
                )}

                {/* Operator/Admin/Staff filters */}
                {(userRole === 'OPERATOR' ||
                  userRole === 'ADMIN' ||
                  userRole === 'STAFF') && (
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end bg-white p-4 rounded-md shadow">
                    <div className="flex-1">
                      <label
                        htmlFor="homeFilter"
                        className="block text-xs font-medium text-neutral-600 mb-1"
                      >
                        Home
                      </label>
                      <select
                        id="homeFilter"
                        value={operatorHomeId}
                        onChange={(e) => setOperatorHomeId(e.target.value)}
                        className="w-full form-select rounded-md border-neutral-300 text-sm"
                      >
                        <option value="">All Homes</option>
                        {homes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label
                        htmlFor="statusFilter"
                        className="block text-xs font-medium text-neutral-600 mb-1"
                      >
                        Status
                      </label>
                      <select
                        id="statusFilter"
                        value={operatorStatus}
                        onChange={(e) =>
                          setOperatorStatus(
                            e.target.value as
                              | ''
                              | 'OPEN'
                              | 'ASSIGNED'
                              | 'COMPLETED'
                              | 'CANCELED'
                          )
                        }
                        className="w-full form-select rounded-md border-neutral-300 text-sm"
                      >
                        <option value="">All</option>
                        <option value="OPEN">OPEN</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELED">CANCELED</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div className="flex-1">
                      <label
                        htmlFor="sortBy"
                        className="block text-xs font-medium text-neutral-600 mb-1"
                      >
                        Sort By
                      </label>
                      <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as 'startTime' | 'createdAt' | 'hourlyRate');
                          setPage(0);
                        }}
                        className="w-full form-select rounded-md border-neutral-300 text-sm"
                      >
                        <option value="startTime">Start Time</option>
                        <option value="createdAt">Created</option>
                        <option value="hourlyRate">Hourly Rate</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex-1">
                      <label
                        htmlFor="sortOrder"
                        className="block text-xs font-medium text-neutral-600 mb-1"
                      >
                        Order
                      </label>
                      <select
                        id="sortOrder"
                        value={sortOrder}
                        onChange={(e) => {
                          setSortOrder(e.target.value as 'asc' | 'desc');
                          setPage(0);
                        }}
                        className="w-full form-select rounded-md border-neutral-300 text-sm"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>

                    {/* Page size */}
                    <div className="flex-1">
                      <label
                        htmlFor="pageSize"
                        className="block text-xs font-medium text-neutral-600 mb-1"
                      >
                        Page Size
                      </label>
                      <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value));
                          setPage(0);
                        }}
                        className="w-full form-select rounded-md border-neutral-300 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOperatorHomeId('');
                        setOperatorStatus('');
                        setSortBy('startTime');
                        setSortOrder('asc');
                        setPageSize(10);
                        setPage(0);
                      }}
                      className="sm:ml-4 mt-2 sm:mt-0 inline-flex justify-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Pagination controls */}
                  <div className="mb-4 flex items-center gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 text-sm bg-neutral-100 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-neutral-600">Page {page + 1}</span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1 text-sm bg-neutral-100 rounded"
                    >
                      Next
                    </button>
                  </div>
                )}

                <ShiftsList
                  role={userRole}
                  caregiverId={caregiverId}
                  query={
                    userRole === 'CAREGIVER'
                      ? (() => {
                          switch (caregiverView) {
                            case 'mine':
                              return '?status=ASSIGNED&status=COMPLETED';
                            case 'offers':
                              return '?applications=mine&appStatus=OFFERED';
                            case 'applications':
                              return '?applications=mine&appStatus=APPLIED';
                            default:
                              return '';
                          }
                        })()
                      : (() => {
                          if (
                            userRole === 'OPERATOR' ||
                            userRole === 'ADMIN' ||
                            userRole === 'STAFF'
                          ) {
                            let q = '';
                            if (operatorHomeId) {
                              q += `?homeId=${operatorHomeId}`;
                            }
                            if (operatorStatus) {
                              q += `${q ? '&' : '?'}status=${operatorStatus}`;
                            }
                          // sorting / paging
                          q += `${q ? '&' : '?'}sortBy=${sortBy}&sortOrder=${sortOrder}`;
                          q += `&limit=${pageSize}&offset=${page * pageSize}`;
                            return q;
                          }
                          return '';
                        })()
                  }
                />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
