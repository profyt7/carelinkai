"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import toast from "react-hot-toast";
import { FiSave } from "react-icons/fi";

const RIDE_TYPE_OPTIONS = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "wheelchair_van", label: "Wheelchair Van" },
  { value: "stretcher", label: "Stretcher Transport" },
];

const SERVICE_TYPE_OPTIONS = [
  { value: "home-care", label: "Home Care" },
  { value: "personal-care", label: "Personal Care" },
  { value: "companionship", label: "Companionship" },
  { value: "skilled-nursing", label: "Skilled Nursing" },
  { value: "transportation", label: "Transportation / NEMT" },
  { value: "hospice", label: "Hospice Support" },
  { value: "memory-care", label: "Memory Care" },
  { value: "adult-day", label: "Adult Day Services" },
];

type ProviderForm = {
  businessName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  bio: string;
  website: string;
  licenseNumber: string;
  yearsInBusiness: string;
  serviceTypes: string[];
  // Transport fields
  rideTypes: string[];
  wheelchairAccessible: boolean;
  acceptsMedicaid: boolean;
  serviceRadius: string;
  allowsRecurring: boolean;
  // Pricing / instant booking
  rateBaseFare: string;
  ratePerMile: string;
  rateWaitPerHour: string;
  instantBook: boolean;
  vehicleCapacity: string;
};

