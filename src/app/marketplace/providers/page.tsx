"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FiMapPin, FiStar, FiSearch, FiFilter, FiCheckCircle, FiLoader, FiHeart } from "react-icons/fi";

type Provider = {
  id: string;
  userId: string;
  businessName: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  serviceTypes: string[];
  isVerified: boolean;
  yearsInBusiness: number | null;
  credentialCount: number;
  verifiedCredentialCount: number;
};

const serviceTypeOptions = [
  { value: "transportation", label: "Transportation" },
  { value: "meal-prep", label: "Meal Preparation" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "personal-care", label: "Personal Care" },
  { value: "companionship", label: "Companionship" },
  { value: "medical-services", label: "Medical Services" },
  { value: "home-modification", label: "Home Modification" },
  { value: "respite-care", label: "Respite Care" },
];

export default function ProvidersPage() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Favorite state
  const PR_FAV_KEY = 'marketplace:provider-favorites:v1';
  const [providerFavorites, setProviderFavorites] = useState<Set<string>>(new Set());

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  // Load provider favorites on mount
  useEffect(() => {
    const load = async () => {
      if (session?.user?.role === 'FAMILY') {
        try {
          const res = await fetch('/api/marketplace/provider-favorites', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            const ids = new Set<string>(j?.data || []);
            setProviderFavorites(ids);
            try { localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(ids))); } catch {}
            return;
          }
        } catch {}
      }
      try { const raw = localStorage.getItem(PR_FAV_KEY); if (raw) setProviderFavorites(new Set(JSON.parse(raw))); } catch {}
    };
    load();
  }, [session?.user?.role, PR_FAV_KEY]);

  // Toggle provider favorite
  const toggleProviderFavorite = useCallback(async (providerId: string) => {
    setProviderFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId); else next.add(providerId);
      try { localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    if (session?.user?.role === 'FAMILY') {
      try {
        if (providerFavorites.has(providerId)) {
          const res = await fetch(`/api/marketplace/provider-favorites?providerId=${encodeURIComponent(providerId)}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('unfav failed');
        } else {
          const res = await fetch('/api/marketplace/provider-favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId }) });
          if (!res.ok) throw new Error('fav failed');
        }
      } catch {
        // rollback
        setProviderFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(providerId)) next.delete(providerId); else next.add(providerId);
          try { localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
          return next;
        });
      }
    }
  }, [session?.user?.role, providerFavorites, PR_FAV_KEY]);

  useEffect(() => {
    fetchProviders();
  }, [page, searchQuery, selectedServiceType, selectedCity, selectedState, verifiedOnly]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) params.append("q", searchQuery);
      if (selectedServiceType) params.append("serviceType", selectedServiceType);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedState) params.append("state", selectedState);
      if (verifiedOnly) params.append("verified", "true");

      const res = await fetch(`/api/marketplace/providers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch providers");

      const data = await res.json();
      setProviders(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e: any) {
      console.error("Error fetching providers:", e);
      setError(e.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedServiceType("");
    setSelectedCity("");
    setSelectedState("");
    setVerifiedOnly(false);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Service Providers</h1>
        <p className="mt-2 text-neutral-600">
          Find trusted service providers for transportation, home care, and more.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search by business name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md leading-5 bg-white placeholder-neutral-500 focus:outline-none focus:placeholder-neutral-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <FiFilter className="mr-2 h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-neutral-50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Service Type Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Type
                </label>
                <select
                  value={selectedServiceType}
                  onChange={(e) => {
                    setSelectedServiceType(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">All Services</option>
                  {serviceTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g., WA"
                  maxLength={2}
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value.toUpperCase());
                    setPage(1);
                  }}
                  className="block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* Verified Only Toggle */}
              <div className="flex items-center">
                <input
                  id="verified-only"
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="verified-only" className="ml-2 block text-sm text-neutral-900">
                  Verified only
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResetFilters}
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-lg text-neutral-600">Loading providers...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && providers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-neutral-600">No providers found matching your criteria.</p>
          <button
            onClick={handleResetFilters}
            className="mt-4 text-primary-600 hover:text-primary-500 font-medium"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Provider Grid */}
      {!loading && !error && providers.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => {
              const location = [provider.city, provider.state].filter(Boolean).join(", ");
              
              return (
                <div
                  key={provider.id}
                  className="bg-white rounded-lg shadow border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-neutral-900 flex-1">
                        {provider.businessName}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {provider.isVerified && (
                          <FiCheckCircle className="h-5 w-5 text-green-500" title="Verified Provider" />
                        )}
                        {/* Favorite Heart Icon */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleProviderFavorite(provider.id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title={providerFavorites.has(provider.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <FiHeart
                            className={`h-5 w-5 ${
                              providerFavorites.has(provider.id)
                                ? "fill-red-500 text-red-500"
                                : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {location && (
                      <div className="flex items-center text-sm text-neutral-600 mb-3">
                        <FiMapPin className="h-4 w-4 mr-1" />
                        {location}
                      </div>
                    )}

                    {provider.bio && (
                      <p className="text-sm text-neutral-700 line-clamp-3 mb-4">
                        {provider.bio}
                      </p>
                    )}

                    {/* Service Types */}
                    {provider.serviceTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {provider.serviceTypes.slice(0, 3).map((service) => {
                          const serviceLabel = serviceTypeOptions.find(opt => opt.value === service)?.label || service;
                          return (
                            <span
                              key={service}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                            >
                              {serviceLabel}
                            </span>
                          );
                        })}
                        {provider.serviceTypes.length > 3 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                            +{provider.serviceTypes.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Credentials Info */}
                    {provider.verifiedCredentialCount > 0 && (
                      <div className="text-xs text-neutral-600 mb-4">
                        {provider.verifiedCredentialCount} verified credential{provider.verifiedCredentialCount !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* CTA */}
                    <Link
                      href={`/marketplace/providers/${provider.id}`}
                      className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
