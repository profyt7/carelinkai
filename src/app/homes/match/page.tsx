"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiSearch, FiAlertTriangle, FiMapPin, FiDollarSign } from "react-icons/fi";

type MatchItem = {
  id: string;
  name: string;
  description?: string;
  careLevel?: string[];
  capacity?: number;
  genderRestriction?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  address?: string | null;
  photos?: { url?: string }[] | null;
  scores: {
    structured: number;
    semantic: number;
    combined: number;
  };
};

type ResidentProfile = {
  age?: number;
  gender?: string;
  careLevelNeeded?: string[];
  memoryImpairment?: number;
  diabetesCare?: boolean;
  incontinenceCare?: boolean;
  budget?: { min?: number; max?: number };
  preferredLocation?: { zipCode?: string };
};

export default function ResidentMatchPage() {
  const [profile, setProfile] = useState<ResidentProfile>({
    careLevelNeeded: [],
    budget: { min: undefined, max: undefined },
    preferredLocation: { zipCode: undefined },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MatchItem[] | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (name.startsWith("budget.")) {
      const key = name.split(".")[1] as "min" | "max";
      setProfile((p) => ({
        ...p,
        budget: { ...(p.budget || {}), [key]: value ? Number(value) : undefined },
      }));
    } else if (name === "preferredLocation.zipCode") {
      setProfile((p) => ({
        ...p,
        preferredLocation: { ...(p.preferredLocation || {}), zipCode: value },
      }));
    } else if (type === "checkbox") {
      setProfile((p) => ({ ...p, [name]: checked } as ResidentProfile));
    } else if (type === "number" || name === "gender") {
      setProfile((p) => ({
        ...p,
        [name]: type === "number" ? (value ? Number(value) : undefined) : value,
      } as ResidentProfile));
    }
  };

  const toggleCareLevel = (level: string) => {
    setProfile((p) => {
      const list = new Set(p.careLevelNeeded || []);
      if (list.has(level)) list.delete(level);
      else list.add(level);
      return { ...p, careLevelNeeded: Array.from(list) };
    });
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetch("/api/ai/match/resident?limit=10&semanticWeight=0.3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to use AI Matching.");
          return;
        }
        if (res.status === 403) {
          setError("Your account role is not permitted to use AI Matching.");
          return;
        }
        const t = await res.text();
        throw new Error(t || `Request failed with ${res.status}`);
      }
      const data = await res.json();
      setItems((data?.items || []) as MatchItem[]);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch matches. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n?: number | null) =>
    typeof n === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(n)
      : null;

  return (
    <DashboardLayout title="AI Resident Matching" showSearch={false}>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <form onSubmit={search} className="bg-white border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FiSearch className="text-primary-600" />
                <h2 className="text-lg font-semibold">Resident Profile</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-700">Age</label>
                  <input
                    type="number"
                    name="age"
                    min={1}
                    className="form-input w-full"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-700">Gender</label>
                  <select name="gender" className="form-select w-full" onChange={handleChange}>
                    <option value="">Any</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Care Level Needed</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: "INDEPENDENT", label: "Independent" },
                    { id: "ASSISTED", label: "Assisted" },
                    { id: "MEMORY_CARE", label: "Memory Care" },
                    { id: "SKILLED_NURSING", label: "Skilled Nursing" },
                  ].map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(profile.careLevelNeeded || []).includes(c.id)}
                        onChange={() => toggleCareLevel(c.id)}
                        className="form-checkbox h-4 w-4"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Memory Impairment (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    name="memoryImpairment"
                    className="form-input w-full"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm">Budget Max</label>
                  <input
                    type="number"
                    min={0}
                    name="budget.max"
                    className="form-input w-full"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="diabetesCare" className="form-checkbox" onChange={handleChange} />
                  Diabetes Care
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="incontinenceCare" className="form-checkbox" onChange={handleChange} />
                  Incontinence Care
                </label>
              </div>

              <div>
                <label className="text-sm">Preferred ZIP</label>
                <input
                  type="text"
                  name="preferredLocation.zipCode"
                  className="form-input w-full"
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary-600 hover:bg-primary-700 text-white font-medium py-2"
              >
                {loading ? "Finding Matches..." : "Find Matches"}
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                  <FiAlertTriangle className="mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </form>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {items === null && !loading && !error && (
              <div className="bg-neutral-50 border border-dashed rounded-lg p-8 text-center text-neutral-600">
                Submit the profile to see AI-matched homes.
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
              </div>
            )}

            {items && items.length === 0 && !loading && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
                No matches found. Try adjusting the profile.
              </div>
            )}

            {items && items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-white border rounded-lg p-4 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{item.name}</h3>
                        {item.address && (
                          <div className="text-sm text-neutral-600 flex items-center">
                            <FiMapPin className="mr-1" />
                            <span>{item.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-500">AI Match</div>
                        <div className="text-lg font-bold text-primary-700">
                          {Math.round(item.scores.combined)}%
                        </div>
                      </div>
                    </div>

                    {(item.priceMin || item.priceMax) && (
                      <div className="mt-2 text-sm text-neutral-800 flex items-center">
                        <FiDollarSign className="mr-1" />
                        {formatCurrency(item.priceMin)}
                        {item.priceMax ? ` - ${formatCurrency(item.priceMax)}` : ""}
                        {" "}per month
                      </div>
                    )}

                    {item.description && (
                      <p className="mt-2 text-sm text-neutral-700 line-clamp-3">{item.description}</p>
                    )}

                    <a
                      href={`/homes/${item.id}`}
                      className="mt-4 inline-flex justify-center rounded-md bg-primary-600 hover:bg-primary-700 text-white font-medium py-2"
                    >
                      View Home
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
