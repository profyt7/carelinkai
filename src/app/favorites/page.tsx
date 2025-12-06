"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { getBlurDataURL } from "@/lib/imageBlur";
import { FiHeart, FiHome, FiUsers, FiBriefcase, FiMapPin, FiDollarSign, FiStar, FiX, FiRefreshCw } from "react-icons/fi";

type FavoriteHome = {
  id: string;
  itemId: string;
  type: 'home';
  createdAt: string;
  notes?: string | null;
  home: {
    id: string;
    name: string;
    description: string;
    address: { city: string; state: string; zipCode: string } | null;
    careLevel: string[];
    priceRange: { min: number | null; max: number | null };
    capacity: number;
    availability: number;
    amenities: string[];
    imageUrl: string | null;
  };
};

type FavoriteCaregiver = {
  id: string;
  itemId: string;
  type: 'caregiver';
  createdAt: string;
  caregiver: {
    id: string;
    name: string;
    bio: string | null;
    hourlyRate: number | null;
    yearsExperience: number | null;
    specialties: string[];
    settings: string[];
    careTypes: string[];
    photoUrl: any;
    backgroundCheckStatus: string;
    ratingAverage: number | null;
    reviewCount: number;
  };
};

type FavoriteProvider = {
  id: string;
  itemId: string;
  type: 'provider';
  createdAt: string;
  provider: {
    id: string;
    businessName: string;
    contactName: string;
    bio: string | null;
    serviceTypes: string[];
    website: string | null;
    yearsInBusiness: number | null;
    isVerified: boolean;
    photoUrl: any;
  };
};

type FavoriteListing = {
  id: string;
  itemId: string;
  type: 'listing';
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
    setting: string | null;
    careTypes: string[];
    services: string[];
    specialties: string[];
    startTime: string | null;
    endTime: string | null;
    postedBy: {
      name: string;
      email: string;
    };
  };
};

type FavoritesData = {
  homes: FavoriteHome[];
  caregivers: FavoriteCaregiver[];
  providers: FavoriteProvider[];
  listings: FavoriteListing[];
  counts: {
    homes: number;
    caregivers: number;
    providers: number;
    listings: number;
    total: number;
  };
};

type TabType = 'all' | 'homes' | 'caregivers' | 'providers' | 'listings';

