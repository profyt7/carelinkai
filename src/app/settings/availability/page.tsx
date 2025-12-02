"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";

type TimeRange = { start: string; end: string };
type Weekly = { [k in "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"]: TimeRange[] };

const dayOrder: Array<keyof Weekly> = ["mon","tue","wed","thu","fri","sat","sun"];
const dayLabel: Record<keyof Weekly, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default function AvailabilitySettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = String(session?.user?.role || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [weekly, setWeekly] = useState<Weekly>({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

  const isCaregiver = role === "CAREGIVER";

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/caregiver/availability", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load availability");
      const data = await res.json();
      const a = data?.availability || {};
      setTimezone(a.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      setWeekly({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [], ...(a.weekly || {}) });
    } catch (e: any) {
      setError(e?.message || "Error loading availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && isCaregiver) {
      fetchAvailability();
    }
  }, [status, isCaregiver, fetchAvailability, router]);

  const addBlock = (day: keyof Weekly) => {
    setWeekly((prev) => ({ ...prev, [day]: [...prev[day], { start: "09:00", end: "17:00" }] }));
  };
  const removeBlock = (day: keyof Weekly, idx: number) => {
    setWeekly((prev) => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }));
  };
  const updateBlock = (day: keyof Weekly, idx: number, field: keyof TimeRange, value: string) => {
    setWeekly((prev) => ({
      ...prev,
      [day]: prev[day].map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }));
  };
  const quickWeekday95 = () => {
    setWeekly({
      mon: [{ start: "09:00", end: "17:00" }],
      tue: [{ start: "09:00", end: "17:00" }],
      wed: [{ start: "09:00", end: "17:00" }],
      thu: [{ start: "09:00", end: "17:00" }],
      fri: [{ start: "09:00", end: "17:00" }],
      sat: [],
      sun: [],
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/caregiver/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, weekly }),
      });
      if (!res.ok) throw new Error("Failed to save availability");
      setSuccess("Saved");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 1500);
    }
  };

  if (!isCaregiver) {
    return (
      <DashboardLayout title="Availability" showSearch={false}>
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <p className="text-neutral-600">Availability is only available for caregiver accounts.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Availability" showSearch={false}>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Availability</h1>
        <p className="mt-1 text-neutral-600">Set the days and times you are generally available. Operators can see this when browsing caregivers.</p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700">Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button onClick={quickWeekday95} className="px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-800 hover:bg-neutral-200">Weekdays 9–5</button>
          <button onClick={() => setWeekly({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })} className="px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-800 hover:bg-neutral-200">Clear all</button>
        </div>

        <div className="mt-6 space-y-6">
          {dayOrder.map((dayKey) => (
            <div key={dayKey} className="border border-neutral-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-900">{dayLabel[dayKey]}</h3>
                <button onClick={() => addBlock(dayKey)} className="text-sm px-2 py-1 rounded-md bg-primary-600 text-white hover:bg-primary-700">Add block</button>
              </div>
              {weekly[dayKey].length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No availability on this day.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {weekly[dayKey].map((block, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <label className="text-sm text-neutral-700">Start</label>
                      <input
                        type="time"
                        value={block.start}
                        onChange={(e) => updateBlock(dayKey, idx, "start", e.target.value)}
                        className="rounded-md border border-neutral-300 px-2 py-1"
                      />
                      <label className="text-sm text-neutral-700">End</label>
                      <input
                        type="time"
                        value={block.end}
                        onChange={(e) => updateBlock(dayKey, idx, "end", e.target.value)}
                        className="rounded-md border border-neutral-300 px-2 py-1"
                      />
                      <button onClick={() => removeBlock(dayKey, idx)} className="ml-auto text-sm text-red-600 hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
          {success && <span className="text-sm text-green-700">{success}</span>}
        </div>

      </div>
    </DashboardLayout>
  );
}
