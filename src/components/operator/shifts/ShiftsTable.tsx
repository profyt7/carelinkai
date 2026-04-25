'use client';

import { useState } from 'react';
import Link from 'next/link';
import UnassignShiftButton from '@/components/operator/UnassignShiftButton';
import RecordCallOffModal from '@/components/operator/shifts/RecordCallOffModal';

interface ShiftRow {
  id: string;
  startTime: string;
  endTime: string;
  hourlyRate: string | number;
  status: string;
  home: { id: string; name: string } | null;
  caregiver: { id: string; user: { firstName: string; lastName: string } } | null;
}

export default function ShiftsTable({ shifts }: { shifts: ShiftRow[] }) {
  const [callOffShift, setCallOffShift] = useState<ShiftRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="overflow-x-auto card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="py-2 pr-4">Home</th>
              <th className="py-2 pr-4">Start</th>
              <th className="py-2 pr-4">End</th>
              <th className="py-2 pr-4">Rate</th>
              <th className="py-2 pr-4">Caregiver</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-2 pr-4">{s.home?.name || 'Unknown'}</td>
                <td className="py-2 pr-4">{new Date(s.startTime).toLocaleString()}</td>
                <td className="py-2 pr-4">{new Date(s.endTime).toLocaleString()}</td>
                <td className="py-2 pr-4">${Number(s.hourlyRate).toFixed(2)}</td>
                <td className="py-2 pr-4">
                  {s.caregiver ? `${s.caregiver.user.firstName} ${s.caregiver.user.lastName}` : '—'}
                </td>
                <td className="py-2 pr-4">{s.status}</td>
                <td className="py-2 pr-4 text-right">
                  <div className="flex gap-2 justify-end flex-wrap">
                    <Link href={`/operator/shifts/${s.id}/assign`} className="btn btn-sm">
                      {s.caregiver ? 'Reassign' : 'Assign'}
                    </Link>
                    {s.caregiver && (
                      <>
                        <UnassignShiftButton shiftId={s.id} className="btn btn-sm btn-secondary" />
                        {['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status) && (
                          <button
                            onClick={() => setCallOffShift(s)}
                            className="btn btn-sm text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Call-Off
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {callOffShift && (
        <RecordCallOffModal
          shiftId={callOffShift.id}
          caregiverName={
            callOffShift.caregiver
              ? `${callOffShift.caregiver.user.firstName} ${callOffShift.caregiver.user.lastName}`
              : 'Unknown'
          }
          onClose={() => setCallOffShift(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