export default function UnifiedFavoritesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<FavoritesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/favorites/all', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch favorites');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (type: string, itemId: string, favoriteId: string) => {
    setRemoving(favoriteId);
    try {
      let endpoint = '';
      let param = '';
      
      switch (type) {
        case 'home':
          endpoint = '/api/favorites';
          param = `homeId=${encodeURIComponent(itemId)}`;
          break;
        case 'caregiver':
          endpoint = '/api/marketplace/caregiver-favorites';
          param = `caregiverId=${encodeURIComponent(itemId)}`;
          break;
        case 'provider':
          endpoint = '/api/marketplace/provider-favorites';
          param = `providerId=${encodeURIComponent(itemId)}`;
          break;
        case 'listing':
          endpoint = '/api/marketplace/favorites';
          param = `listingId=${encodeURIComponent(itemId)}`;
          break;
      }

      const res = await fetch(`${endpoint}?${param}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');

      // Optimistically update UI
      if (data) {
        setData({
          ...data,
          homes: type === 'home' ? data.homes.filter(f => f.id !== favoriteId) : data.homes,
          caregivers: type === 'caregiver' ? data.caregivers.filter(f => f.id !== favoriteId) : data.caregivers,
          providers: type === 'provider' ? data.providers.filter(f => f.id !== favoriteId) : data.providers,
          listings: type === 'listing' ? data.listings.filter(f => f.id !== favoriteId) : data.listings,
          counts: {
            homes: type === 'home' ? data.counts.homes - 1 : data.counts.homes,
            caregivers: type === 'caregiver' ? data.counts.caregivers - 1 : data.counts.caregivers,
            providers: type === 'provider' ? data.counts.providers - 1 : data.counts.providers,
            listings: type === 'listing' ? data.counts.listings - 1 : data.counts.listings,
            total: data.counts.total - 1
          }
        });
      }
    } catch {
      // Reload on failure
      loadFavorites();
    } finally {
      setRemoving(null);
    }
  };

  const allFavorites = useMemo(() => {
    if (!data) return [];
    return [
      ...data.homes,
      ...data.caregivers,
      ...data.providers,
      ...data.listings
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  const filteredFavorites = useMemo(() => {
    if (activeTab === 'all') return allFavorites;
    if (activeTab === 'homes') return data?.homes || [];
    if (activeTab === 'caregivers') return data?.caregivers || [];
    if (activeTab === 'providers') return data?.providers || [];
    if (activeTab === 'listings') return data?.listings || [];
    return [];
  }, [activeTab, allFavorites, data]);

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', count: data?.counts.total || 0, icon: <FiHeart size={16} /> },
    { key: 'homes', label: 'Homes', count: data?.counts.homes || 0, icon: <FiHome size={16} /> },
    { key: 'caregivers', label: 'Caregivers', count: data?.counts.caregivers || 0, icon: <FiUsers size={16} /> },
    { key: 'providers', label: 'Providers', count: data?.counts.providers || 0, icon: <FiBriefcase size={16} /> },
    { key: 'listings', label: 'Jobs', count: data?.counts.listings || 0, icon: <FiBriefcase size={16} /> },
  ];

  if (!session?.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg border bg-white p-8 text-center">
          <FiHeart size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view your favorites</h2>
          <p className="text-gray-600 mb-4">Save homes, caregivers, providers, and jobs to access them later.</p>
          <Link href="/auth/login" className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiHeart className="text-rose-600" size={28} />
              My Favorites
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {data ? `${data.counts.total} saved items` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={loadFavorites}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors
                  ${activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.icon}
                {tab.label}
                <span className={`
                  inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                  ${activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading favorites...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadFavorites}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            <FiRefreshCw size={16} />
            Try Again
          </button>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="py-16 text-center">
          <FiHeart size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'all' ? 'No favorites yet' : `No ${activeTab} favorited`}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Start exploring and save items by tapping the heart icon.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
              <FiHome size={16} />
              Browse Homes
            </Link>
            <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
              <FiUsers size={16} />
              Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((fav: any) => (
            <FavoriteCard
              key={fav.id}
              favorite={fav}
              onRemove={() => removeFavorite(fav.type, fav.itemId, fav.id)}
              isRemoving={removing === fav.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({ 
  favorite, 
  onRemove, 
  isRemoving 
}: { 
  favorite: FavoriteHome | FavoriteCaregiver | FavoriteProvider | FavoriteListing; 
  onRemove: () => void;
  isRemoving: boolean;
}) {
  // Home card
  if (favorite.type === 'home') {
    const home = favorite.home;
    return (
      <div className="relative group bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="absolute right-2 top-2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white disabled:opacity-50"
          title="Remove from favorites"
        >
          {isRemoving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
          ) : (
            <FiHeart className="text-rose-600" fill="currentColor" size={18} />
          )}
        </button>
        <Link href={`/homes/${home.id}`} className="block">
          <div className="aspect-video relative bg-gray-100">
            {home.imageUrl ? (
              <Image
                src={home.imageUrl}
                alt={home.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <FiHome size={48} />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-1">{home.name}</h3>
            {home.address && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <FiMapPin size={14} className="mr-1" />
                {home.address.city}, {home.address.state}
              </div>
            )}
            {(home.priceRange.min || home.priceRange.max) && (
              <div className="flex items-center text-sm text-gray-800 mb-2">
                <FiDollarSign size={14} className="mr-1" />
                {home.priceRange.min && home.priceRange.max
                  ? `$${home.priceRange.min.toLocaleString()} - $${home.priceRange.max.toLocaleString()}/mo`
                  : home.priceRange.min
                  ? `From $${home.priceRange.min.toLocaleString()}/mo`
                  : `Up to $${home.priceRange.max?.toLocaleString()}/mo`}
              </div>
            )}
            <p className="text-sm text-gray-600 line-clamp-2">{home.description}</p>
          </div>
        </Link>
      </div>
    );
  }

  // Caregiver card
  if (favorite.type === 'caregiver') {
    const cg = favorite.caregiver;
    return (
      <div className="relative group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="absolute right-2 top-2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white disabled:opacity-50"
        >
          {isRemoving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
          ) : (
            <FiHeart className="text-rose-600" fill="currentColor" size={18} />
          )}
        </button>
        <Link href={`/marketplace/caregivers/${cg.id}`} className="block">
          <div className="flex items-start mb-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
              {cg.photoUrl ? (
                <Image
                  src={cg.photoUrl.thumbnail || cg.photoUrl.medium || cg.photoUrl.large}
                  alt={cg.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <FiUsers size={24} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{cg.name}</h3>
              {cg.yearsExperience && (
                <p className="text-sm text-gray-600">{cg.yearsExperience} years experience</p>
              )}
              {cg.ratingAverage && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <FiStar size={14} className="text-yellow-400 fill-current mr-1" />
                  {cg.ratingAverage.toFixed(1)} ({cg.reviewCount})
                </div>
              )}
            </div>
          </div>
          {cg.hourlyRate && (
            <div className="flex items-center text-sm text-gray-800 mb-2">
              <FiDollarSign size={14} className="mr-1" />
              ${cg.hourlyRate}/hr
            </div>
          )}
          {cg.bio && (
            <p className="text-sm text-gray-600 line-clamp-2">{cg.bio}</p>
          )}
        </Link>
      </div>
    );
  }

  // Provider card
  if (favorite.type === 'provider') {
    const provider = favorite.provider;
    return (
      <div className="relative group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="absolute right-2 top-2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white disabled:opacity-50"
        >
          {isRemoving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
          ) : (
            <FiHeart className="text-rose-600" fill="currentColor" size={18} />
          )}
        </button>
        <Link href={`/marketplace/providers/${provider.id}`} className="block">
          <div className="flex items-start mb-3">
            <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
              {provider.photoUrl ? (
                <Image
                  src={provider.photoUrl.thumbnail || provider.photoUrl.medium || provider.photoUrl.large}
                  alt={provider.businessName}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <FiBriefcase size={24} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{provider.businessName}</h3>
                {provider.isVerified && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{provider.contactName}</p>
              {provider.yearsInBusiness && (
                <p className="text-sm text-gray-600">{provider.yearsInBusiness} years in business</p>
              )}
            </div>
          </div>
          {provider.bio && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{provider.bio}</p>
          )}
          {provider.serviceTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {provider.serviceTypes.slice(0, 3).map((service) => (
                <span key={service} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {service}
                </span>
              ))}
              {provider.serviceTypes.length > 3 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  +{provider.serviceTypes.length - 3}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>
    );
  }

  // Listing/Job card
  if (favorite.type === 'listing') {
    const listing = favorite.listing;
    return (
      <div className="relative group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="absolute right-2 top-2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white disabled:opacity-50"
        >
          {isRemoving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
          ) : (
            <FiHeart className="text-rose-600" fill="currentColor" size={18} />
          )}
        </button>
        {listing.status && (
          <span className={`absolute left-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            listing.status === 'OPEN' ? 'bg-green-100 text-green-800' : 
            listing.status === 'HIRED' ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-700'
          }`}>
            {listing.status}
          </span>
        )}
        <Link href={`/marketplace/listings/${listing.id}`} className="block pt-6">
          <h3 className="font-semibold text-gray-900 mb-1">{listing.title}</h3>
          {(listing.city || listing.state) && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <FiMapPin size={14} className="mr-1" />
              {[listing.city, listing.state].filter(Boolean).join(', ')}
            </div>
          )}
          {(listing.hourlyRateMin || listing.hourlyRateMax) && (
            <div className="flex items-center text-sm text-gray-800 mb-2">
              <FiDollarSign size={14} className="mr-1" />
              {listing.hourlyRateMin && listing.hourlyRateMax
                ? `$${listing.hourlyRateMin} - $${listing.hourlyRateMax}/hr`
                : listing.hourlyRateMin
                ? `From $${listing.hourlyRateMin}/hr`
                : `Up to $${listing.hourlyRateMax}/hr`}
            </div>
          )}
          <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>
        </Link>
      </div>
    );
  }

  return null;
}
