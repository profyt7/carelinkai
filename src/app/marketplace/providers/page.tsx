"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FiMapPin, FiStar, FiSearch, FiFilter, FiCheckCircle, FiLoader, FiHeart, FiX } from "react-icons/fi";
import MarketplaceTabs from "@/components/marketplace/MarketplaceTabs";
import ProviderCard from "@/components/marketplace/ProviderCard";

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
  photoUrl?: string | null;
  ratingAverage?: number | null;
  reviewCount?: number | null;
  hourlyRate?: number | null;
  distanceMiles?: number;
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

const LS_KEY = "marketplace:providers:filters";

export default function ProvidersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Favorite state
  const PR_FAV_KEY = 'marketplace:provider-favorites:v1';
  const [providerFavorites, setProviderFavorites] = useState<Set<string>>(new Set());

  // Filter states
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [minYearsInBusiness, setMinYearsInBusiness] = useState("");
  const [radius, setRadius] = useState("");
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"ratingDesc" | "rateAsc" | "rateDesc" | "distanceAsc" | "recency">("ratingDesc");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Mobile filter visibility
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Debounced values
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [debouncedState, setDebouncedState] = useState("");
  const [debouncedMinRate, setDebouncedMinRate] = useState("");
  const [debouncedMaxRate, setDebouncedMaxRate] = useState("");
  const [debouncedMinYears, setDebouncedMinYears] = useState("");

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const t = setTimeout(() => setDebouncedCity(city), 350); return () => clearTimeout(t); }, [city]);
  useEffect(() => { const t = setTimeout(() => setDebouncedState(state), 350); return () => clearTimeout(t); }, [state]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMinRate(minRate), 350); return () => clearTimeout(t); }, [minRate]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMaxRate(maxRate), 350); return () => clearTimeout(t); }, [maxRate]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMinYears(minYearsInBusiness), 350); return () => clearTimeout(t); }, [minYearsInBusiness]);

  // Initialize filters from URL on mount
  useEffect(() => {
    if (didInitFromUrl.current) return;
    const sp = searchParams;
    if (!sp) return;

    const valOrEmpty = (k: string) => sp.get(k) ?? "";
    const csv = (k: string) => (sp.get(k)?.split(",").filter(Boolean) ?? []);
    const entriesCount = Array.from(sp.entries()).length;

    setSearch(valOrEmpty("q"));
    setCity(valOrEmpty("city"));
    setState(valOrEmpty("state"));
    setSelectedServiceTypes(csv("serviceTypes"));
    setVerifiedOnly(sp.get("verified") === "true");
    setMinRate(valOrEmpty("minRate"));
    setMaxRate(valOrEmpty("maxRate"));
    setMinYearsInBusiness(valOrEmpty("minYears"));
    setFavoritesOnly(sp.get("favorites") === "1");
    
    const pageFromUrl = parseInt(sp.get("page") || "1", 10);
    if (!Number.isNaN(pageFromUrl) && pageFromUrl > 0) setPage(pageFromUrl);
    
    const sortFromUrl = sp.get("sortBy") as any;
    if (sortFromUrl && ["ratingDesc", "rateAsc", "rateDesc", "distanceAsc", "recency"].includes(sortFromUrl)) {
      setSortBy(sortFromUrl);
    }

    const radiusFromUrl = sp.get("radiusMiles");
    const latFromUrl = sp.get("lat");
    const lngFromUrl = sp.get("lng");
    setRadius(radiusFromUrl ?? "");
    setGeoLat(latFromUrl ? Number(latFromUrl) : null);
    setGeoLng(lngFromUrl ? Number(lngFromUrl) : null);

    // If URL is empty, try to restore from localStorage
    if (entriesCount === 0) {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
          const savedParams = new URLSearchParams(saved);
          const v = (k: string) => savedParams.get(k) ?? "";
          const arr = (k: string) => (savedParams.get(k)?.split(",").filter(Boolean) ?? []);
          setSearch(v("q"));
          setCity(v("city"));
          setState(v("state"));
          setSelectedServiceTypes(arr("serviceTypes"));
          setVerifiedOnly(savedParams.get("verified") === "true");
          setMinRate(v("minRate"));
          setMaxRate(v("maxRate"));
          setMinYearsInBusiness(v("minYears"));
          setFavoritesOnly(savedParams.get("favorites") === "1");
          const spPage = parseInt(savedParams.get("page") || "1", 10);
          if (!Number.isNaN(spPage) && spPage > 0) setPage(spPage);
          const spSort = savedParams.get("sortBy") as any;
          if (spSort && ["ratingDesc", "rateAsc", "rateDesc", "distanceAsc", "recency"].includes(spSort)) setSortBy(spSort);
          const spRadius = savedParams.get("radiusMiles");
          const spLat = savedParams.get("lat");
          const spLng = savedParams.get("lng");
          setRadius(spRadius ?? "");
          setGeoLat(spLat ? Number(spLat) : null);
          setGeoLng(spLng ? Number(spLng) : null);
        }
      } catch {}
    }

    didInitFromUrl.current = true;
  }, [searchParams]);

  // Keep URL in sync with filters
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    const params = new URLSearchParams();
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", debouncedSearch);
    setOrDel("city", debouncedCity);
    setOrDel("state", debouncedState);
    setOrDel("serviceTypes", selectedServiceTypes.join(","));
    if (verifiedOnly) params.set("verified", "true");
    setOrDel("minRate", debouncedMinRate);
    setOrDel("maxRate", debouncedMaxRate);
    setOrDel("minYears", debouncedMinYears);
    if (favoritesOnly) params.set("favorites", "1");
    params.set("page", String(page));
    params.set("sortBy", sortBy);
    if (radius && geoLat !== null && geoLng !== null) {
      params.set("radiusMiles", radius);
      params.set("lat", String(geoLat));
      params.set("lng", String(geoLng));
    }
    try { localStorage.setItem(LS_KEY, params.toString()); } catch {}
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, debouncedCity, debouncedState, selectedServiceTypes, verifiedOnly, debouncedMinRate, debouncedMaxRate, debouncedMinYears, favoritesOnly, page, sortBy, radius, geoLat, geoLng, router, pathname]);

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
  }, [session?.user?.role]);

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
  }, [session?.user?.role, providerFavorites]);

  // Toggle service type
  const toggleServiceType = useCallback((serviceType: string) => {
    setSelectedServiceTypes((prev) => {
      if (prev.includes(serviceType)) {
        return prev.filter((s) => s !== serviceType);
      }
      return [...prev, serviceType];
    });
    setPage(1);
  }, []);

  // Fetch providers
  useEffect(() => {
    const controller = new AbortController();
    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("pageSize", pageSize.toString());
        params.set("sortBy", sortBy);

        if (debouncedSearch) params.set("q", debouncedSearch);
        if (debouncedCity) params.set("city", debouncedCity);
        if (debouncedState) params.set("state", debouncedState);
        if (selectedServiceTypes.length > 0) params.set("serviceTypes", selectedServiceTypes.join(","));
        if (verifiedOnly) params.set("verified", "true");
        if (debouncedMinRate) params.set("minRate", debouncedMinRate);
        if (debouncedMaxRate) params.set("maxRate", debouncedMaxRate);
        if (debouncedMinYears) params.set("minYears", debouncedMinYears);
        if (radius && geoLat !== null && geoLng !== null) {
          params.set("radiusMiles", radius);
          params.set("lat", String(geoLat));
          params.set("lng", String(geoLng));
        }

        const res = await fetch(`/api/marketplace/providers?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch providers");

        const data = await res.json();
        let results = data.data || [];

        // Client-side favorites filter
        if (favoritesOnly && providerFavorites.size > 0) {
          results = results.filter((p: Provider) => providerFavorites.has(p.id));
        }

        setProviders(results);
        setTotalCount(data.pagination?.total || results.length);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error("Error fetching providers:", e);
        setError(e.message || "Failed to load providers");
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
    return () => controller.abort();
  }, [page, debouncedSearch, debouncedCity, debouncedState, selectedServiceTypes, verifiedOnly, debouncedMinRate, debouncedMaxRate, debouncedMinYears, sortBy, radius, geoLat, geoLng, favoritesOnly, providerFavorites]);

  // Reset page when filters change
  const queryKey = useMemo(() => JSON.stringify({
    q: debouncedSearch, city: debouncedCity, state: debouncedState,
    serviceTypes: selectedServiceTypes, verified: verifiedOnly,
    minRate: debouncedMinRate, maxRate: debouncedMaxRate, minYears: debouncedMinYears,
    radius, lat: geoLat, lng: geoLng, sort: sortBy, favoritesOnly
  }), [debouncedSearch, debouncedCity, debouncedState, selectedServiceTypes, verifiedOnly, debouncedMinRate, debouncedMaxRate, debouncedMinYears, radius, geoLat, geoLng, sortBy, favoritesOnly]);
  
  const prevKeyRef = useRef<string>(queryKey);
  useEffect(() => {
    if (prevKeyRef.current !== queryKey) {
      prevKeyRef.current = queryKey;
      setPage(1);
    }
  }, [queryKey]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setCity("");
    setState("");
    setSelectedServiceTypes([]);
    setVerifiedOnly(false);
    setMinRate("");
    setMaxRate("");
    setMinYearsInBusiness("");
    setRadius("");
    setGeoLat(null);
    setGeoLng(null);
    setSortBy("ratingDesc");
    setFavoritesOnly(false);
    setPage(1);
  }, []);

  // Active filter chips
  const chips = useMemo(() => {
    const list: { key: string; label: string; remove: () => void }[] = [];
    if (search) list.push({ key: `q:${search}`, label: `Search: ${search}`, remove: () => setSearch("") });
    if (city) list.push({ key: `city:${city}`, label: `City: ${city}`, remove: () => setCity("") });
    if (state) list.push({ key: `state:${state}`, label: `State: ${state}`, remove: () => setState("") });
    if (minRate) list.push({ key: `minRate:${minRate}`, label: `Min $${minRate}/hr`, remove: () => setMinRate("") });
    if (maxRate) list.push({ key: `maxRate:${maxRate}`, label: `Max $${maxRate}/hr`, remove: () => setMaxRate("") });
    if (minYearsInBusiness) list.push({ key: `minYears:${minYearsInBusiness}`, label: `Min ${minYearsInBusiness} yrs exp`, remove: () => setMinYearsInBusiness("") });
    if (verifiedOnly) list.push({ key: `verified`, label: `Verified only`, remove: () => setVerifiedOnly(false) });
    if (favoritesOnly) list.push({ key: `favorites`, label: `Favorites only`, remove: () => setFavoritesOnly(false) });
    selectedServiceTypes.forEach((s) => {
      const label = serviceTypeOptions.find((o) => o.value === s)?.label || s;
      list.push({ key: `svc:${s}`, label, remove: () => toggleServiceType(s) });
    });
    return list;
  }, [search, city, state, minRate, maxRate, minYearsInBusiness, verifiedOnly, favoritesOnly, selectedServiceTypes, toggleServiceType]);

  // Filter sidebar component (reused for desktop and mobile)
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`rounded-md border border-gray-200 bg-white p-4 space-y-3 ${isMobile ? '' : ''}`}>
      {isMobile && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Filters</h3>
          <button onClick={() => setShowMobileFilters(false)} className="p-2 hover:bg-gray-100 rounded-md">
            <FiX className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* City */}
      <div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* State */}
      <div>
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          placeholder="State"
          maxLength={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Sort by */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="ratingDesc">Rating: High to Low</option>
          <option value="recency">Most Recent</option>
          <option value="rateAsc">Price: Low to High</option>
          <option value="rateDesc">Price: High to Low</option>
          <option value="distanceAsc" disabled={!radius || geoLat === null || geoLng === null}>
            Distance: Nearest
          </option>
        </select>
      </div>

      {/* Verified only */}
      <div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <span>Verified only</span>
        </label>
      </div>

      {/* Favorites only */}
      <div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <span>Favorites only</span>
        </label>
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            step={1}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="e.g. 10"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            type="button"
            className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              if (navigator?.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); },
                  () => {},
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }
            }}
            title={geoLat && geoLng ? `Using: ${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}` : 'Use my location'}
          >
            {geoLat && geoLng ? 'Location set' : 'Use my location'}
          </button>
        </div>
      </div>

      {/* Minimum Hourly Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Hourly Rate ($)</label>
        <input
          type="number"
          value={minRate}
          onChange={(e) => setMinRate(e.target.value)}
          placeholder="Min Rate"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Maximum Hourly Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Hourly Rate ($)</label>
        <input
          type="number"
          value={maxRate}
          onChange={(e) => setMaxRate(e.target.value)}
          placeholder="Max Rate"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Minimum Years in Business */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Years in Business</label>
        <input
          type="number"
          value={minYearsInBusiness}
          onChange={(e) => setMinYearsInBusiness(e.target.value)}
          placeholder="Min Years"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Service Types */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-sm mb-2">Service Types</h4>
        {serviceTypeOptions.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm whitespace-nowrap mb-1">
            <input
              type="checkbox"
              checked={selectedServiceTypes.includes(option.value)}
              onChange={() => toggleServiceType(option.value)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {/* Clear Filters */}
      <button
        onClick={clearAllFilters}
        className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 mt-4"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-4">
      {/* Marketplace Tabs */}
      <MarketplaceTabs
        activeTab="providers"
        providersCount={totalCount}
      />

      {/* Two-column layout */}
      <div className="flex md:space-x-6">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block md:w-72 md:shrink-0">
          <FilterSidebar />
        </div>

        {/* Mobile Filter Button */}
        <div className="md:hidden mb-4 w-full">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiFilter className="mr-2 h-4 w-4" />
            Filters {chips.length > 0 && `(${chips.length})`}
          </button>
        </div>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
            <div className="fixed inset-y-0 left-0 w-80 max-w-full bg-white overflow-y-auto">
              <div className="p-4">
                <FilterSidebar isMobile />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1">
          {/* Active Filter Chips */}
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.remove}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm bg-white hover:bg-gray-50"
                >
                  <span>{c.label}</span>
                  <span className="text-gray-500">×</span>
                </button>
              ))}
              <button
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `${totalCount} provider${totalCount !== 1 ? 's' : ''} found`}
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
                onClick={clearAllFilters}
                className="mt-4 text-primary-600 hover:text-primary-500 font-medium"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Provider Grid */}
          {!loading && !error && providers.length > 0 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    serviceTypeOptions={serviceTypeOptions}
                    isFavorite={providerFavorites.has(provider.id)}
                    onToggleFavorite={() => toggleProviderFavorite(provider.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
