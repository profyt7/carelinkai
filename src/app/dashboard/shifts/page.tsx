"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ShiftsList from '@/components/shifts/ShiftsList';

export default function ShiftsPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user?.role as 'OPERATOR' | 'CAREGIVER' | 'ADMIN' | 'STAFF' | undefined) ?? 'CAREGIVER';
  const [caregiverId, setCaregiverId] = useState('');

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

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-neutral-800 mb-4">Caregiver Shifts</h1>
      <ShiftsList role={userRole} caregiverId={caregiverId} />
    </div>
  );
}
