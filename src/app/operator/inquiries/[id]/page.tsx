"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { InquiryStatus } from '@prisma/client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import ConvertInquiryModal from '@/components/operator/inquiries/ConvertInquiryModal';
import InquiryStatusBadge from '@/components/operator/inquiries/InquiryStatusBadge';
import { DocumentsSection } from '@/components/operator/inquiries/DocumentsSection';
import { useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

type InquiryDetail = {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  tourDate: string | null;
  message: string | null;
  internalNotes: string;
  home: { 
    id: string; 
    name: string; 
    address?: { street: string; city: string; state: string; }
  };
  family: { 
    id: string; 
    name: string; 
    email: string; 
    phone: string | null; 
    user: { firstName: string; lastName: string; email: string; phone?: string; }
  };
  convertedToResidentId?: string | null;
  conversionDate?: string | null;
  convertedResident?: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
  } | null;
  convertedBy?: {
    firstName: string;
    lastName: string;
  } | null;
  conversionNotes?: string | null;
};

export default function OperatorLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const canConvert = useHasPermission(PERMISSIONS.INQUIRIES_CONVERT);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/operator/inquiries/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        const j = await res.json();
        if (cancelled) return;
        setData(j.inquiry);
        setNotes(j.inquiry.internalNotes || '');
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const statuses: InquiryStatus[] = [
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'QUALIFIED',
    'CONVERTING',
    'CONVERTED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST',
  ];

  const updateStatus = async (status: InquiryStatus) => {
    if (!data || updatingStatus) return;
    setUpdatingStatus(true);
    const prev = data;
    setData({ ...data, status });
    try {
      const res = await fetch(`/api/operator/inquiries/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    } catch (e: any) {
      alert(e?.message || 'Failed to update status');
      setData(prev);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!data || savingNotes) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/operator/inquiries/${data.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    } catch (e: any) {
      alert(e?.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Not found'}</div>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Inquiries', href: '/operator/inquiries' },
          { label: `#${id.slice(0, 8)}` }
        ]} />

        {/* Summary card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs text-neutral-500">Home</div>
              <div className="font-medium text-neutral-900">{data.home.name}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Submitted</div>
              <div className="font-medium text-neutral-900">{new Date(data.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Tour</div>
              <div className="font-medium text-neutral-900">{data.tourDate ? new Date(data.tourDate).toLocaleString() : '-'}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Family contact */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-neutral-800">Family Contact</div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/families/${data.family.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-md hover:bg-neutral-200 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </Link>
                  <Link
                    href={`/messages?userId=${data.family.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </Link>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-neutral-500">Name</div>
                  <Link
                    href={`/families/${data.family.id}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {data.family.name}
                  </Link>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Email</div>
                  <a className="font-medium text-primary-600 hover:underline" href={`mailto:${data.family.email}`}>{data.family.email}</a>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Phone</div>
                  <div className="font-medium text-neutral-900">{data.family.phone || '-'}</div>
                </div>
              </div>
            </div>

            {/* Inquiry details */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-neutral-800">Inquiry Details</div>
              <pre className="whitespace-pre-wrap text-sm text-neutral-800">{data.message || '—'}</pre>
            </div>

            {/* Internal notes */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-neutral-800">Internal Notes</div>
                <button onClick={saveNotes} disabled={savingNotes} className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:bg-neutral-300">
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
              <textarea
                className="h-40 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes for your team…"
              />
            </div>

            {/* Documents Section */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <DocumentsSection inquiryId={id} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-neutral-800">Lead Status</div>
              <InquiryStatusBadge status={data.status} size="md" showDescription />
              <select
                className="w-full form-select mt-3"
                value={data.status}
                onChange={(e) => updateStatus(e.target.value as InquiryStatus)}
                disabled={updatingStatus || !!data.convertedToResidentId}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {data.convertedToResidentId && (
                <p className="mt-2 text-xs text-gray-500">
                  Status cannot be changed after conversion
                </p>
              )}
            </div>

            {/* Conversion Info or Convert Button */}
            {data.convertedToResidentId && data.convertedResident ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-2 text-sm font-medium text-green-900">Converted to Resident</div>
                <Link
                  href={`/operator/residents/${data.convertedResident.id}`}
                  className="block text-primary-600 hover:text-primary-700 font-medium mb-2"
                >
                  {data.convertedResident.firstName} {data.convertedResident.lastName}
                </Link>
                {data.conversionDate && (
                  <p className="text-xs text-green-700 mb-1">
                    Converted: {new Date(data.conversionDate).toLocaleDateString()}
                  </p>
                )}
                {data.convertedBy && (
                  <p className="text-xs text-green-700 mb-1">
                    By: {data.convertedBy.firstName} {data.convertedBy.lastName}
                  </p>
                )}
                {data.conversionNotes && (
                  <p className="text-xs text-green-700 italic mt-2">
                    "{data.conversionNotes}"
                  </p>
                )}
              </div>
            ) : canConvert && ['QUALIFIED', 'CONVERTING', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED'].includes(data.status) ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Convert to Resident
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  Create a resident profile from this inquiry
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Convert Modal */}
        {showConvertModal && data && (
          <ConvertInquiryModal
            inquiry={{
              id: data.id,
              family: {
                user: data.family.user,
              },
              home: {
                name: data.home.name,
                address: data.home.address,
              },
              message: data.message || undefined,
            }}
            onClose={() => setShowConvertModal(false)}
            onSuccess={(residentId) => {
              setShowConvertModal(false);
              // Refresh the page to show conversion status
              router.refresh();
            }}
          />
        )}
      </div>
  );
}
