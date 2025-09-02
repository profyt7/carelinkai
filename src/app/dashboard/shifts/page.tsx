"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ShiftsList from '@/components/shifts/ShiftsList';
import PostShiftForm from '@/components/shifts/PostShiftForm';

export default function ShiftsPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user?.role as 'OPERATOR' | 'CAREGIVER' | 'ADMIN' | 'STAFF' | undefined) ?? 'CAREGIVER';
  const [caregiverId, setCaregiverId] = useState('');

  /* operator data */
  const [homes, setHomes] = useState<any[]>([]);
  const [loadingHomes, setLoadingHomes] = useState(false);
  const [homesError, setHomesError] = useState<string | null>(null);

  /* caregiver view state */
  const [caregiverView, setCaregiverView] = useState('open'); // open | mine | offers | applications

  /* operator filter state */
  const [operatorHomeId, setOperatorHomeId] = useState('');
  const [operatorStatus, setOperatorStatus] = useState('');
  /* default to newest shifts first */
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (status !== 'authenticated' || userRole !== 'CAREGIVER') return;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data?.roleSpecificData?.id) {
          setCaregiverId(data.data.roleSpecificData.id as string);
        }
      } catch {
        // ignore
      }
    })();
  }, [status, userRole]);

  /* fetch homes for operator/admin/staff */
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!(userRole === 'OPERATOR' || userRole === 'ADMIN' || userRole === 'STAFF')) return;

    const fetchHomes = async () => {
      try {
        setLoadingHomes(true);
        setHomesError(null);
        const res = await fetch('/api/operator/homes');
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (data.success) setHomes(data.data);
        else throw new Error(data.error || 'Failed');
      } catch (err: any) {
        setHomesError(err.message ?? 'Error');
      } finally {
        setLoadingHomes(false);
      }
    };
    fetchHomes();
  }, [status, userRole]);

  /* build query string for ShiftsList */
  const query = (() => {
    if (userRole === 'CAREGIVER') {
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
    }

    if (userRole === 'OPERATOR' || userRole === 'ADMIN' || userRole === 'STAFF') {
      let q = '';
      if (operatorHomeId) q += `${q ? '&' : '?'}homeId=${operatorHomeId}`;
      if (operatorStatus) q += `${q ? '&' : '?'}status=${operatorStatus}`;
      q += `${q ? '&' : '?'}sortBy=${sortBy}&sortOrder=${sortOrder}`;
      q += `&limit=${pageSize}&offset=${page * pageSize}`;
      return q;
    }
    return '';
  })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-neutral-800 mb-4">Caregiver Shifts</h1>
      <p className="text-neutral-600 mb-6">Manage caregiver shifts and applications.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: post form for operator/admin/staff */}
        {['OPERATOR', 'ADMIN', 'STAFF'].includes(userRole) && (
          <div className="lg:col-span-1">
            {loadingHomes ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">Loading homes…</div>
            ) : homesError ? (
              <div className="bg-red-50 rounded-lg shadow p-6 text-red-600">{homesError}</div>
            ) : (
              <PostShiftForm homes={homes} />
            )}
          </div>
        )}

        {/* RIGHT: list & controls */}
        <div className={['OPERATOR', 'ADMIN', 'STAFF'].includes(userRole) ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {/* caregiver tabs */}
          {userRole === 'CAREGIVER' && (
            <div className="mb-4 flex border-b border-neutral-200 text-sm">
              {['open', 'mine', 'offers', 'applications'].map((v) => (
                <button
                  key={v}
                  onClick={() => setCaregiverView(v)}
                  className={`mr-4 pb-2 ${
                    caregiverView === v
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-neutral-600 hover:text-primary-700'
                  }`}
                >
                  {v === 'open'
                    ? 'Open Shifts'
                    : v === 'mine'
                    ? 'My Shifts'
                    : v === 'offers'
                    ? 'My Offers'
                    : 'My Applications'}
                </button>
              ))}
            </div>
          )}

          {/* operator/admin/staff filters */}
          {['OPERATOR', 'ADMIN', 'STAFF'].includes(userRole) && (
            <div className="mb-4 flex flex-wrap gap-2 items-end bg-white p-4 rounded-md shadow">
              {/* home filter */}
              <select
                value={operatorHomeId}
                onChange={(e) => setOperatorHomeId(e.target.value)}
                className="form-select text-sm border-neutral-300 rounded-md"
              >
                <option value="">All Homes</option>
                {homes.map((h) => (
                  <option value={h.id} key={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              {/* status */}
              <select
                value={operatorStatus}
                onChange={(e) => setOperatorStatus(e.target.value)}
                className="form-select text-sm border-neutral-300 rounded-md"
              >
                <option value="">All Status</option>
                <option value="OPEN">OPEN</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELED">CANCELED</option>
              </select>

              {/* sortBy */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(0);
                }}
                className="form-select text-sm border-neutral-300 rounded-md"
              >
                <option value="startTime">Start</option>
                <option value="createdAt">Created</option>
                <option value="hourlyRate">Rate</option>
              </select>

              {/* order */}
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setPage(0);
                }}
                className="form-select text-sm border-neutral-300 rounded-md"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>

              {/* page size */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                className="form-select text-sm border-neutral-300 rounded-md"
              >
                {[10, 20, 50].map((s) => (
                  <option key={s} value={s}>
                    {s}/page
                  </option>
                ))}
              </select>

              {/* pagination */}
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 text-xs bg-neutral-100 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 text-xs bg-neutral-100 rounded"
              >
                Next
              </button>
            </div>
          )}

          <ShiftsList role={userRole} caregiverId={caregiverId} query={query} />
        </div>
      </div>
    </div>
  );
}
