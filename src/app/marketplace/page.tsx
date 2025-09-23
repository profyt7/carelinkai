"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CaregiverCard from "@/components/marketplace/CaregiverCard";
import Image from "next/image";
import RecommendedListings from "@/components/marketplace/RecommendedListings";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const LAST_TAB_KEY = "marketplace:lastTab";
const LS_KEYS = {
  caregivers: "marketplace:caregivers",
  jobs: "marketplace:jobs",
  providers: "marketplace:providers",
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
  distanceMiles?: number;
};

export default function MarketplacePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);

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

  /* ---------------- Job-specific filters (place-holders) ------------ */
  const [zip, setZip] = useState("");
  const [settings, setSettings] = useState<string[]>([]);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [postedByMe, setPostedByMe] = useState(false);
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

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [jobPage, setJobPage] = useState(1);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobSort, setJobSort] = useState<"recency" | "rateAsc" | "rateDesc" | "distanceAsc">("recency");

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
  const [prGeoLat, setPrGeoLat] = useState<number | null>(null);
  const [prGeoLng, setPrGeoLng] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Persist mobile <details> open/closed state across visits
  const MOBILE_DETAILS_KEYS = {
    cgSetting: 'marketplace:mobile:cg:setting:open',
    cgCareTypes: 'marketplace:mobile:cg:careTypes:open',
    cgSpecialties: 'marketplace:mobile:cg:specialties:open',
    jobSetting: 'marketplace:mobile:job:setting:open',
  } as const;
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

    // Jobs
    setZip(valOrEmpty("zip"));
    setServices(csv("services"));
    setPostedByMe(sp.get("postedByMe") === "true");
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
          // Jobs
          setZip(v("zip"));
          setServices(arr("services"));
          setPostedByMe(savedParams.get("postedByMe") === "true");
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

  // Keep URL in sync when on caregivers tab
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "caregivers") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "caregivers");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", search);
    setOrDel("city", city);
    setOrDel("state", state);
    setOrDel("specialties", specialties.join(","));
    setOrDel("settings", settings.join(","));
    setOrDel("careTypes", careTypes.join(","));
    setOrDel("minRate", minRate);
    setOrDel("maxRate", maxRate);
    setOrDel("minExperience", minExperience);
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
  }, [activeTab, search, city, state, specialties, settings, careTypes, minRate, maxRate, minExperience, cgPage, cgSort, cgRadius, cgGeoLat, cgGeoLng, router, pathname, searchParams]);

  // Keep URL in sync when on jobs tab
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "jobs") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "jobs");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", search);
    setOrDel("city", city);
    setOrDel("state", state);
    setOrDel("specialties", specialties.join(","));
    setOrDel("zip", zip);
    setOrDel("settings", settings.join(","));
    setOrDel("careTypes", careTypes.join(","));
    setOrDel("services", services.join(","));
    if (postedByMe) params.set("postedByMe", "true"); else params.delete("postedByMe");
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
  }, [activeTab, search, city, state, specialties, zip, settings, careTypes, services, postedByMe, jobPage, jobSort, jobRadius, geoLat, geoLng, router, pathname, searchParams]);

  // Keep URL in sync when on providers tab
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (activeTab !== "providers") return;
    const params = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
    params.set("tab", "providers");
    const setOrDel = (k: string, v?: string) => {
      if (v && v.length > 0) params.set(k, v); else params.delete(k);
    };
    setOrDel("q", search);
    setOrDel("city", city);
    setOrDel("state", state);
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
  }, [activeTab, search, city, state, providerServices, providerPage, providerSort, prRadius, prGeoLat, prGeoLng, router, pathname, searchParams]);

  useEffect(() => {
    // Load marketplace categories once
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/marketplace/categories");
        const json = await res.json();
        setCategories(json?.data || {});
      } catch {
        setCategories({});
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab !== "caregivers") return;
    const run = async () => {
      setCaregiversLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (city) params.set("city", city);
        if (state) params.set("state", state);
        if (specialties.length > 0) params.set("specialties", specialties.join(","));
        if (settings.length > 0) params.set("settings", settings.join(","));
        if (careTypes.length > 0) params.set("careTypes", careTypes.join(","));
        if (minRate) params.set("minRate", minRate);
        if (maxRate) params.set("maxRate", maxRate);
        if (minExperience) params.set("minExperience", minExperience);
        if (cgRadius && cgGeoLat !== null && cgGeoLng !== null) {
          params.set("radiusMiles", cgRadius);
          params.set("lat", String(cgGeoLat));
          params.set("lng", String(cgGeoLng));
        }
        params.set("page", String(cgPage));
        params.set("pageSize", String(20));
        params.set("sortBy", cgSort);
        const res = await fetch(`/api/marketplace/caregivers?${params.toString()}`);
        const json = await res.json();
        setCaregivers(json?.data ?? []);
        setCgTotal(json?.pagination?.total ?? 0);
      } catch (e) {
        setCaregivers([]);
      } finally {
        setCaregiversLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state, specialties, settings, careTypes, minRate, maxRate, minExperience, cgPage, cgSort, cgRadius, cgGeoLat, cgGeoLng]);

  useEffect(() => {
    if (activeTab !== "jobs") return;
    const run = async () => {
      setListingsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (city) params.set("city", city);
        if (state) params.set("state", state);
        if (specialties.length > 0) params.set("specialties", specialties.join(","));
        if (zip) params.set("zip", zip);
        if (settings.length > 0) params.set("settings", settings.join(","));
        if (careTypes.length > 0) params.set("careTypes", careTypes.join(","));
        if (services.length > 0) params.set("services", services.join(","));
        if (postedByMe && session?.user?.id) params.set("postedByMe", "true");
        if (jobRadius && geoLat !== null && geoLng !== null) {
          params.set("radiusMiles", jobRadius);
          params.set("lat", String(geoLat));
          params.set("lng", String(geoLng));
        }
        params.set("page", String(jobPage));
        params.set("pageSize", String(20));
        params.set("sortBy", jobSort);
        const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
        const json = await res.json();
        setListings(json?.data ?? []);
        setJobTotal(json?.pagination?.total ?? 0);
      } catch (e) {
        setListings([]);
      } finally {
        setListingsLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state, specialties, zip, settings, careTypes, services, postedByMe, session, jobPage, jobSort, jobRadius, geoLat, geoLng]);

  /* ----------------------------------------------------------------------
     Fetch providers
  ----------------------------------------------------------------------*/
  useEffect(() => {
    if (activeTab !== "providers") return;
    const run = async () => {
      setProvidersLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (city) params.set("city", city);
        if (state) params.set("state", state);
        if (providerServices.length > 0) params.set("services", providerServices.join(","));
        if (prRadius && prGeoLat !== null && prGeoLng !== null) {
          params.set("radiusMiles", prRadius);
          params.set("lat", String(prGeoLat));
          params.set("lng", String(prGeoLng));
        }
        params.set("page", String(providerPage));
        params.set("pageSize", String(20));
        params.set("sortBy", providerSort);
        const res = await fetch(`/api/marketplace/providers?${params.toString()}`);
        const json = await res.json();
        setProviders(json?.data ?? []);
        setProviderTotal(json?.pagination?.total ?? 0);
      } catch (e) {
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state, providerServices, providerPage, providerSort, prRadius, prGeoLat, prGeoLng]);

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

  const chips = useMemo(() => {
    const list: { key: string; label: string; remove: () => void }[] = [];
    if (search) list.push({ key: `q:${search}`, label: `Search: ${search}`, remove: () => { setSearch(""); } });
    if (city) list.push({ key: `city:${city}`, label: `City: ${city}`, remove: () => { setCity(""); } });
    if (state) list.push({ key: `state:${state}`, label: `State: ${state}`, remove: () => { setState(""); } });

    if (activeTab === 'caregivers') {
      if (minRate) list.push({ key: `minRate:${minRate}`, label: `Min $${minRate}/hr`, remove: () => { setMinRate(""); setCgPage(1); } });
      if (maxRate) list.push({ key: `maxRate:${maxRate}`, label: `Max $${maxRate}/hr`, remove: () => { setMaxRate(""); setCgPage(1); } });
      if (minExperience) list.push({ key: `minExp:${minExperience}`, label: `Min ${minExperience} yrs`, remove: () => { setMinExperience(""); setCgPage(1); } });
      settings.forEach((s) => list.push({ key: `setting:${s}`, label: (categories['SETTING']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSetting(s); setCgPage(1); } }));
      specialties.forEach((s) => list.push({ key: `spec:${s}`, label: (categories['SPECIALTY']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSpecialty(s); setCgPage(1); } }));
      careTypes.forEach((c) => list.push({ key: `care:${c}`, label: (categories['CARE_TYPE']?.find(x => x.slug === c)?.name) || c, remove: () => { toggleCareType(c); setCgPage(1); } }));
    }

    if (activeTab === 'jobs') {
      if (zip) list.push({ key: `zip:${zip}`, label: `ZIP: ${zip}`, remove: () => { setZip(""); setJobPage(1); } });
      settings.forEach((s) => list.push({ key: `setting:${s}`, label: (categories['SETTING']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSetting(s); setJobPage(1); } }));
      if (postedByMe) list.push({ key: `postedByMe`, label: `Posted by me`, remove: () => { setPostedByMe(false); setJobPage(1); } });
      specialties.forEach((s) => list.push({ key: `spec:${s}`, label: (categories['SPECIALTY']?.find(x => x.slug === s)?.name) || s, remove: () => { toggleSpecialty(s); setJobPage(1); } }));
      careTypes.forEach((c) => list.push({ key: `care:${c}`, label: (categories['CARE_TYPE']?.find(x => x.slug === c)?.name) || c, remove: () => { toggleCareType(c); setJobPage(1); } }));
      services.forEach((srv) => list.push({ key: `svc:${srv}`, label: (categories['SERVICE']?.find(x => x.slug === srv)?.name) || srv, remove: () => { toggleService(srv); setJobPage(1); } }));
    }

    if (activeTab === 'providers') {
      providerServices.forEach((srv) => list.push({ key: `psvc:${srv}`, label: (categories['SERVICE']?.find(x => x.slug === srv)?.name) || srv, remove: () => { toggleProviderService(srv); setProviderPage(1); } }));
    }

    return list;
  }, [search, city, state, activeTab, minRate, maxRate, minExperience, settings, specialties, careTypes, services, providerServices, categories, zip, postedByMe, toggleSetting]);

  return (
    <DashboardLayout title="Marketplace">
      <div className="px-4 md:px-6 py-4">
        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {["caregivers", "jobs", "providers"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={
                  "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium " +
                  (activeTab === t
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
                }
              >
                {t === "caregivers"
                  ? `Caregivers${cgTotal ? ` (${cgTotal})` : ""}`
                  : t === "jobs"
                  ? `Jobs${jobTotal ? ` (${jobTotal})` : ""}`
                  : `Providers${providerTotal ? ` (${providerTotal})` : ""}`}
              </button>
            ))}
          </nav>
        </div>

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
                onClick={() => { 
                  setSearch(""); 
                  setCity(""); 
                  setState(""); 
                  setSpecialties([]); 
                  setMinRate(''); 
                  setMaxRate(''); 
                  setMinExperience(''); 
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
                }} 
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
                  onClick={() => {
                    setSearch("");
                    setCity("");
                    setState("");
                    setSpecialties([]);
                    setMinRate('');
                    setMaxRate('');
                    setMinExperience('');
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
                    setJobPage(1);
                    setProviderPage(1);
                  }}
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
                  onClick={() => {
                    setSearch("");
                    setCity("");
                    setState("");
                    setSpecialties([]);
                    setMinRate('');
                    setMaxRate('');
                    setMinExperience('');
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
                    setJobPage(1);
                    setProviderPage(1);
                  }}
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
              caregiversLoading ? (
                <div className="py-20 text-center text-gray-500">Loading caregivers…</div>
              ) : caregivers.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No caregivers found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {caregivers.map((cg) => (
                    <CaregiverCard key={cg.id} caregiver={cg} />
                  ))}
                </div>
              )
            ) : activeTab === "jobs" ? (
              /* Jobs tab ----------------------------------------------------- */
              listingsLoading ? (
                <div className="py-20 text-center text-gray-500">Loading jobs…</div>
              ) : listings.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No jobs found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* AI Matching – recommended jobs for caregivers */}
                  {session?.user?.role === "CAREGIVER" && (
                    <div className="col-span-full mb-6">
                      <RecommendedListings />
                      <div className="my-4" /> {/* divider margin */}
                    </div>
                  )}
                  {listings.map((job) => (
                    <Link href={`/marketplace/listings/${job.id}`} key={job.id} className="block bg-white border rounded-md p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start mb-2">
                        <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                          <Image src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.title)}&background=random&size=128`} alt={job.title} width={48} height={48} />
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
                      <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              providersLoading ? (
                <div className="py-20 text-center text-gray-500">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No providers found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {providers.map((p) => (
                    <div key={p.id} className="bg-white border rounded-md p-4">
                      <div className="flex items-start mb-2">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                          <Image src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=128`} alt={p.name} width={48} height={48} />
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
                        {p.services.slice(0, 4).map((s) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">{s.replace(/-/g, " ")}</span>
                        ))}
                        {p.services.length > 4 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">+{p.services.length - 4} more</span>
                        )}
                      </div>
                      {(p.hourlyRate !== null || p.perMileRate !== null) && (
                        <div className="text-sm text-gray-800 mb-2">{p.hourlyRate !== null ? `$${p.hourlyRate}/hr` : `$${p.perMileRate?.toFixed(2)}/mi`}</div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
            {/* Pagination controls */}
            {(activeTab === 'caregivers') && (
              <div className="mt-6 flex items-center justify-between">
                <button disabled={cgPage <= 1} onClick={() => setCgPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-md border disabled:opacity-50">Previous</button>
                <div className="text-sm text-gray-600">Page {cgPage} {cgTotal ? `of ${Math.max(1, Math.ceil(cgTotal / 20))}` : ''}</div>
                <button disabled={cgTotal !== 0 && cgPage >= Math.ceil(cgTotal / 20)} onClick={() => setCgPage((p) => p + 1)} className="px-3 py-2 rounded-md border disabled:opacity-50">Next</button>
              </div>
            )}
            {(activeTab === 'jobs') && (
              <div className="mt-6 flex items-center justify-between">
                <button disabled={jobPage <= 1} onClick={() => setJobPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-md border disabled:opacity-50">Previous</button>
                <div className="text-sm text-gray-600">Page {jobPage} {jobTotal ? `of ${Math.max(1, Math.ceil(jobTotal / 20))}` : ''}</div>
                <button disabled={jobTotal !== 0 && jobPage >= Math.ceil(jobTotal / 20)} onClick={() => setJobPage((p) => p + 1)} className="px-3 py-2 rounded-md border disabled:opacity-50">Next</button>
              </div>
            )}
            {(activeTab === 'providers') && (
              <div className="mt-6 flex items-center justify-between">
                <button disabled={providerPage <= 1} onClick={() => setProviderPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-md border disabled:opacity-50">Previous</button>
                <div className="text-sm text-gray-600">Page {providerPage} {providerTotal ? `of ${Math.max(1, Math.ceil(providerTotal / 20))}` : ''}</div>
                <button disabled={providerTotal !== 0 && providerPage >= Math.ceil(providerTotal / 20)} onClick={() => setProviderPage((p) => p + 1)} className="px-3 py-2 rounded-md border disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