export default function ProviderSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProviderForm>({
    businessName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    bio: "",
    website: "",
    licenseNumber: "",
    yearsInBusiness: "",
    serviceTypes: [],
    rideTypes: [],
    wheelchairAccessible: false,
    acceptsMedicaid: false,
    serviceRadius: "",
    allowsRecurring: false,
    rateBaseFare: "",
    ratePerMile: "",
    rateWaitPerHour: "",
    instantBook: false,
    vehicleCapacity: "4",
  });

  const isTransport = form.serviceTypes.includes("transportation");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "PROVIDER" && session?.user?.role !== "ADMIN") {
      router.push("/settings");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.provider || {};
          setForm({
            businessName: p.businessName || "",
            contactName: p.contactName || "",
            contactPhone: p.contactPhone || "",
            contactEmail: p.contactEmail || "",
            bio: p.bio || "",
            website: p.website || "",
            licenseNumber: p.licenseNumber || "",
            yearsInBusiness: p.yearsInBusiness != null ? String(p.yearsInBusiness) : "",
            serviceTypes: p.serviceTypes || [],
            rideTypes: p.rideTypes || [],
            wheelchairAccessible: p.wheelchairAccessible || false,
            acceptsMedicaid: p.acceptsMedicaid || false,
            serviceRadius: p.serviceRadius != null ? String(p.serviceRadius) : "",
            allowsRecurring: p.allowsRecurring || false,
            rateBaseFare: p.rateBaseFare != null ? String(p.rateBaseFare) : "",
            ratePerMile: p.ratePerMile != null ? String(p.ratePerMile) : "",
            rateWaitPerHour: p.rateWaitPerHour != null ? String(p.rateWaitPerHour) : "",
            instantBook: p.instantBook || false,
            vehicleCapacity: p.vehicleCapacity != null ? String(p.vehicleCapacity) : "4",
          });
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") load();
  }, [status, session, router]);

  const toggleArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        businessName: form.businessName,
        contactName: form.contactName,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        bio: form.bio || null,
        website: form.website || null,
        licenseNumber: form.licenseNumber || null,
        yearsInBusiness: form.yearsInBusiness ? parseInt(form.yearsInBusiness) : null,
        serviceTypes: form.serviceTypes,
        rideTypes: form.rideTypes,
        wheelchairAccessible: form.wheelchairAccessible,
        acceptsMedicaid: form.acceptsMedicaid,
        serviceRadius: form.serviceRadius ? parseInt(form.serviceRadius) : null,
        allowsRecurring: form.allowsRecurring,
        rateBaseFare: form.rateBaseFare ? parseFloat(form.rateBaseFare) : null,
        ratePerMile: form.ratePerMile ? parseFloat(form.ratePerMile) : null,
        rateWaitPerHour: form.rateWaitPerHour ? parseFloat(form.rateWaitPerHour) : null,
        instantBook: form.instantBook,
        vehicleCapacity: form.vehicleCapacity ? parseInt(form.vehicleCapacity) : 4,
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Profile saved");
      } else {
        const err = await res.json();
        toast.error(err.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout title="Provider Profile">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Provider Profile">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Provider Profile</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Update your business information and service capabilities shown in the marketplace.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Info */}
          <section className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-800">Business Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">License Number</label>
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Years in Business</label>
                <input
                  type="number"
                  min="0"
                  value={form.yearsInBusiness}
                  onChange={(e) => setForm((p) => ({ ...p, yearsInBusiness: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bio / Description</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Describe your organization and care philosophy..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </section>

          {/* Service Types */}
          <section className="bg-white rounded-lg border border-neutral-200 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-neutral-800">Services Offered</h2>
            <p className="text-sm text-neutral-500">Select all service types your organization provides.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICE_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.serviceTypes.includes(opt.value)}
                    onChange={() => setForm((p) => ({ ...p, serviceTypes: toggleArray(p.serviceTypes, opt.value) }))}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Transport Fields — only shown when transportation is selected */}
          {isTransport && (
            <section className="bg-primary-50 rounded-lg border border-primary-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-primary-900">Transportation Capabilities</h2>
              <p className="text-sm text-primary-700">
                These details appear on your marketplace profile and help families find the right fit.
              </p>

              {/* Ride Types */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Vehicle / Ride Types</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RIDE_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.rideTypes.includes(opt.value)}
                        onChange={() => setForm((p) => ({ ...p, rideTypes: toggleArray(p.rideTypes, opt.value) }))}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Accessibility & Insurance */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.wheelchairAccessible}
                    onChange={(e) => setForm((p) => ({ ...p, wheelchairAccessible: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium">Wheelchair Accessible Vehicles</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptsMedicaid}
                    onChange={(e) => setForm((p) => ({ ...p, acceptsMedicaid: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium">Accepts Medicaid / Medicaid Waiver</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowsRecurring}
                    onChange={(e) => setForm((p) => ({ ...p, allowsRecurring: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium">Accepts Recurring Ride Schedules</span>
                </label>
              </div>

              {/* Service Radius */}
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Radius (miles)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={form.serviceRadius}
                  onChange={(e) => setForm((p) => ({ ...p, serviceRadius: e.target.value }))}
                  placeholder="e.g., 25"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Pricing & Instant Booking */}
              <div className="border-t border-primary-200 pt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-primary-900 mb-1">Vehicle & Capacity</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-40">
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Max Passengers</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={form.vehicleCapacity}
                        onChange={(e) => setForm((p) => ({ ...p, vehicleCapacity: e.target.value }))}
                        placeholder="4"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <p className="text-xs text-neutral-400 mt-1">Per vehicle run</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-900 mb-1">Instant Booking Pricing</h3>
                  <p className="text-xs text-primary-700 mb-3">
                    Set your rates so families can see the fare upfront and pay at booking — no back-and-forth required.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Base Fare ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.rateBaseFare}
                        onChange={(e) => setForm((p) => ({ ...p, rateBaseFare: e.target.value }))}
                        placeholder="e.g., 15.00"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <p className="text-xs text-neutral-400 mt-1">Flat charge per ride</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Per Mile Rate ($/mi)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.ratePerMile}
                        onChange={(e) => setForm((p) => ({ ...p, ratePerMile: e.target.value }))}
                        placeholder="e.g., 2.50"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <p className="text-xs text-neutral-400 mt-1">Added to base fare</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Wait Rate ($/hr)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.rateWaitPerHour}
                        onChange={(e) => setForm((p) => ({ ...p, rateWaitPerHour: e.target.value }))}
                        placeholder="e.g., 18.00"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <p className="text-xs text-neutral-400 mt-1">While waiting at appointment</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.instantBook}
                    onChange={(e) => setForm((p) => ({ ...p, instantBook: e.target.checked }))}
                    className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="text-sm font-medium text-neutral-800">Enable Instant Booking</span>
                    <span className="block text-xs text-neutral-500 mt-0.5">
                      Families can pay at the time of booking. You'll receive confirmed, paid rides — no confirmation step required. Requires base fare and per-mile rate above.
                    </span>
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              <FiSave className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
