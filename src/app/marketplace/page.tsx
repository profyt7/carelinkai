"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef, forwardRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CaregiverCard from "@/components/marketplace/CaregiverCard";
import Image from "next/image";
import { getBlurDataURL } from "@/lib/imageBlur";
import RecommendedListings from "@/components/marketplace/RecommendedListings";
import { fetchJsonCached } from "@/lib/fetchCache";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VirtuosoGrid } from "react-virtuoso";
import { MOCK_CATEGORIES as SHARED_MOCK_CATEGORIES, MOCK_CAREGIVERS as SHARED_MOCK_CAREGIVERS, MOCK_LISTINGS as SHARED_MOCK_LISTINGS, MOCK_PROVIDERS as SHARED_MOCK_PROVIDERS } from "@/lib/mock/marketplace";
import MarketplaceTabs from "@/components/marketplace/MarketplaceTabs";

const LAST_TAB_KEY = "marketplace:lastTab";
const LS_KEYS = {
  caregivers: "marketplace:caregivers",
  jobs: "marketplace:jobs",
  providers: "marketplace:providers",
} as const;
const SCROLL_KEYS = {
  caregivers: 'marketplace:scroll:caregivers',
  jobs: 'marketplace:scroll:jobs',
  providers: 'marketplace:scroll:providers',
} as const;

// Persist mobile <details> open/closed state across visits (hoisted to module scope)
const MOBILE_DETAILS_KEYS = {
  cgSetting: 'marketplace:mobile:cg:setting:open',
  cgCareTypes: 'marketplace:mobile:cg:careTypes:open',
  cgSpecialties: 'marketplace:mobile:cg:specialties:open',
  jobSetting: 'marketplace:mobile:job:setting:open',
} as const;

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
  distanceMiles?: number;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  state: string | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  createdAt: string;
  status?: string;
  applicationCount?: number;
  hireCount?: number;
  distanceMiles?: number;
  appliedByMe?: boolean;
};

