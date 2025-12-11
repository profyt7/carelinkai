'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiBarChart2, FiList } from 'react-icons/fi';
import { ResidentAnalytics } from './ResidentAnalytics';
import { StatusPill } from './InlineActions';
import { ResidentRowActions } from './ResidentsListActions';

interface ResidentsPageContentProps {
  items: any[];
  nextCursor: string | null;
  q: string;
  status: string;
  homeId: string;
  familyId: string;
}

export function ResidentsPageContent({ items, nextCursor, q, status, homeId, familyId }: ResidentsPageContentProps) {
  const [view, setView] = useState<'list' | 'analytics'>('list');

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
            view === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FiList className="w-4 h-4" />
          List View
        </button>
        <button
          onClick={() => setView('analytics')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
            view === 'analytics'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FiBarChart2 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Content */}
      {view === 'analytics' ? (
        <ResidentAnalytics residents={items} totalCapacity={100} />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Resident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admission</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {items.map((r) => {
                    const age = r.dateOfBirth ? calculateAge(r.dateOfBirth) : null;
                    const roomNumber = r.careNeeds?.roomNumber || '—';
                    const admissionFormatted = r.admissionDate 
                      ? new Date(r.admissionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—';
                    
                    return (
                      <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10">
                              {r.photoUrl ? (
                                <Image
                                  src={r.photoUrl}
                                  alt={`${r.firstName} ${r.lastName}`}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                  <span className="text-neutral-600 font-medium text-sm">
                                    {r.firstName[0]}{r.lastName[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <Link href={`/operator/residents/${r.id}`} className="text-sm font-medium text-neutral-900 hover:text-primary-600">
                                {r.firstName} {r.lastName}
                              </Link>
                              {r.home && (
                                <p className="text-xs text-neutral-500">{r.home.name}</p>
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
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                          {admissionFormatted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ResidentRowActions residentId={r.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {nextCursor && (
            <div className="mt-4">
              <Link 
                className="btn btn-sm" 
                href={`/operator/residents?${new URLSearchParams({ q, status, homeId, familyId, cursor: nextCursor }).toString()}`}
              >
                Next
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
