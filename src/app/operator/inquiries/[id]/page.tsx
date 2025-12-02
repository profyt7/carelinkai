"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { InquiryStatus } from '@prisma/client';

type InquiryDetail = {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  tourDate: string | null;
  message: string | null;
  internalNotes: string;
  operatorResponse: string | null;
  operatorResponseAt: string | null;
  home: { id: string; name: string };
  family: { id: string; name: string; email: string; phone: string | null };
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
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);

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
        setResponse('');
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

  const sendResponse = async () => {
    if (!data || sending || !response.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/operator/inquiries/${data.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: response.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      const j = await res.json();
      setData({
        ...data,
        operatorResponse: j.operatorResponse || response.trim(),
        operatorResponseAt: j.operatorResponseAt || new Date().toISOString(),
      });
      setResponse('');
    } catch (e: any) {
      alert(e?.message || 'Failed to send response');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Inquiry Details">
        <div className="p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Inquiry Details">
        <div className="p-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Not found'}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Lead - ${data.home.name}`} showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button className="text-sm text-neutral-600 hover:text-neutral-800" onClick={() => router.push('/operator/inquiries')}>
            ← Back to Leads
          </button>
          <Link className="text-sm text-primary-600 hover:underline" href={`/homes/${data.home.id}`}>View Listing</Link>
        </div>

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
              <div className="mb-3 text-sm font-medium text-neutral-800">Family Contact</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-neutral-500">Name</div>
                  <div className="font-medium text-neutral-900">{data.family.name}</div>
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
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-neutral-800">Lead Status</div>
              <select
                className="w-full form-select"
                value={data.status}
                onChange={(e) => updateStatus(e.target.value as InquiryStatus)}
                disabled={updatingStatus}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Response to Family */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-800">Response to Family</div>
              <button onClick={sendResponse} disabled={sending || !response.trim()} className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:bg-neutral-300">
                {sending ? 'Sending…' : 'Send response'}
              </button>
            </div>
            {data.operatorResponse && (
              <div className="mb-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                <div className="mb-1 text-xs text-neutral-500">Last sent {data.operatorResponseAt ? new Date(data.operatorResponseAt).toLocaleString() : ''}</div>
                <div className="whitespace-pre-wrap">{data.operatorResponse}</div>
              </div>
            )}
            <textarea
              className="h-32 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write a message to the family (they'll receive this by email)."
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