export default function MarketplacePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);

  // Runtime mock toggle fetched from API (works in Docker/runtime envs)
  // Marketplace uses showMarketplace flag which defaults to true (since we don't have real caregivers yet)
  // Start with true to prevent flicker while loading the API response
  const [showMock, setShowMock] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/runtime/mocks', { cache: 'no-store', credentials: 'include' as RequestCredentials });
        if (!res.ok) return;
        const j = await res.json();
        // Use showMarketplace for marketplace page (separate from homes mock mode)
        if (!cancelled) setShowMock(!!j?.showMarketplace);
      } catch {
        // On error, default to showing mock data to prevent empty marketplace
        if (!cancelled) setShowMock(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Include "providers" as a valid tab option
  const [activeTab, setActiveTab] = useState<"jobs" | "caregivers" | "providers">(
    "caregivers"
  );
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  /* ------------------------------------------------------------------
     Marketplace categories (SERVICE / CARE_TYPE / SPECIALTY / SETTING)
  ------------------------------------------------------------------*/
  const [categories, setCategories] = useState<
    Record<string, { slug: string; name: string }[]>
  >({});

  /* ---------------- Caregiver-specific numeric filters -------------- */
  const [minRate, setMinRate] = useState(""); // $/hr  (string keeps empty/unset)
  const [maxRate, setMaxRate] = useState("");
  const [minExperience, setMinExperience] = useState("");
  
  /* ---------------- Caregiver availability filters ------------------ */
  const [availableDate, setAvailableDate] = useState("");
  const [availableStartTime, setAvailableStartTime] = useState("");
  const [availableEndTime, setAvailableEndTime] = useState("");

  /* ---------------- Job-specific filters (place-holders) ------------ */
  const [zip, setZip] = useState("");
  const [settings, setSettings] = useState<string[]>([]);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [postedByMe, setPostedByMe] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);
  const [jobRadius, setJobRadius] = useState<string>(""); // miles
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);

  /* ---------------- Provider-specific filters ----------------------- */
  const [providerServices, setProviderServices] = useState<string[]>([]);

  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [caregiversLoading, setCaregiversLoading] = useState(false);
  const [cgPage, setCgPage] = useState(1);
  const [cgTotal, setCgTotal] = useState(0);
  const [cgSort, setCgSort] = useState<"recency" | "rateAsc" | "rateDesc" | "experienceDesc" | "distanceAsc">("recency");
  const [cgRadius, setCgRadius] = useState<string>("");
  const [cgGeoLat, setCgGeoLat] = useState<number | null>(null);
  const [cgGeoLng, setCgGeoLng] = useState<number | null>(null);
  const [cgShortlistOnly, setCgShortlistOnly] = useState(false);
  // Server-driven pagination (cursor)
  const [cgCursor, setCgCursor] = useState<string | null>(null);
  const [cgHasMoreSvr, setCgHasMoreSvr] = useState<boolean | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [jobPage, setJobPage] = useState(1);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobSort, setJobSort] = useState<"recency" | "rateAsc" | "rateDesc" | "distanceAsc">("recency");
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // Server-driven pagination (cursor)
  const [jobCursor, setJobCursor] = useState<string | null>(null);
  const [jobHasMoreSvr, setJobHasMoreSvr] = useState<boolean | null>(null);

  // Providers state --------------------------------------------------------
  type Provider = {
    id: string;
    name: string;
    city: string;
    state: string;
    services: string[];
    hourlyRate: number | null;
    perMileRate: number | null;
    ratingAverage: number;
    reviewCount: number;
    badges: string[];
    distanceMiles?: number;
  };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerPage, setProviderPage] = useState(1);
  const [providerTotal, setProviderTotal] = useState(0);
  const [providerSort, setProviderSort] = useState<"ratingDesc" | "rateAsc" | "rateDesc" | "distanceAsc">("ratingDesc");
  const [prRadius, setPrRadius] = useState<string>("");
  // Server-driven pagination (cursor)
  const [providerCursor, setProviderCursor] = useState<string | null>(null);
  const [providerHasMoreSvr, setProviderHasMoreSvr] = useState<boolean | null>(null);
  const [prGeoLat, setPrGeoLat] = useState<number | null>(null);
  const [prGeoLng, setPrGeoLng] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  

  // Mock data (only used when showMock is true)
  const MOCK_CATEGORIES = useMemo<Record<string, { slug: string; name: string }[]>>(() => SHARED_MOCK_CATEGORIES, []);

  const MOCK_CAREGIVERS = useMemo<Caregiver[]>(() => SHARED_MOCK_CAREGIVERS as Caregiver[], []);

  const MOCK_LISTINGS = useMemo<Listing[]>(() => SHARED_MOCK_LISTINGS as Listing[], []);

  const MOCK_PROVIDERS = useMemo<Provider[]>(() => SHARED_MOCK_PROVIDERS as Provider[], []);
  // Caregiver favorites (for families; local fallback for others)
  const CG_FAV_KEY = 'marketplace:caregiver-favorites:v1';
  const [caregiverFavorites, setCaregiverFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = async () => {
      if (session?.user?.role === 'FAMILY') {
        try {
          const res = await fetch('/api/marketplace/caregiver-favorites', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            const ids = new Set<string>(j?.data || []);
            setCaregiverFavorites(ids);
            try { localStorage.setItem(CG_FAV_KEY, JSON.stringify(Array.from(ids))); } catch {}
            return;
          }
        } catch {}
      }
      try { const raw = localStorage.getItem(CG_FAV_KEY); if (raw) setCaregiverFavorites(new Set(JSON.parse(raw))); } catch {}
    };
    load();
  }, [session?.user?.role]);
  const toggleCaregiverFavorite = useCallback(async (caregiverId: string) => {
    setCaregiverFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(caregiverId)) next.delete(caregiverId); else next.add(caregiverId);
      try { localStorage.setItem(CG_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    if (session?.user?.role === 'FAMILY') {
      try {
        if (caregiverFavorites.has(caregiverId)) {
          const res = await fetch(`/api/marketplace/caregiver-favorites?caregiverId=${encodeURIComponent(caregiverId)}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('unfav failed');
        } else {
          const res = await fetch('/api/marketplace/caregiver-favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caregiverId }) });
          if (!res.ok) throw new Error('fav failed');
        }
      } catch {
        // rollback
        setCaregiverFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(caregiverId)) next.delete(caregiverId); else next.add(caregiverId);
          try { localStorage.setItem(CG_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
          return next;
        });
      }
    }
  }, [session?.user?.role, caregiverFavorites]);
  // Provider favorites (local-only for now)
  const PR_FAV_KEY = 'marketplace:provider-favorites:v1';
  const [providerFavorites, setProviderFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { const raw = localStorage.getItem(PR_FAV_KEY); if (raw) setProviderFavorites(new Set(JSON.parse(raw))); } catch {}
  }, []);
  const toggleProviderFavorite = useCallback((providerId: string) => {
    setProviderFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId); else next.add(providerId);
      try { localStorage.setItem(PR_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, []);
  // Job favorites (server for caregivers, local fallback for guests/others)
  const JOB_FAV_KEY = 'marketplace:job-favorites:v1';
  const [jobFavorites, setJobFavorites] = useState<Set<string>>(new Set());
  // Initial load
  useEffect(() => {
    const load = async () => {
      // Caregivers: load from server
      if (session?.user?.role === 'CAREGIVER') {
        try {
          const res = await fetch('/api/marketplace/favorites', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            const ids = new Set<string>((j?.data || []).map((f: any) => f.listingId));
            setJobFavorites(ids);
            // Mirror to local for quick UI restore
            try { localStorage.setItem(JOB_FAV_KEY, JSON.stringify(Array.from(ids))); } catch {}
            return;
          }
        } catch {}
      }
      // Fallback: local
      try {
        const raw = localStorage.getItem(JOB_FAV_KEY);
        if (raw) setJobFavorites(new Set(JSON.parse(raw)));
      } catch {}
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role]);
  const persistJobFavs = useCallback((ids: Set<string>) => {
    setJobFavorites(new Set(ids));
    try { localStorage.setItem(JOB_FAV_KEY, JSON.stringify(Array.from(ids))); } catch {}
  }, []);
  const toggleJobFavorite = useCallback(async (listingId: string) => {
    // Optimistically update UI
    setJobFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId); else next.add(listingId);
      try { localStorage.setItem(JOB_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    // Server sync for caregivers
    if (session?.user?.role === 'CAREGIVER') {
      try {
        if (jobFavorites.has(listingId)) {
          // was favorited before optimistic toggle -> now unfavoriting
          const res = await fetch(`/api/marketplace/favorites?listingId=${encodeURIComponent(listingId)}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('unfav failed');
        } else {
          const res = await fetch('/api/marketplace/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) });
          if (!res.ok) throw new Error('fav failed');
        }
      } catch {
        // rollback on error
        setJobFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(listingId)) next.delete(listingId); else next.add(listingId);
          try { localStorage.setItem(JOB_FAV_KEY, JSON.stringify(Array.from(next))); } catch {}
          return next;
        });
      }
    }
  }, [session?.user?.role, jobFavorites]);
  // Saved searches (local, per-browser)
  type SavedSearch = { id: string; name: string; query: string; createdAt: number };
  const SAVED_KEY = 'marketplace:saved-searches:v1';
  const [savedOpen, setSavedOpen] = useState(false);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const scrollRaf = useRef<number | null>(null);

  // Track if this is the initial page load (not just a tab switch)
  const isInitialPageLoad = useRef(true);
  // Track if we should skip scroll restoration for this render cycle
  const skipScrollRestore = useRef(true);
  // Reference to the main scrollable container (DashboardLayout's <main> element)
  const mainContainerRef = useRef<HTMLElement | null>(null);

  // Scroll to top on initial page load - use useLayoutEffect to run synchronously
  // before other effects can restore scroll positions
  useLayoutEffect(() => {
    // Find the main scrollable container (DashboardLayout's main element)
    // This fixes the double scrollbar issue where both window and main container have overflow
    const mainElement = document.querySelector('main.overflow-y-auto') as HTMLElement | null;
    mainContainerRef.current = mainElement;
    
    // Always scroll to top on initial page load
    if (isInitialPageLoad.current) {
      // Clear saved scroll positions to prevent restoration of stale positions
      Object.values(SCROLL_KEYS).forEach(key => {
        try { sessionStorage.removeItem(key); } catch {}
      });
      
      // Use a more forceful scroll to position 0,0
      // First, immediately scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainElement) {
        mainElement.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        mainElement.scrollTop = 0;
      }
      
      // Then, after a short delay, ensure we're still at 0
      // This handles any layout shifts that might occur after render
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (mainElement) {
          mainElement.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
          mainElement.scrollTop = 0;
        }
      });
      
      sessionStorage.setItem('marketplace:visited', '1');
      isInitialPageLoad.current = false;
      // Keep skipScrollRestore true for this render cycle
      skipScrollRestore.current = true;
      // Allow scroll restoration after a short delay (after other effects run)
      setTimeout(() => {
        skipScrollRestore.current = false;
      }, 100);
    }
  }, []);

  // Restore per-tab scroll position when switching tabs (but not on initial load)
  useEffect(() => {
    // Skip scroll restoration on initial page load and during first render cycle
    if (skipScrollRestore.current) {
      return;
    }
    
    try {
      const key = SCROLL_KEYS[activeTab];
      const y = Number(sessionStorage.getItem(key) || '0');
      if (!Number.isNaN(y) && y > 0) {
        // Scroll both window and main container
        window.scrollTo({ top: y, behavior: 'auto' });
        if (mainContainerRef.current) {
          mainContainerRef.current.scrollTo({ top: y, behavior: 'auto' });
        }
      }
    } catch {}
  }, [activeTab]);

  // Persist per-tab scroll position (throttled via rAF)
  // Track scroll on the main container since that's the actual scrollable element in DashboardLayout
  useEffect(() => {
    const mainEl = mainContainerRef.current;
    const onScroll = () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        // Use main container scroll position if available, otherwise window
        const scrollY = mainEl?.scrollTop ?? window.scrollY ?? 0;
        try { sessionStorage.setItem(SCROLL_KEYS[activeTab], String(scrollY)); } catch {}
      });
    };
    // Listen on both window and main container
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    mainEl?.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => {
      window.removeEventListener('scroll', onScroll as any);
      mainEl?.removeEventListener('scroll', onScroll as any);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [activeTab]);

  // Track previous page numbers to only scroll on page changes (not tab switches)
  const prevCgPage = useRef(cgPage);
  const prevJobPage = useRef(jobPage);
  const prevProviderPage = useRef(providerPage);

  // Auto-scroll to results container when changing pages (NOT when switching tabs)
  useEffect(() => {
    // Only scroll if the page actually changed (not just a tab switch)
    if (activeTab === 'caregivers' && prevCgPage.current !== cgPage && cgPage > 1) {
      try { resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }
    prevCgPage.current = cgPage;
  }, [activeTab, cgPage]);

  useEffect(() => {
    // Only scroll if the page actually changed (not just a tab switch)
    if (activeTab === 'jobs' && prevJobPage.current !== jobPage && jobPage > 1) {
      try { resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }
    prevJobPage.current = jobPage;
  }, [activeTab, jobPage]);

  useEffect(() => {
    // Only scroll if the page actually changed (not just a tab switch)
    if (activeTab === 'providers' && prevProviderPage.current !== providerPage && providerPage > 1) {
      try { resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }
    prevProviderPage.current = providerPage;
  }, [activeTab, providerPage]);

  // Debounced inputs to reduce URL updates and fetch churn
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [debouncedState, setDebouncedState] = useState("");
  const [debouncedMinRate, setDebouncedMinRate] = useState("");
  const [debouncedMaxRate, setDebouncedMaxRate] = useState("");
  const [debouncedMinExperience, setDebouncedMinExperience] = useState("");
  const [debouncedZip, setDebouncedZip] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const t = setTimeout(() => setDebouncedCity(city), 350); return () => clearTimeout(t); }, [city]);
  useEffect(() => { const t = setTimeout(() => setDebouncedState(state), 350); return () => clearTimeout(t); }, [state]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMinRate(minRate), 350); return () => clearTimeout(t); }, [minRate]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMaxRate(maxRate), 350); return () => clearTimeout(t); }, [maxRate]);
  useEffect(() => { const t = setTimeout(() => setDebouncedMinExperience(minExperience), 350); return () => clearTimeout(t); }, [minExperience]);
  useEffect(() => { const t = setTimeout(() => setDebouncedZip(zip), 350); return () => clearTimeout(t); }, [zip]);

  const [cgSettingOpen, setCgSettingOpen] = useState(false);
  const [cgCareTypesOpen, setCgCareTypesOpen] = useState(false);
  const [cgSpecialtiesOpen, setCgSpecialtiesOpen] = useState(false);
  const [jobSettingOpen, setJobSettingOpen] = useState(false);
  useEffect(() => {
    try {
      setCgSettingOpen(localStorage.getItem(MOBILE_DETAILS_KEYS.cgSetting) === '1' || (settings.length > 0));
      setCgCareTypesOpen(localStorage.getItem(MOBILE_DETAILS_KEYS.cgCareTypes) === '1' || (careTypes.length > 0));
      setCgSpecialtiesOpen(localStorage.getItem(MOBILE_DETAILS_KEYS.cgSpecialties) === '1' || (specialties.length > 0));
      setJobSettingOpen(localStorage.getItem(MOBILE_DETAILS_KEYS.jobSetting) === '1' || (settings.length > 0));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDetailsToggle = useCallback(
    (key: keyof typeof MOBILE_DETAILS_KEYS, setFn: (v: boolean) => void) => (e: any) => {
      const open = (e.currentTarget as HTMLDetailsElement).open;
      setFn(open);
      try { localStorage.setItem(MOBILE_DETAILS_KEYS[key], open ? '1' : '0'); } catch {}
    },
    []
  );
  // One-time: initialize tab + filters from URL with localStorage fallback
  useEffect(() => {
    if (didInitFromUrl.current) return;
    const sp = searchParams;
    if (!sp) return;
    // Determine desired tab: URL > localStorage > default
    let tab = sp.get("tab");
    if (tab !== "caregivers" && tab !== "jobs" && tab !== "providers") {
      try {
        const lastTab = localStorage.getItem(LAST_TAB_KEY);
        if (lastTab === "caregivers" || lastTab === "jobs" || lastTab === "providers") {
          tab = lastTab;
        }
      } catch {}
    }
    if (tab === "caregivers" || tab === "jobs" || tab === "providers") setActiveTab(tab as any);

    const valOrEmpty = (k: string) => sp.get(k) ?? "";
    const csv = (k: string) => (sp.get(k)?.split(",").filter(Boolean) ?? []);
    const entriesCount = Array.from(sp.entries()).length;
    // Common
    setSearch(valOrEmpty("q"));
    setCity(valOrEmpty("city"));
    setState(valOrEmpty("state"));

    // Caregivers
    setSpecialties(csv("specialties"));
    setSettings(csv("settings"));
    setCareTypes(csv("careTypes"));
    setMinRate(valOrEmpty("minRate"));
    setMaxRate(valOrEmpty("maxRate"));
    setMinExperience(valOrEmpty("minExperience"));
    setAvailableDate(valOrEmpty("availableDate"));
    setAvailableStartTime(valOrEmpty("availableStartTime"));
    setAvailableEndTime(valOrEmpty("availableEndTime"));
    const cgPageFromUrl = parseInt(sp.get("page") || "1", 10);
    if (!Number.isNaN(cgPageFromUrl) && cgPageFromUrl > 0) setCgPage(cgPageFromUrl);
    const cgSortBy = sp.get("sortBy") as any;
    if (cgSortBy && ["recency","rateAsc","rateDesc","experienceDesc","distanceAsc"].includes(cgSortBy)) setCgSort(cgSortBy);
    const cgRadiusFromUrl = sp.get("radiusMiles");
    const cgLatFromUrl = sp.get("lat");
    const cgLngFromUrl = sp.get("lng");
    setCgRadius(cgRadiusFromUrl ?? "");
    setCgGeoLat(cgLatFromUrl ? Number(cgLatFromUrl) : null);
    setCgGeoLng(cgLngFromUrl ? Number(cgLngFromUrl) : null);
    // shortlist-only filter for caregivers
    // use query param `shortlist=1`
    // (client-side filter backed by server favorites when FAMILY)
    try { setCgShortlistOnly(sp.get("shortlist") === "1"); } catch {}

    // Jobs
    setZip(valOrEmpty("zip"));
    setServices(csv("services"));
    setPostedByMe(sp.get("postedByMe") === "true");
    setHideClosed(sp.get("status") === "OPEN");
    setFavoritesOnly(sp.get("favorites") === "1");
    const jobPageFromUrl = parseInt(sp.get("page") || "1", 10);
    if (!Number.isNaN(jobPageFromUrl) && jobPageFromUrl > 0) setJobPage(jobPageFromUrl);
    const jobSortBy = sp.get("sortBy") as any;
    if (jobSortBy && ["recency","rateAsc","rateDesc","distanceAsc"].includes(jobSortBy)) setJobSort(jobSortBy);
    const jobRadiusFromUrl = sp.get("radiusMiles");
    const jobLatFromUrl = sp.get("lat");
    const jobLngFromUrl = sp.get("lng");
    setJobRadius(jobRadiusFromUrl ?? "");
    setGeoLat(jobLatFromUrl ? Number(jobLatFromUrl) : null);
    setGeoLng(jobLngFromUrl ? Number(jobLngFromUrl) : null);

    // Providers
    setProviderServices(csv("services"));
    const prPageFromUrl = parseInt(sp.get("page") || "1", 10);
    if (!Number.isNaN(prPageFromUrl) && prPageFromUrl > 0) setProviderPage(prPageFromUrl);
    const prSortBy = sp.get("sortBy") as any;
    if (prSortBy && ["ratingDesc","rateAsc","rateDesc","distanceAsc"].includes(prSortBy)) setProviderSort(prSortBy);
    const prRadiusFromUrl = sp.get("radiusMiles");
    const prLatFromUrl = sp.get("lat");
    const prLngFromUrl = sp.get("lng");
    setPrRadius(prRadiusFromUrl ?? "");
    setPrGeoLat(prLatFromUrl ? Number(prLatFromUrl) : null);
    setPrGeoLng(prLngFromUrl ? Number(prLngFromUrl) : null);

    // If URL is effectively empty (no params or only tab), try to restore last filters for the chosen tab
    if (entriesCount <= (tab ? 1 : 0)) {
      try {
        const key = (tab as any) ? LS_KEYS[tab as keyof typeof LS_KEYS] : LS_KEYS.caregivers;
        const saved = localStorage.getItem(key);
        if (saved) {
          const savedParams = new URLSearchParams(saved);
          const v = (k: string) => savedParams.get(k) ?? "";
          const arr = (k: string) => (savedParams.get(k)?.split(",").filter(Boolean) ?? []);
          // Common
          setSearch(v("q"));
          setCity(v("city"));
          setState(v("state"));
          // Caregivers
          setSpecialties(arr("specialties"));
          setSettings(arr("settings"));
          setCareTypes(arr("careTypes"));
          setMinRate(v("minRate"));
          setMaxRate(v("maxRate"));
          setMinExperience(v("minExperience"));
          setAvailableDate(v("availableDate"));
          setAvailableStartTime(v("availableStartTime"));
          setAvailableEndTime(v("availableEndTime"));
          const spCgPage = parseInt(savedParams.get("page") || "1", 10);
          if (!Number.isNaN(spCgPage) && spCgPage > 0) setCgPage(spCgPage);
          const spCgSort = savedParams.get("sortBy") as any;
          if (spCgSort && ["recency","rateAsc","rateDesc","experienceDesc","distanceAsc"].includes(spCgSort)) setCgSort(spCgSort);
          const spCgRadius = savedParams.get("radiusMiles");
          const spCgLat = savedParams.get("lat");
          const spCgLng = savedParams.get("lng");
          setCgRadius(spCgRadius ?? "");
          setCgGeoLat(spCgLat ? Number(spCgLat) : null);
          setCgGeoLng(spCgLng ? Number(spCgLng) : null);
          try { setCgShortlistOnly(savedParams.get("shortlist") === "1"); } catch {}
          
          // Jobs
          setZip(v("zip"));
          setServices(arr("services"));
          setPostedByMe(savedParams.get("postedByMe") === "true");
          
          setHideClosed(savedParams.get("status") === "OPEN");
          setFavoritesOnly(savedParams.get("favorites") === "1");
          
          const spJobPage = parseInt(savedParams.get("page") || "1", 10);
          if (!Number.isNaN(spJobPage) && spJobPage > 0) setJobPage(spJobPage);
          const spJobSort = savedParams.get("sortBy") as any;
          if (spJobSort && ["recency","rateAsc","rateDesc","distanceAsc"].includes(spJobSort)) setJobSort(spJobSort);
          const spJobRadius = savedParams.get("radiusMiles");
          const spJobLat = savedParams.get("lat");
          const spJobLng = savedParams.get("lng");
          setJobRadius(spJobRadius ?? "");
          setGeoLat(spJobLat ? Number(spJobLat) : null);
          setGeoLng(spJobLng ? Number(spJobLng) : null);
          // Providers
          setProviderServices(arr("services"));
          const spPrPage = parseInt(savedParams.get("page") || "1", 10);
          if (!Number.isNaN(spPrPage) && spPrPage > 0) setProviderPage(spPrPage);
          const spPrSort = savedParams.get("sortBy") as any;
          if (spPrSort && ["ratingDesc","rateAsc","rateDesc","distanceAsc"].includes(spPrSort)) setProviderSort(spPrSort);
          const spPrRadius = savedParams.get("radiusMiles");
          const spPrLat = savedParams.get("lat");
          const spPrLng = savedParams.get("lng");
          setPrRadius(spPrRadius ?? "");
          setPrGeoLat(spPrLat ? Number(spPrLat) : null);
          setPrGeoLng(spPrLng ? Number(spPrLng) : null);
        }
      } catch {}
    }

    didInitFromUrl.current = true;
  }, [searchParams]);

  // Listen for URL parameter changes after initial mount and update activeTab accordingly
  // This ensures tab switching via navigation updates the displayed content
  useEffect(() => {
    if (!didInitFromUrl.current) return; // Skip until initial URL read is complete
    const sp = searchParams;
    if (!sp) return;
    
    const urlTab = sp.get("tab");
    // Update activeTab ONLY when URL explicitly has a different tab parameter
    // Don't reset to caregivers when tab param is missing - the state is authoritative
    if (urlTab === "jobs" && activeTab !== "jobs") {
      setActiveTab("jobs");
    } else if (urlTab === "providers" && activeTab !== "providers") {
      setActiveTab("providers");
    } else if (urlTab === "caregivers" && activeTab !== "caregivers") {
      setActiveTab("caregivers");
    }
    // Note: Don't reset to caregivers when urlTab is empty - allow state to persist
  }, [searchParams, activeTab]);

  // Handle tab change from MarketplaceTabs component
  const handleTabChange = useCallback((tab: "jobs" | "caregivers" | "providers") => {
    setActiveTab(tab);
    // Save to localStorage for persistence
    try { localStorage.setItem(LAST_TAB_KEY, tab); } catch {}
  }, []);

  // Keep URL in sync when on caregivers tab (debounced inputs)
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "caregivers") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "caregivers");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", debouncedSearch);
    setOrDel("city", debouncedCity);
    setOrDel("state", debouncedState);
    setOrDel("specialties", specialties.join(","));
    setOrDel("settings", settings.join(","));
    setOrDel("careTypes", careTypes.join(","));
    setOrDel("minRate", debouncedMinRate);
    setOrDel("maxRate", debouncedMaxRate);
    setOrDel("minExperience", debouncedMinExperience);
    setOrDel("availableDate", availableDate);
    setOrDel("availableStartTime", availableStartTime);
    setOrDel("availableEndTime", availableEndTime);
    if (cgShortlistOnly) params.set("shortlist", "1"); else params.delete("shortlist");
    params.set("page", String(cgPage));
    params.set("sortBy", cgSort);
    if (cgRadius && cgGeoLat !== null && cgGeoLng !== null) {
      params.set("radiusMiles", cgRadius);
      params.set("lat", String(cgGeoLat));
      params.set("lng", String(cgGeoLng));
    } else {
      params.delete("radiusMiles");
      params.delete("lat");
      params.delete("lng");
    }
    try { localStorage.setItem(LAST_TAB_KEY, "caregivers"); localStorage.setItem(LS_KEYS.caregivers, params.toString()); } catch {}
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, specialties, settings, careTypes, debouncedMinRate, debouncedMaxRate, debouncedMinExperience, availableDate, availableStartTime, availableEndTime, cgPage, cgSort, cgRadius, cgGeoLat, cgGeoLng, cgShortlistOnly, router, pathname, searchParams]);

  // Keep URL in sync when on jobs tab (debounced inputs)
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "jobs") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "jobs");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", debouncedSearch);
    setOrDel("city", debouncedCity);
    setOrDel("state", debouncedState);
    setOrDel("specialties", specialties.join(","));
    setOrDel("zip", debouncedZip);
    setOrDel("settings", settings.join(","));
    setOrDel("careTypes", careTypes.join(","));
    setOrDel("services", services.join(","));
    if (postedByMe) params.set("postedByMe", "true"); else params.delete("postedByMe");
    if (hideClosed) params.set("status", "OPEN"); else params.delete("status");
    if (favoritesOnly) params.set("favorites", "1"); else params.delete("favorites");
    params.set("page", String(jobPage));
    params.set("sortBy", jobSort);
    if (jobRadius && geoLat !== null && geoLng !== null) {
      params.set("radiusMiles", jobRadius);
      params.set("lat", String(geoLat));
      params.set("lng", String(geoLng));
    } else {
      params.delete("radiusMiles");
      params.delete("lat");
      params.delete("lng");
    }
    try { localStorage.setItem(LAST_TAB_KEY, "jobs"); localStorage.setItem(LS_KEYS.jobs, params.toString()); } catch {}
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, specialties, debouncedZip, settings, careTypes, services, postedByMe, hideClosed, favoritesOnly, jobPage, jobSort, jobRadius, geoLat, geoLng, router, pathname, searchParams]);

  // Keep URL in sync when on providers tab (debounced inputs)
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "providers") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "providers");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", debouncedSearch);
    setOrDel("city", debouncedCity);
    setOrDel("state", debouncedState);
    setOrDel("services", providerServices.join(","));
    params.set("page", String(providerPage));
    params.set("sortBy", providerSort);
    if (prRadius && prGeoLat !== null && prGeoLng !== null) {
      params.set("radiusMiles", prRadius);
      params.set("lat", String(prGeoLat));
      params.set("lng", String(prGeoLng));
    } else {
      params.delete("radiusMiles");
      params.delete("lat");
      params.delete("lng");
    }
    try { localStorage.setItem(LAST_TAB_KEY, "providers"); localStorage.setItem(LS_KEYS.providers, params.toString()); } catch {}
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, providerServices, providerPage, providerSort, prRadius, prGeoLat, prGeoLng, router, pathname, searchParams]);

  useEffect(() => {
    // Load marketplace categories once
    const loadCategories = async () => {
      if (showMock) {
        setCategories(MOCK_CATEGORIES);
        return;
      }
      try {
        const res = await fetch("/api/marketplace/categories");
        const json = await res.json();
        setCategories(json?.data || {});
      } catch {
        setCategories({});
      }
    };
    loadCategories();
  }, [showMock, MOCK_CATEGORIES]);

  // Saved searches: load/save helpers
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);
  const persistSaved = useCallback((next: SavedSearch[]) => {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  }, []);
  const saveCurrentSearch = useCallback(() => {
    try {
      const name = window.prompt('Name this search');
      if (!name) return;
      const qs = typeof window !== 'undefined' ? (window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search) : '';
      const entry: SavedSearch = { id: String(Date.now()), name: name.trim(), query: qs, createdAt: Date.now() };
      const next = [entry, ...saved].slice(0, 50);
      persistSaved(next);
      setSavedOpen(true);
    } catch {}
  }, [persistSaved, saved]);
  const loadSavedSearch = useCallback((entry: SavedSearch) => {
    try {
      const base = typeof window !== 'undefined' ? window.location.pathname : pathname;
      window.location.href = `${base}?${entry.query}`;
    } catch {
      // as a fallback, use router
      router.replace(`${pathname}?${entry.query}`);
    }
  }, [pathname, router]);
  const deleteSavedSearch = useCallback((id: string) => {
    const next = saved.filter(s => s.id !== id);
    persistSaved(next);
  }, [persistSaved, saved]);

  // CAREGIVERS: Reset effect MUST run before fetch effect to avoid race condition
  // where fetch sets data, then reset clears it on initial load
  // NOTE: Query key should NOT include activeTab - reset should only trigger when 
  // filter values change within the caregivers tab, not when switching tabs
  const cgQueryKey = useMemo(() => JSON.stringify({
    q: debouncedSearch, city: debouncedCity, state: debouncedState,
    specialties, settings, careTypes,
    minRate: debouncedMinRate, maxRate: debouncedMaxRate, minExp: debouncedMinExperience,
    availableDate, availableStartTime, availableEndTime,
    radius: cgRadius, lat: cgGeoLat, lng: cgGeoLng, sort: cgSort
  }), [debouncedSearch, debouncedCity, debouncedState, specialties, settings, careTypes, debouncedMinRate, debouncedMaxRate, debouncedMinExperience, availableDate, availableStartTime, availableEndTime, cgRadius, cgGeoLat, cgGeoLng, cgSort]);
  const cgPrevKeyRef = useRef<string>(cgQueryKey);
  // Reset caregivers list when non-page filters change (runs BEFORE fetch)
  useEffect(() => {
    if (activeTab !== 'caregivers') return;
    if (cgPrevKeyRef.current !== cgQueryKey) {
      cgPrevKeyRef.current = cgQueryKey;
      setCaregivers([]);
      setCgPage(1);
      setCgCursor(null);
      setCgHasMoreSvr(null);
    }
  }, [cgQueryKey, activeTab]);

  // Fetch caregivers (runs AFTER reset effect)
  useEffect(() => {
    if (activeTab !== "caregivers") return;
    const controller = new AbortController();
    const run = async () => {
      setCaregiversLoading(true);
      try {
        if (showMock) {
          setCaregivers(MOCK_CAREGIVERS);
          setCgTotal(MOCK_CAREGIVERS.length);
          setCgHasMoreSvr(false);
          setCgCursor(null);
          return;
        }
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (debouncedCity) params.set("city", debouncedCity);
        if (debouncedState) params.set("state", debouncedState);
        if (specialties.length > 0) params.set("specialties", specialties.join(","));
        if (settings.length > 0) params.set("settings", settings.join(","));
        if (careTypes.length > 0) params.set("careTypes", careTypes.join(","));
        if (debouncedMinRate) params.set("minRate", debouncedMinRate);
        if (debouncedMaxRate) params.set("maxRate", debouncedMaxRate);
        if (debouncedMinExperience) params.set("minExperience", debouncedMinExperience);
        if (availableDate) params.set("availableDate", availableDate);
        if (availableStartTime) params.set("availableStartTime", availableStartTime);
        if (availableEndTime) params.set("availableEndTime", availableEndTime);
        if (cgRadius && cgGeoLat !== null && cgGeoLng !== null) {
          params.set("radiusMiles", cgRadius);
          params.set("lat", String(cgGeoLat));
          params.set("lng", String(cgGeoLng));
        }
        params.set("page", String(cgPage));
        params.set("pageSize", String(20));
        params.set("sortBy", cgSort);
        // Use cursor when available and not using radius search
        if (!(cgRadius && cgGeoLat !== null && cgGeoLng !== null) && cgCursor) {
          params.set('cursor', cgCursor);
        }
        const json = await fetchJsonCached(`/api/marketplace/caregivers?${params.toString()}`, { signal: controller.signal }, 15000);
        setCaregivers((prev) => (cgPage > 1 ? [...prev, ...(json?.data ?? [])] : (json?.data ?? [])));
        setCgTotal(json?.pagination?.total ?? 0);
        setCgHasMoreSvr(typeof json?.pagination?.hasMore === 'boolean' ? json.pagination.hasMore : null);
        setCgCursor(json?.pagination?.cursor ?? null);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (cgPage === 1) setCaregivers([]);
      } finally {
        setCaregiversLoading(false);
      }
    };
    run();
    return () => {
      controller.abort();
    };
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, specialties, settings, careTypes, debouncedMinRate, debouncedMaxRate, debouncedMinExperience, availableDate, availableStartTime, availableEndTime, cgPage, cgSort, cgRadius, cgGeoLat, cgGeoLng, cgCursor, showMock, MOCK_CAREGIVERS]);

  // JOBS: Reset effect MUST run before fetch effect to avoid race condition
  // where fetch sets data, then reset clears it on initial load
  // NOTE: Query key should NOT include activeTab - reset should only trigger when 
  // filter values change within the jobs tab, not when switching tabs
  const jobQueryKey = useMemo(() => JSON.stringify({
    q: debouncedSearch, city: debouncedCity, state: debouncedState,
    specialties, zip: debouncedZip, settings, careTypes, services,
    postedByMe, hideClosed, radius: jobRadius, lat: geoLat, lng: geoLng, sort: jobSort
  }), [debouncedSearch, debouncedCity, debouncedState, specialties, debouncedZip, settings, careTypes, services, postedByMe, hideClosed, jobRadius, geoLat, geoLng, jobSort]);
  const jobPrevKeyRef = useRef<string>(jobQueryKey);
  // Reset jobs list when non-page filters change (runs BEFORE fetch)
  useEffect(() => {
    if (activeTab !== 'jobs') return;
    if (jobPrevKeyRef.current !== jobQueryKey) {
      jobPrevKeyRef.current = jobQueryKey;
      setListings([]);
      setJobPage(1);
      setJobCursor(null);
      setJobHasMoreSvr(null);
    }
  }, [jobQueryKey, activeTab]);

  // Fetch jobs (runs AFTER reset effect)
  useEffect(() => {
    if (activeTab !== "jobs") return;
    const controller = new AbortController();
    const run = async () => {
      setListingsLoading(true);
      try {
        if (showMock) {
          setListings(MOCK_LISTINGS);
          setJobTotal(MOCK_LISTINGS.length);
          setJobHasMoreSvr(false);
          setJobCursor(null);
          return;
        }
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (debouncedCity) params.set("city", debouncedCity);
        if (debouncedState) params.set("state", debouncedState);
        if (specialties.length > 0) params.set("specialties", specialties.join(","));
        if (debouncedZip) params.set("zip", debouncedZip);
        if (settings.length > 0) params.set("settings", settings.join(","));
        if (careTypes.length > 0) params.set("careTypes", careTypes.join(","));
        if (services.length > 0) params.set("services", services.join(","));
        if (postedByMe && session?.user?.id) params.set("postedByMe", "true");
        if (hideClosed) params.set("status", "OPEN");
        if (jobRadius && geoLat !== null && geoLng !== null) {
          params.set("radiusMiles", jobRadius);
          params.set("lat", String(geoLat));
          params.set("lng", String(geoLng));
        }
        params.set("page", String(jobPage));
        params.set("pageSize", String(20));
        params.set("sortBy", jobSort);
        // Use cursor when available and not using radius search
        if (!(jobRadius && geoLat !== null && geoLng !== null) && jobCursor) {
          params.set('cursor', jobCursor);
        }
        const json = await fetchJsonCached(`/api/marketplace/listings?${params.toString()}`, { signal: controller.signal }, 15000);
        setListings((prev) => (jobPage > 1 ? [...prev, ...(json?.data ?? [])] : (json?.data ?? [])));
        setJobTotal(json?.pagination?.total ?? 0);
        setJobHasMoreSvr(typeof json?.pagination?.hasMore === 'boolean' ? json.pagination.hasMore : null);
        setJobCursor(json?.pagination?.cursor ?? null);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (jobPage === 1) setListings([]);
      } finally {
        setListingsLoading(false);
      }
    };
    run();
    return () => {
      controller.abort();
    };
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, specialties, debouncedZip, settings, careTypes, services, postedByMe, hideClosed, session, jobPage, jobSort, jobRadius, geoLat, geoLng, jobCursor, showMock, MOCK_LISTINGS]);

  /* ----------------------------------------------------------------------
     PROVIDERS: Reset effect MUST run before fetch effect to avoid race condition
     where fetch sets data, then reset clears it on initial load
     NOTE: Query key should NOT include activeTab - reset should only trigger when 
     filter values change within the providers tab, not when switching tabs
  ----------------------------------------------------------------------*/
  const prQueryKey = useMemo(() => JSON.stringify({
    q: debouncedSearch, city: debouncedCity, state: debouncedState,
    services: providerServices,
    radius: prRadius, lat: prGeoLat, lng: prGeoLng, sort: providerSort
  }), [debouncedSearch, debouncedCity, debouncedState, providerServices, prRadius, prGeoLat, prGeoLng, providerSort]);
  const prPrevKeyRef = useRef<string>(prQueryKey);
  // Reset providers list when non-page filters change (runs BEFORE fetch)
  useEffect(() => {
    if (activeTab !== 'providers') return;
    if (prPrevKeyRef.current !== prQueryKey) {
      prPrevKeyRef.current = prQueryKey;
      setProviders([]);
      setProviderPage(1);
      setProviderCursor(null);
      setProviderHasMoreSvr(null);
    }
  }, [prQueryKey, activeTab]);

  // Fetch providers (runs AFTER reset effect)
  useEffect(() => {
    if (activeTab !== "providers") return;
    const controller = new AbortController();
    const run = async () => {
      setProvidersLoading(true);
      try {
        if (showMock) {
          setProviders(MOCK_PROVIDERS);
          setProviderTotal(MOCK_PROVIDERS.length);
          setProviderHasMoreSvr(false);
          setProviderCursor(null);
          return;
        }
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (debouncedCity) params.set("city", debouncedCity);
        if (debouncedState) params.set("state", debouncedState);
        if (providerServices.length > 0) params.set("services", providerServices.join(","));
        if (prRadius && prGeoLat !== null && prGeoLng !== null) {
          params.set("radiusMiles", prRadius);
          params.set("lat", String(prGeoLat));
          params.set("lng", String(prGeoLng));
        }
        params.set("page", String(providerPage));
        params.set("pageSize", String(20));
        params.set("sortBy", providerSort);
        if (!(prRadius && prGeoLat !== null && prGeoLng !== null) && providerCursor) {
          params.set('cursor', providerCursor);
        }
        const json = await fetchJsonCached(`/api/marketplace/providers?${params.toString()}`, { signal: controller.signal }, 15000);
        setProviders((prev) => (providerPage > 1 ? [...prev, ...(json?.data ?? [])] : (json?.data ?? [])));
        setProviderTotal(json?.pagination?.total ?? 0);
        setProviderHasMoreSvr(typeof json?.pagination?.hasMore === 'boolean' ? json.pagination.hasMore : null);
        setProviderCursor(json?.pagination?.cursor ?? null);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (providerPage === 1) setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };
    run();
    return () => {
      controller.abort();
    };
  }, [activeTab, debouncedSearch, debouncedCity, debouncedState, providerServices, providerPage, providerSort, prRadius, prGeoLat, prGeoLng, providerCursor, showMock, MOCK_PROVIDERS]);

  // Infinite scroll flags
  // Prefer server-provided hasMore when available (cursor pagination)
  const cgHasMore = (cgHasMoreSvr !== null)
    ? cgHasMoreSvr
    : (cgTotal === 0 ? false : caregivers.length < cgTotal);
  const caregiversToRender = useMemo(() => (cgShortlistOnly ? caregivers.filter(c => caregiverFavorites.has(c.id)) : caregivers), [cgShortlistOnly, caregivers, caregiverFavorites]);
  const cgHasMoreRender = cgShortlistOnly ? false : cgHasMore;
  const jobHasMore = (jobHasMoreSvr !== null)
    ? jobHasMoreSvr
    : (jobTotal === 0 ? false : listings.length < jobTotal);
  const jobsToRender = useMemo(() => (favoritesOnly ? listings.filter(l => jobFavorites.has(l.id)) : listings), [favoritesOnly, listings, jobFavorites]);
  const jobHasMoreRender = favoritesOnly ? false : jobHasMore;
  const prHasMore = (providerHasMoreSvr !== null)
    ? providerHasMoreSvr
    : (providerTotal === 0 ? false : providers.length < providerTotal);

  // Virtualized grid components (react-virtuoso)
  const GridList = useMemo(() => {
    const C = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
      <div ref={ref} {...props} className={(props.className ? props.className + " " : "") + "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"} />
    ));
    C.displayName = 'VirtualGridList';
    return C;
  }, []);
  const GridItem = useMemo(() => {
    const C = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
      <div ref={ref} {...props} className={(props.className ? props.className + " " : "") + "contents"} />
    ));
    C.displayName = 'VirtualGridItem';
    return C;
  }, []);

  const toggleSpecialty = (slug: string) => {
    setSpecialties((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  /* helpers for future job / provider filters */
  const toggleCareType = (slug: string) => {
    setCareTypes((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };
  const toggleService = (slug: string) => {
    setServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };
  const toggleProviderService = (slug: string) => {
    setProviderServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleSetting = useCallback((slug: string) => {
    setSettings((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
    if (activeTab === 'caregivers') setCgPage(1);
    if (activeTab === 'jobs') setJobPage(1);
    if (activeTab === 'providers') setProviderPage(1);
  }, [activeTab]);

  // Clear all filters across tabs
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setCity("");
    setState("");
    setSpecialties([]);
    setMinRate('');
    setMaxRate('');
    setMinExperience('');
    setAvailableDate('');
    setAvailableStartTime('');
    setAvailableEndTime('');
    setCgRadius('');
    setCgGeoLat(null);
    setCgGeoLng(null);
    setZip('');
    setSettings([]);
    setCareTypes([]);
    setServices([]);
    setProviderServices([]);
    setPostedByMe(false);
    setCgPage(1);
    setCgSort('recency');
    setJobPage(1);
    setJobSort('recency');
    setJobRadius('');
    setGeoLat(null);
    setGeoLng(null);
    setProviderPage(1);
    setProviderSort('ratingDesc');
  }, []);

  const chips = useMemo(() => {
    const list: { key: string; label: string; remove: () => void }[] = [];
    if (search) list.push({ key: `q:${search}`, label: `Search: ${search}`, remove: () => { setSearch(""); } });
    if (city) list.push({ key: `city:${city}`, label: `City: ${city}`, remove: () => { setCity(""); } });
    if (state) list.push({ key: `state:${state}`, label: `State: ${state}`, remove: () => { setState(""); } });

    if (activeTab === 'caregivers') {
      if (minRate) list.push({ key: `minRate:${minRate}`, label: `Min $${minRate}/hr`, remove: () => { setMinRate(""); setCgPage(1); } });
      if (maxRate) list.push({ key: `maxRate:${maxRate}`, label: `Max $${maxRate}/hr`, remove: () => { setMaxRate(""); setCgPage(1); } });
      if (minExperience) list.push({ key: `minExp:${minExperience}`, label: `Min ${minExperience} yrs`, remove: () => { setMinExperience(""); setCgPage(1); } });
      if (cgShortlistOnly) list.push({ key: `cgShortlistOnly`, label: `Shortlist only`, remove: () => { setCgShortlistOnly(false); } });
      settings.forEach((s) => list.push({ key: `setting:${s}`, label: (categories['SETTING']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSetting(s); setCgPage(1); } }));
      specialties.forEach((s) => list.push({ key: `spec:${s}`, label: (categories['SPECIALTY']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSpecialty(s); setCgPage(1); } }));
    }

    if (activeTab === 'jobs') {
      if (zip) list.push({ key: `zip:${zip}`, label: `ZIP: ${zip}`, remove: () => { setZip(""); setJobPage(1); } });
      settings.forEach((s) => list.push({ key: `setting:${s}`, label: (categories['SETTING']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSetting(s); setJobPage(1); } }));
      if (postedByMe) list.push({ key: `postedByMe`, label: `Posted by me`, remove: () => { setPostedByMe(false); setJobPage(1); } });
      if (hideClosed) list.push({ key: `status:OPEN`, label: `Open only`, remove: () => { setHideClosed(false); setJobPage(1); } });
      if (favoritesOnly) list.push({ key: `favoritesOnly`, label: `Favorites only`, remove: () => { setFavoritesOnly(false); } });
      specialties.forEach((s) => list.push({ key: `spec:${s}`, label: (categories['SPECIALTY']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSpecialty(s); setJobPage(1); } }));
      careTypes.forEach((c) => list.push({ key: `care:${c}`, label: (categories['CARE_TYPE']?.find(x => x.slug === c)?.name) || c, remove: () => { toggleCareType(c); setJobPage(1); } }));
      services.forEach((srv) => list.push({ key: `svc:${srv}`, label: (categories['SERVICE']?.find(x => x.slug === srv)?.name) || srv, remove: () => { toggleService(srv); setJobPage(1); } }));
    }

    if (activeTab === 'providers') {
      providerServices.forEach((srv) => list.push({ key: `psvc:${srv}`, label: (categories['SERVICE']?.find(x => x.slug === srv)?.name) || srv, remove: () => { toggleProviderService(srv); setProviderPage(1); } }));
    }

    return list;
  }, [search, city, state, activeTab, minRate, maxRate, minExperience, settings, specialties, careTypes, services, providerServices, categories, zip, postedByMe, hideClosed, favoritesOnly, cgShortlistOnly, toggleSetting]);

  return (
      <div className="px-4 md:px-6 py-4">
        {/* Marketplace Tabs */}
        <MarketplaceTabs
          activeTab={activeTab}
          caregiversCount={cgTotal}
          jobsCount={jobTotal}
          providersCount={providerTotal}
          onTabChange={handleTabChange}
        />

        {/* Two-column layout */}
        <div className="flex md:space-x-6">
          {/* Sidebar (desktop) */}
          <div className="hidden md:block md:w-72 md:shrink-0">
            <div className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <div className="space-y-3">
                {activeTab === "caregivers" && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                      <select value={cgSort} onChange={(e) => { setCgSort(e.target.value as any); setCgPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="recency">Most recent</option>
                        <option value="rateAsc">Rate: Low to High</option>
                        <option value="rateDesc">Rate: High to Low</option>
                        <option value="experienceDesc">Experience: High to Low</option>
                        <option value="distanceAsc" disabled={!cgRadius || cgGeoLat === null || cgGeoLng === null}>Distance: Nearest</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={cgShortlistOnly}
                          onChange={(e) => { setCgShortlistOnly(e.target.checked); }}
                        />
                        <span>Shortlist only</span>
                      </label>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={cgRadius}
                          onChange={(e) => { setCgRadius(e.target.value); setCgPage(1); }}
                          placeholder="e.g. 10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            if (navigator?.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => { setCgGeoLat(pos.coords.latitude); setCgGeoLng(pos.coords.longitude); setCgPage(1); },
                                () => {/* ignore errors */},
                                { enableHighAccuracy: true, timeout: 8000 }
                              );
                            }
                          }}
                          title={cgGeoLat && cgGeoLng ? `Using: ${cgGeoLat.toFixed(4)}, ${cgGeoLng.toFixed(4)}` : 'Use my location'}
                        >
                          {cgGeoLat && cgGeoLng ? 'Location set' : 'Use my location'}
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Hourly Rate ($)</label>
                      <input 
                        type="number" 
                        value={minRate} 
                        onChange={(e) => setMinRate(e.target.value)} 
                        placeholder="Min Rate" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Hourly Rate ($)</label>
                      <input 
                        type="number" 
                        value={maxRate} 
                        onChange={(e) => setMaxRate(e.target.value)} 
                        placeholder="Max Rate" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Experience (years)</label>
                      <input 
                        type="number" 
                        value={minExperience} 
                        onChange={(e) => setMinExperience(e.target.value)} 
                        placeholder="Min Experience" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    {/* Availability Filters */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-sm mb-2">Availability</h4>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
                        <input 
                          type="date" 
                          value={availableDate} 
                          onChange={(e) => setAvailableDate(e.target.value)} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                          <input 
                            type="time" 
                            value={availableStartTime} 
                            onChange={(e) => setAvailableStartTime(e.target.value)} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                          <input 
                            type="time" 
                            value={availableEndTime} 
                            onChange={(e) => setAvailableEndTime(e.target.value)} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      {(availableDate || availableStartTime || availableEndTime) && (
                        <button
                          onClick={() => {
                            setAvailableDate("");
                            setAvailableStartTime("");
                            setAvailableEndTime("");
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 underline"
                        >
                          Clear availability filters
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Specialties</h4>
                      {(categories['SPECIALTY'] || []).map((specialty) => (
                        <label key={specialty.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={specialties.includes(specialty.slug)} 
                            onChange={() => toggleSpecialty(specialty.slug)} 
                          />
                          <span>{specialty.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                
                {activeTab === "jobs" && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                      <select value={jobSort} onChange={(e) => { setJobSort(e.target.value as any); setJobPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="recency">Most recent</option>
                        <option value="rateAsc">Rate: Low to High</option>
                        <option value="rateDesc">Rate: High to Low</option>
                        <option value="distanceAsc" disabled={!jobRadius || geoLat === null || geoLng === null}>Distance: Nearest</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input 
                        type="text" 
                        value={zip} 
                        onChange={(e) => setZip(e.target.value)} 
                        placeholder="ZIP Code" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={jobRadius}
                          onChange={(e) => { setJobRadius(e.target.value); setJobPage(1); }}
                          placeholder="e.g. 10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            if (navigator?.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); setJobPage(1); },
                                () => {/* ignore errors */},
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
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Setting</h4>
                      {(categories['SETTING'] || []).map((item) => (
                        <label key={item.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={settings.includes(item.slug)}
                            onChange={() => toggleSetting(item.slug)}
                          />
                          <span>{item.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Care Types</h4>
                      {(categories['CARE_TYPE'] || []).map((careType) => (
                        <label key={careType.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={careTypes.includes(careType.slug)} 
                            onChange={() => toggleCareType(careType.slug)} 
                          />
                          <span>{careType.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Services</h4>
                      {(categories['SERVICE'] || []).map((service) => (
                        <label key={service.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={services.includes(service.slug)} 
                            onChange={() => toggleService(service.slug)} 
                          />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Specialties</h4>
                      {(categories['SPECIALTY'] || []).map((specialty) => (
                        <label key={specialty.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={specialties.includes(specialty.slug)} 
                            onChange={() => toggleSpecialty(specialty.slug)} 
                          />
                          <span>{specialty.name}</span>
                        </label>
                      ))}
                    </div>
                    {session?.user?.id && (
                      <div className="mt-4">
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={postedByMe} 
                            onChange={(e) => setPostedByMe(e.target.checked)} 
                          />
                          <span>Posted by me</span>
                        </label>
                      </div>
                    )}
                    <div className="mt-2">
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={hideClosed}
                          onChange={(e) => { setHideClosed(e.target.checked); setJobPage(1); }}
                        />
                        <span>Hide closed/filled</span>
                      </label>
                    </div>
                    <div className="mt-2">
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={favoritesOnly}
                          onChange={(e) => { setFavoritesOnly(e.target.checked); }}
                        />
                        <span>Favorites only</span>
                      </label>
                    </div>
                  </>
                )}
                
                {activeTab === "providers" && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                      <select value={providerSort} onChange={(e) => { setProviderSort(e.target.value as any); setProviderPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="ratingDesc">Rating: High to Low</option>
                        <option value="rateAsc">Price: Low to High</option>
                        <option value="rateDesc">Price: High to Low</option>
                        <option value="distanceAsc" disabled={!prRadius || prGeoLat === null || prGeoLng === null}>Distance: Nearest</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (miles)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={prRadius}
                          onChange={(e) => { setPrRadius(e.target.value); setProviderPage(1); }}
                          placeholder="e.g. 10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            if (navigator?.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => { setPrGeoLat(pos.coords.latitude); setPrGeoLng(pos.coords.longitude); setProviderPage(1); },
                                () => {/* ignore errors */},
                                { enableHighAccuracy: true, timeout: 8000 }
                              );
                            }
                          }}
                          title={prGeoLat && prGeoLng ? `Using: ${prGeoLat.toFixed(4)}, ${prGeoLng.toFixed(4)}` : 'Use my location'}
                        >
                          {prGeoLat && prGeoLng ? 'Location set' : 'Use my location'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium text-sm mb-2">Services</h4>
                      {(categories['SERVICE'] || []).map((service) => (
                        <label key={service.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={providerServices.includes(service.slug)} 
                            onChange={() => toggleProviderService(service.slug)} 
                          />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={clearAllFilters} 
                className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1" ref={resultsRef}>
            {chips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <button key={c.key} onClick={c.remove} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm bg-white hover:bg-gray-50">
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
                <button
                  onClick={() => {
                    try {
                      const url = window.location.href;
                      (navigator as any)?.clipboard?.writeText(url)
                        ?.then(() => {
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 1500);
                        })
                        ?.catch(() => {
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 1500);
                        });
                    } catch {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1500);
                    }
                  }}
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
                  title="Copy shareable link"
                >
                  {linkCopied ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={saveCurrentSearch}
                  className="inline-flex items-center rounded-md bg-white border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  title="Save this search locally"
                >
                  Save search
                </button>
                <div className="relative">
                  <button
                    onClick={() => setSavedOpen((v) => !v)}
                    className="inline-flex items-center rounded-md bg-white border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    title="View saved searches"
                  >
                    Saved ({saved.length})
                    <svg className="ml-1 h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" /></svg>
                  </button>
                  {savedOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-md border bg-white shadow-md z-10">
                      <div className="max-h-64 overflow-auto p-2">
                        {saved.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">No saved searches yet.</div>
                        ) : saved.map((s) => (
                          <div key={s.id} className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                            <button
                              onClick={() => loadSavedSearch(s)}
                              className="truncate text-left text-sm text-gray-800 hover:underline flex-1"
                              title={s.name}
                            >
                              {s.name}
                            </button>
                            <button
                              onClick={() => deleteSavedSearch(s.id)}
                              className="opacity-60 hover:opacity-100 text-gray-500 text-sm"
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Mobile filters */}
            <div className="mb-6 rounded-md border border-gray-200 bg-white p-3 pb-16 md:hidden">
              <div className="grid grid-cols-1 gap-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                
                {activeTab === "caregivers" && (
                  <>
                    <input 
                      type="number" 
                      value={minRate} 
                      onChange={(e) => setMinRate(e.target.value)} 
                      placeholder="Min Rate ($)" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input 
                      type="number" 
                      value={maxRate} 
                      onChange={(e) => setMaxRate(e.target.value)} 
                      placeholder="Max Rate ($)" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input 
                      type="number" 
                      value={minExperience} 
                      onChange={(e) => setMinExperience(e.target.value)} 
                      placeholder="Min Experience (years)" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    
                    <div className="mt-1">
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={cgShortlistOnly}
                          onChange={(e) => { setCgShortlistOnly(e.target.checked); }}
                        />
                        <span>Shortlist only</span>
                      </label>
                    </div>
                    <details open={cgSettingOpen} onToggle={handleDetailsToggle('cgSetting', setCgSettingOpen)} className="group rounded-md border border-gray-200 bg-white p-3">
                      <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span>Setting</span>
                          {settings.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{settings.length}</span>
                          )}
                        </span>
                        <svg className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-3 overflow-hidden transition-[max-height] duration-300 ease-in-out max-h-0 group-open:max-h-96">
                        {(categories['SETTING'] || []).map((item) => (
                          <label key={item.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <input type="checkbox" checked={settings.includes(item.slug)} onChange={() => toggleSetting(item.slug)} />
                            <span>{item.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                    
                    <details open={cgCareTypesOpen} onToggle={handleDetailsToggle('cgCareTypes', setCgCareTypesOpen)} className="group rounded-md border border-gray-200 bg-white p-3">
                      <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span>Care Types</span>
                          {careTypes.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{careTypes.length}</span>
                          )}
                        </span>
                        <svg className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-3 overflow-hidden transition-[max-height] duration-300 ease-in-out max-h-0 group-open:max-h-96">
                        {(categories['CARE_TYPE'] || []).map((careType) => (
                          <label key={careType.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <input type="checkbox" checked={careTypes.includes(careType.slug)} onChange={() => toggleCareType(careType.slug)} />
                            <span>{careType.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                    
                    <details open={cgSpecialtiesOpen} onToggle={handleDetailsToggle('cgSpecialties', setCgSpecialtiesOpen)} className="group rounded-md border border-gray-200 bg-white p-3">
                      <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span>Specialties</span>
                          {specialties.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{specialties.length}</span>
                          )}
                        </span>
                        <svg className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-3 overflow-hidden transition-[max-height] duration-300 ease-in-out max-h-0 group-open:max-h-96">
                        {(categories['SPECIALTY'] || []).map((specialty) => (
                          <label key={specialty.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <input type="checkbox" checked={specialties.includes(specialty.slug)} onChange={() => toggleSpecialty(specialty.slug)} />
                            <span>{specialty.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </>
                )}
                
                {activeTab === "jobs" && (
                  <>
                    <input 
                      type="text" 
                      value={zip} 
                      onChange={(e) => setZip(e.target.value)} 
                      placeholder="ZIP Code" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <div>
                      <h4 className="font-medium text-sm mb-2">Setting</h4>
                      
                      <details open={jobSettingOpen} onToggle={handleDetailsToggle('jobSetting', setJobSettingOpen)} className="group rounded-md border border-gray-200 bg-white p-3">
                        <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                          <span className="flex items-center gap-2">
                            <span>Setting</span>
                            {settings.length > 0 && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{settings.length}</span>
                            )}
                          </span>
                          <svg className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-3 overflow-hidden transition-[max-height] duration-300 ease-in-out max-h-0 group-open:max-h-96">
                          {(categories['SETTING'] || []).map((item) => (
                            <label key={item.slug} className="flex items-center gap-2 text-sm whitespace-nowrap">
                              <input type="checkbox" checked={settings.includes(item.slug)} onChange={() => toggleSetting(item.slug)} />
                              <span>{item.name}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                      <div className="mt-3">
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={hideClosed}
                            onChange={(e) => { setHideClosed(e.target.checked); setJobPage(1); }}
                          />
                          <span>Hide closed/filled</span>
                        </label>
                      </div>
                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={favoritesOnly}
                            onChange={(e) => { setFavoritesOnly(e.target.checked); }}
                          />
                          <span>Favorites only</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === "caregivers" && (categories['SETTING'] || []).map((item) => (
                    <label key={item.slug} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={settings.includes(item.slug)} 
                        onChange={() => toggleSetting(item.slug)} 
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                  {activeTab === "caregivers" && (categories['CARE_TYPE'] || []).map((careType) => (
                    <label key={careType.slug} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={careTypes.includes(careType.slug)} 
                        onChange={() => toggleCareType(careType.slug)} 
                      />
                      <span>{careType.name}</span>
                    </label>
                  ))}
                  {activeTab === "caregivers" && (categories['SPECIALTY'] || []).map((specialty) => (
                    <label key={specialty.slug} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={specialties.includes(specialty.slug)} 
                        onChange={() => toggleSpecialty(specialty.slug)} 
                      />
                      <span>{specialty.name}</span>
                    </label>
                  ))}
                  
                  {activeTab === "jobs" && (categories['CARE_TYPE'] || []).map((careType) => (
                    <label key={careType.slug} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={careTypes.includes(careType.slug)} 
                        onChange={() => toggleCareType(careType.slug)} 
                      />
                      <span>{careType.name}</span>
                    </label>
                  ))}
                  
                  {activeTab === "providers" && (categories['SERVICE'] || []).map((service) => (
                    <label key={service.slug} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={providerServices.includes(service.slug)} 
                        onChange={() => toggleProviderService(service.slug)} 
                      />
                      <span>{service.name}</span>
                    </label>
                  ))}
                </div>
            {/* Sticky Apply/Clear bar for mobile */}
            <div className="fixed bottom-3 left-3 right-3 z-30 md:hidden">
              <div className="rounded-md bg-white shadow-lg border border-gray-200 p-2 flex items-center gap-2">
                <button
                  onClick={clearAllFilters}
                  className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    // "Apply" is effectively a no-op since URL sync is live; scroll to results
                    try { resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
                  }}
                  className="flex-1 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                >
                  Apply
                </button>
              </div>
            </div>
              </div>
            </div>

          {/* Results start */}
            {activeTab === "caregivers" && session?.user?.role === "CAREGIVER" && (
              <div className="mb-4">
                <Link href="/settings/profile" className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Create / Update Profile</Link>
              </div>
            )}

            {/* Tab bodies */}
            {activeTab === "caregivers" ? (
              caregiversLoading && caregiversToRender.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Loading caregivers…</div>
              ) : caregiversToRender.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-lg font-medium text-gray-900 mb-1">No caregivers found</div>
                  <div className="text-sm text-gray-600 mb-4">Try adjusting your filters or search terms.</div>
                  <button onClick={clearAllFilters} className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200">Reset filters</button>
                </div>
              ) : (
                <VirtuosoGrid
                  useWindowScroll
                  totalCount={caregiversToRender.length}
                  data={caregiversToRender}
                  initialItemCount={20}
                  endReached={() => { if (cgHasMoreRender && !caregiversLoading) setCgPage((p) => p + 1); }}
                  overscan={200}
                  components={{ List: GridList as any, Item: GridItem as any, Footer: () => (!cgHasMoreRender && caregiversToRender.length > 0 ? <div className="py-6 text-center text-gray-400">End of results</div> : null) as any }}
                  itemContent={(_, cg) => (cg ? (
                    <div className="relative">
                      {/* Favorite (always visible; server-sync when FAMILY) */}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCaregiverFavorite(cg.id); }}
                          aria-label={caregiverFavorites.has(cg.id) ? 'Remove from shortlist' : 'Add to shortlist'}
                          aria-pressed={caregiverFavorites.has(cg.id)}
                          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white"
                          title={caregiverFavorites.has(cg.id) ? 'Shortlisted' : 'Shortlist'}
                        >
                          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${caregiverFavorites.has(cg.id) ? 'text-rose-600' : 'text-gray-400'}`} fill={caregiverFavorites.has(cg.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                      <CaregiverCard key={cg.id} caregiver={cg} />
                    </div>
                  ) : null)}
                />
              )
            ) : activeTab === "jobs" ? (
              listingsLoading && listings.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Loading jobs…</div>
              ) : jobsToRender.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-lg font-medium text-gray-900 mb-1">No jobs found</div>
                  <div className="text-sm text-gray-600 mb-4">Try different keywords or clear all filters.</div>
                  <button onClick={clearAllFilters} className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200">Reset filters</button>
                </div>
              ) : (
                <>
                  {!showMock && session?.user?.role === "CAREGIVER" && (
                    <div className="mb-6">
                      <RecommendedListings />
                      <div className="my-4" />
                    </div>
                  )}
                  <VirtuosoGrid
                    useWindowScroll
                    totalCount={listings.length}
                    data={listings}
                    endReached={() => { if (jobHasMore && !listingsLoading) setJobPage((p) => p + 1); }}
                    overscan={200}
                    components={{ List: GridList as any, Item: GridItem as any }}
                    itemContent={(_, job) => (
                      <Link href={`/marketplace/listings/${job.id}`} className={`relative block bg-white border rounded-md p-4 transition-shadow ${job.status === 'CLOSED' || job.status === 'HIRED' ? 'opacity-80' : 'hover:shadow-md'}`}>
                        {/* Status badge */}
                        {job.status && (
                          <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${job.status === 'OPEN' ? 'bg-green-100 text-green-800' : job.status === 'HIRED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                            {job.status}
                          </span>
                        )}
                        <div className="flex items-start mb-2">
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                            <Image
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.title)}&background=random&size=128`}
                              alt={job.title}
                              width={48}
                              height={48}
                              placeholder="blur"
                              blurDataURL={getBlurDataURL(48, 48)}
                              sizes="48px"
                              loading="lazy"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                            <div className="text-sm text-gray-600">
                              {[job.city, job.state].filter(Boolean).join(", ") || "Location"}
                              {typeof job.distanceMiles === 'number' && isFinite(job.distanceMiles) && (
                                <span className="ml-2 text-gray-500">• {job.distanceMiles.toFixed(1)} mi</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {(job.hourlyRateMin || job.hourlyRateMax) && (
                          <div className="text-sm text-gray-800 mb-2">
                            {job.hourlyRateMin && job.hourlyRateMax ? `$${job.hourlyRateMin} - $${job.hourlyRateMax}/hr` : job.hourlyRateMin ? `From $${job.hourlyRateMin}/hr` : `Up to $${job.hourlyRateMax}/hr`}
                          </div>
                        )}
                        {(typeof job.applicationCount === 'number' || typeof job.hireCount === 'number') && (
                          <div className="mb-2 text-xs text-gray-600">
                            {typeof job.applicationCount === 'number' && <span>{job.applicationCount} appl</span>}
                            {typeof job.applicationCount === 'number' && typeof job.hireCount === 'number' && <span className="mx-1">•</span>}
                            {typeof job.hireCount === 'number' && <span>{job.hireCount} hires</span>}
                          </div>
                        )}
                        <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                      </Link>
                    )}
                  />
                </>
              )
            ) : (
              providersLoading && providers.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-lg font-medium text-gray-900 mb-1">No providers found</div>
                  <div className="text-sm text-gray-600 mb-4">Try broadening your search or clearing filters.</div>
                  <button onClick={clearAllFilters} className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200">Reset filters</button>
                </div>
              ) : (
                <VirtuosoGrid
                  useWindowScroll
                  totalCount={providers.length}
                  data={providers}
                  initialItemCount={20}
                  endReached={() => { if (prHasMore && !providersLoading) setProviderPage((p) => p + 1); }}
                  overscan={200}
                  components={{ List: GridList as any, Item: GridItem as any, Footer: () => (!prHasMore && providers.length > 0 ? <div className="py-6 text-center text-gray-400">End of results</div> : null) as any }}
                  itemContent={(_, p) => (p ? (
                    <Link href={`/marketplace/providers/${p.id}`} className="relative block bg-white border rounded-md p-4 hover:shadow-md transition-shadow">
                      {/* Favorite (local) */}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleProviderFavorite(p.id); }}
                        aria-label={providerFavorites.has(p.id) ? 'Unfavorite provider' : 'Favorite provider'}
                        aria-pressed={providerFavorites.has(p.id)}
                        className="absolute right-3 bottom-3 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/90 border hover:bg-white"
                        title={providerFavorites.has(p.id) ? 'Unfavorite' : 'Favorite'}
                      >
                        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${providerFavorites.has(p.id) ? 'text-rose-600' : 'text-gray-400'}`} fill={providerFavorites.has(p.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                      <div className="flex items-start mb-2">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                          <Image
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=128`}
                            alt={p.name}
                            width={48}
                            height={48}
                            placeholder="blur"
                            blurDataURL={getBlurDataURL(48, 48)}
                            sizes="48px"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          <div className="text-sm text-gray-600">
                            {[p.city, p.state].filter(Boolean).join(", ")}
                            {typeof p.distanceMiles === 'number' && isFinite(p.distanceMiles) && (
                              <span className="ml-2 text-gray-500">• {p.distanceMiles.toFixed(1)} mi</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm mb-2">
                        <span className="mr-1 flex">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <span key={idx} className={idx < Math.round(p.ratingAverage) ? "text-yellow-400" : "text-gray-300"}>★</span>
                          ))}
                        </span>
                        <span className="text-gray-600">{p.ratingAverage.toFixed(1)} ({p.reviewCount})</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {p.services.slice(0, 4).map((s: string) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">{s.replace(/-/g, " ")}</span>
                        ))}
                        {p.services.length > 4 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">+{p.services.length - 4} more</span>
                        )}
                      </div>
                      {(p.hourlyRate !== null || p.perMileRate !== null) && (
                        <div className="text-sm text-gray-800 mb-2">{p.hourlyRate !== null ? `$${p.hourlyRate}/hr` : `$${p.perMileRate?.toFixed(2)}/mi`}</div>
                      )}
                    </Link>
                  ) : null)}
                />
              )
            )}
          </div>
        </div>
      </div>
  );
}

