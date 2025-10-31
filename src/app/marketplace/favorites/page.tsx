"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
<<<<<<< HEAD
import DashboardLayout from "@/components/layout/DashboardLayout";
=======
>>>>>>> origin/main
import Image from "next/image";
import { getBlurDataURL } from "@/lib/imageBlur";

type FavItem = {
  id: string;
  listingId: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    description: string;
    city: string | null;
    state: string | null;
    status: string | null;
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
    createdAt: string;
  }
};

export default function FavoritesPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/marketplace/favorites', { cache: 'no-store' });
        const j = await res.json();
        setItems(j?.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page]);

  const removeFavorite = async (listingId: string) => {
    try {
      // Optimistic update
      setItems((prev) => prev.filter((f) => f.listingId !== listingId));
      const res = await fetch(`/api/marketplace/favorites?listingId=${encodeURIComponent(listingId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // Reload on failure
      try {
        const res = await fetch('/api/marketplace/favorites', { cache: 'no-store' });
        const j = await res.json();
        setItems(j?.data || []);
      } catch {}
    }
  };

  return (
<<<<<<< HEAD
    <DashboardLayout title="My Favorite Jobs">
=======
>>>>>>> origin/main
      <div className="px-4 md:px-6 py-4">
        <div className="mb-4">
          <Link href="/marketplace" className="text-sm text-primary-600 hover:underline">← Back to Marketplace</Link>
        </div>

        {!session?.user ? (
          <div className="rounded-md border bg-white p-6 text-center text-gray-700">
            Please sign in to view your favorites.
          </div>
        ) : session.user.role !== 'CAREGIVER' ? (
          <div className="rounded-md border bg-white p-6 text-center text-gray-700">
            Favorites are available for caregiver accounts.
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-gray-500">Loading favorites…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-lg font-medium text-gray-900 mb-1">No favorites yet</div>
            <div className="text-sm text-gray-600">Tap the heart on job listings to save them here.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {pageItems.map(({ listing }) => (
                <div key={listing.id} className="relative bg-white border rounded-md p-4">
                  <button
                    onClick={() => removeFavorite(listing.id)}
                    className="absolute left-3 top-3 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white"
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  {listing.status && (
                    <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${listing.status === 'OPEN' ? 'bg-green-100 text-green-800' : listing.status === 'HIRED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                      {listing.status}
                    </span>
                  )}
                  <Link href={`/marketplace/listings/${listing.id}`} className="block">
                    <div className="flex items-start mb-2">
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                        <Image
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(listing.title)}&background=random&size=128`}
                          alt={listing.title}
                          width={48}
                          height={48}
                          placeholder="blur"
                          blurDataURL={getBlurDataURL(48, 48)}
                          sizes="48px"
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                        <div className="text-sm text-gray-600">{[listing.city, listing.state].filter(Boolean).join(', ') || 'Location'}</div>
                      </div>
                    </div>
                    {(listing.hourlyRateMin || listing.hourlyRateMax) && (
                      <div className="text-sm text-gray-800 mb-2">
                        {listing.hourlyRateMin && listing.hourlyRateMax ? `$${listing.hourlyRateMin} - $${listing.hourlyRateMax}/hr` : listing.hourlyRateMin ? `From $${listing.hourlyRateMin}/hr` : `Up to $${listing.hourlyRateMax}/hr`}
                      </div>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-2">{listing.description}</p>
                  </Link>
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
<<<<<<< HEAD
    </DashboardLayout>
=======
>>>>>>> origin/main
  );
}
