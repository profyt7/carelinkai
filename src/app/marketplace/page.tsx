"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CaregiverCard from "@/components/marketplace/CaregiverCard";
import Image from "next/image";

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
};

export default function MarketplacePage() {
  const { data: session } = useSession();

  // Include "providers" as a valid tab option
  const [activeTab, setActiveTab] = useState<"jobs" | "caregivers" | "providers">(
    "caregivers"
  );
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);

  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [caregiversLoading, setCaregiversLoading] = useState(false);

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

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
  };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  useEffect(() => {
    // Load SPECIALTY categories for filters
    const loadSpecialties = async () => {
      try {
        const res = await fetch("/api/marketplace/categories");
        const json = await res.json();
        const data = json?.data || {};
        const names = (data.SPECIALTY || []).map((c: any) => c.slug);
        setAllSpecialties(names);
      } catch (e) {
        setAllSpecialties([]);
      }
    };
    loadSpecialties();
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
        const res = await fetch(`/api/marketplace/caregivers?${params.toString()}`);
        const json = await res.json();
        setCaregivers(json?.data ?? []);
      } catch (e) {
        setCaregivers([]);
      } finally {
        setCaregiversLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state, specialties]);

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
        const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
        const json = await res.json();
        setListings(json?.data ?? []);
      } catch (e) {
        setListings([]);
      } finally {
        setListingsLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state, specialties]);

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
        const res = await fetch(`/api/marketplace/providers?${params.toString()}`);
        const json = await res.json();
        setProviders(json?.data ?? []);
      } catch (e) {
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };
    run();
  }, [activeTab, search, city, state]);

  const toggleSpecialty = (slug: string) => {
    setSpecialties((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

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
                {t === "caregivers" ? "Caregivers" : t === "jobs" ? "Jobs" : "Providers"}
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
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {allSpecialties.slice(0, 10).map((sp) => (
                  <label key={sp} className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input type="checkbox" checked={specialties.includes(sp)} onChange={() => toggleSpecialty(sp)} />
                    <span>{sp.replace(/-/g, " ")}</span>
                  </label>
                ))}
              </div>
              <button onClick={() => { setSearch(""); setCity(""); setState(""); setSpecialties([]); }} className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200">Clear Filters</button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Mobile filters */}
            <div className="mb-6 rounded-md border border-gray-200 bg-white p-3 md:hidden">
              <div className="grid grid-cols-1 gap-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <div className="flex items-center gap-2 overflow-x-auto">
                  {allSpecialties.slice(0, 6).map((sp) => (
                    <label key={sp} className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input type="checkbox" checked={specialties.includes(sp)} onChange={() => toggleSpecialty(sp)} />
                      <span>{sp.replace(/-/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Caregivers CTA */}
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
              listingsLoading ? (
                <div className="py-20 text-center text-gray-500">Loading jobs…</div>
              ) : listings.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No jobs found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {listings.map((job) => (
                    <div key={job.id} className="bg-white border rounded-md p-4">
                      <div className="flex items-start mb-2">
                        <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                          <Image src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.title)}&background=random&size=128`} alt={job.title} width={48} height={48} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <div className="text-sm text-gray-600">{[job.city, job.state].filter(Boolean).join(", ") || "Location"}</div>
                        </div>
                      </div>
                      {(job.hourlyRateMin || job.hourlyRateMax) && (
                        <div className="text-sm text-gray-800 mb-2">
                          {job.hourlyRateMin && job.hourlyRateMax ? `$${job.hourlyRateMin} - $${job.hourlyRateMax}/hr` : job.hourlyRateMin ? `From $${job.hourlyRateMin}/hr` : `Up to $${job.hourlyRateMax}/hr`}
                        </div>
                      )}
                      <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                    </div>
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
                          <div className="text-sm text-gray-600">{[p.city, p.state].filter(Boolean).join(", ")}</div>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
