"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { InquiryStatus } from '@prisma/client';

type Inquiry = {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  tourDate: string | null;
  home: { id: string; name: string };
};

export default function OperatorInquiriesTable({ initial }: { initial: Inquiry[] }) {
  const [items, setItems] = useState<Inquiry[]>(initial);
  const [filter, setFilter] = useState<'ALL' | InquiryStatus>('ALL');
  const filtered = useMemo(
    () => (filter === 'ALL' ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  const statuses: InquiryStatus[] = [
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST',
  ];

  const updateStatus = async (id: string, status: InquiryStatus) => {
    const prev = items;
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i)));
    const res = await fetch(`/api/operator/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // revert
      setItems(prev);
      const data = await res.json().catch(() => ({}));
      alert(`Failed to update: ${data?.error || res.statusText}`);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Inquiries</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600">Status</label>
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="py-2 pr-4">Home</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Tour</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="py-2 pr-4">
                  <Link href={`/operator/inquiries/${i.id}`} className="text-primary-600 hover:underline">
                    {i.home.name}
                  </Link>
                </td>
                <td className="py-2 pr-4">{new Date(i.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{i.tourDate ? new Date(i.tourDate).toLocaleString() : '-'}</td>
                <td className="py-2 pr-4">
                  <select
                    className="form-select"
                    value={i.status}
                    onChange={(e) => updateStatus(i.id, e.target.value as InquiryStatus)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-500">
                  No inquiries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
