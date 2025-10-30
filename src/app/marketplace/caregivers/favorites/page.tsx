"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CaregiverCard from "@/components/marketplace/CaregiverCard";

type Caregiver = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  hourlyRate: number | null;
  yearsExperience: number | null;
  specialties: string[];
  bio: string | null;
  photoUrl: string | null;
  backgroundCheckStatus: string;
  ratingAverage?: number;
  reviewCount?: number;
  badges?: string[];
};

export default function FamilyShortlistPage() {
  const { data: session } = useSession();
  const [ids, setIds] = useState<string[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const isFamily = session?.user?.role === 'FAMILY';

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/caregiver-favorites', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const j = await res.json();
      const favIds: string[] = j?.data || [];
      setIds(favIds);
      if (favIds.length > 0) {
        const resp = await fetch(`/api/marketplace/caregivers?ids=${encodeURIComponent(favIds.join(','))}`);
        const data = await resp.json();
        setCaregivers(data?.data || []);
      } else {
        setCaregivers([]);
      }
    } catch {
      setIds([]);
      setCaregivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const totalPages = Math.max(1, Math.ceil(caregivers.length / pageSize));
  const pageItems = useMemo(
    () => caregivers.slice((page - 1) * pageSize, page * pageSize),
    [caregivers, page]
  );

  const removeFromShortlist = async (caregiverId: string) => {
    try {
      // optimistic
      setCaregivers((prev) => prev.filter((c) => c.id !== caregiverId));
      setIds((prev) => prev.filter((id) => id !== caregiverId));
      const res = await fetch(`/api/marketplace/caregiver-favorites?caregiverId=${encodeURIComponent(caregiverId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
    } catch {
      // fallback reload
      loadFavorites();
    }
  };

  return (
    <div className="px-4 md:px-6 py-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/marketplace" className="text-sm text-primary-600 hover:underline">← Back to Marketplace</Link>
        <h1 className="text-base font-medium text-gray-900">My Caregiver Shortlist</h1>
      </div>

      {!session?.user ? (
        <div className="rounded-md border bg-white p-6 text-center text-gray-700">
          Please sign in to view your shortlist.
        </div>
      ) : !isFamily ? (
        <div className="rounded-md border bg-white p-6 text-center text-gray-700">
          Shortlists are available for family accounts.
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-gray-500">Loading shortlist…</div>
      ) : ids.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-lg font-medium text-gray-900 mb-1">No caregivers shortlisted</div>
          <div className="text-sm text-gray-600">Tap the heart on caregiver cards to add them to your shortlist.</div>
          <div className="mt-4">
            <Link href="/marketplace?tab=caregivers" className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700">Browse caregivers</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {pageItems.map((cg) => (
              <div key={cg.id} className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromShortlist(cg.id); }}
                  aria-label="Remove from shortlist"
                  aria-pressed={true}
                  className="absolute right-3 top-3 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white"
                  title="Shortlisted"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <CaregiverCard caregiver={cg} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
