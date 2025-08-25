"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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

  return (
    <DashboardLayout title="Shifts Dashboard">
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
              <ShiftsList role={userRole} />
            ) : (
              <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
