"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiLoader } from "react-icons/fi";

type Slot = {
  id: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  isAvailable: boolean;
  availableFor: string[];
  homeId?: string | null;
};

function formatDateTimeLocal(iso: string) {
  // Return value for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function startOfNextWeekday(weekday: number) {
  // weekday: 0=Sunday .. 6=Saturday (match JS)
  const now = new Date();
  const d = new Date(now);
  d.setHours(9, 0, 0, 0); // default 9:00
  const diff = (7 + weekday - d.getDay()) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}

export default function AvailabilitySettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState<{ type: "" | "success" | "error"; text: string }>({ type: "", text: "" });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ startTime: string; endTime: string }>({ startTime: "", endTime: "" });

  // New slot form
  const [weekday, setWeekday] = useState<number>(1); // 1=Mon default
  const [startTimeLocal, setStartTimeLocal] = useState<string>(() => formatDateTimeLocal(startOfNextWeekday(1).toISOString()));
  const [endTimeLocal, setEndTimeLocal] = useState<string>(() => {
    const s = startOfNextWeekday(1);
    const e = new Date(s);
    e.setHours(e.getHours() + 8);
    return formatDateTimeLocal(e.toISOString());
  });
  const [repeatWeeks, setRepeatWeeks] = useState<number>(7);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/availability");
    }
  }, [status, router]);

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/caregiver/availability", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSlots(data.slots || []);
      } else {
        throw new Error(data.error || "Failed to load availability");
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to load availability" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSlots();
    }
  }, [status, fetchSlots]);

  const grouped = useMemo(() => {
    const byDay: Record<string, Slot[]> = {};
    for (const s of slots) {
      const d = new Date(s.startTime);
      const key = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
      (byDay[key] ||= []).push(s);
    }
    return byDay;
  }, [slots]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreating(true);
      const body = {
        startTime: new Date(startTimeLocal).toISOString(),
        endTime: new Date(endTimeLocal).toISOString(),
        repeatWeeks: Math.max(0, Math.min(52, repeatWeeks | 0)),
      };
      // basic client-side validation
      if (new Date(body.endTime) <= new Date(body.startTime)) {
        setMessage({ type: "error", text: "End time must be after start time" });
        setCreating(false);
        return;
      }
      const res = await fetch("/api/caregiver/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create availability");
      setMessage({ type: "success", text: "Availability saved" });
      fetchSlots();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to create availability" });
    } finally {
      setCreating(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  }

  function beginEdit(s: Slot) {
    setEditingId(s.id);
    setEditValues({ startTime: formatDateTimeLocal(s.startTime), endTime: formatDateTimeLocal(s.endTime) });
  }

  async function saveEdit(id: string) {
    try {
      const body = {
        startTime: new Date(editValues.startTime).toISOString(),
        endTime: new Date(editValues.endTime).toISOString(),
      };
      if (new Date(body.endTime) <= new Date(body.startTime)) {
        setMessage({ type: "error", text: "End time must be after start time" });
        return;
      }
      const res = await fetch(`/api/caregiver/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update");
      setMessage({ type: "success", text: "Availability updated" });
      setEditingId(null);
      fetchSlots();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to update" });
    } finally {
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this availability slot?")) return;
    try {
      const res = await fetch(`/api/caregiver/availability/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      setMessage({ type: "success", text: "Deleted" });
      fetchSlots();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to delete" });
    } finally {
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  }

  // Keep new slot start/end aligned when weekday changes
  useEffect(() => {
    const s = startOfNextWeekday(weekday);
    const e = new Date(s);
    e.setHours(e.getHours() + 8);
    setStartTimeLocal(formatDateTimeLocal(s.toISOString()));
    setEndTimeLocal(formatDateTimeLocal(e.toISOString()));
  }, [weekday]);

  return (
    <DashboardLayout title="Availability">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2">Availability</h1>
        <p className="text-gray-600 mb-6">Set the days and times youâ€™re available to work. You can add weekly hours and optionally repeat them for multiple weeks.</p>

        {message.type && (
          <div className={`mb-4 rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Add form */}
        <div className="border rounded-md p-4 mb-8">
          <h2 className="font-medium mb-3">Add availability</h2>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Weekday</span>
              <select value={weekday} onChange={(e) => setWeekday(parseInt(e.target.value))} className="border rounded-md px-3 py-2">
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Start</span>
              <input type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} className="border rounded-md px-3 py-2"/>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">End</span>
              <input type="datetime-local" value={endTimeLocal} onChange={(e) => setEndTimeLocal(e.target.value)} className="border rounded-md px-3 py-2"/>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Repeat weekly (weeks)</span>
              <input type="number" min={0} max={52} value={repeatWeeks} onChange={(e) => setRepeatWeeks(parseInt(e.target.value || "0"))} className="border rounded-md px-3 py-2"/>
            </label>
            <div className="md:col-span-2">
              <button disabled={creating} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-60">
                {creating ? <FiLoader className="animate-spin"/> : <FiPlus/>}
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Existing slots */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-gray-500">Loadingâ€¦</div>
          ) : slots.length === 0 ? (
            <div className="text-gray-600">No availability yet. Add your first slot above.</div>
          ) : (
            Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <h3 className="font-medium mb-2">{day}</h3>
                <div className="divide-y border rounded-md">
                  {items.map((s) => {
                    const isEditing = editingId === s.id;
                    return (
                      <div key={s.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3">
                        {isEditing ? (
                          <div className="flex-1 grid gap-3 md:grid-cols-2">
                            <input type="datetime-local" value={editValues.startTime} onChange={(e) => setEditValues((v) => ({ ...v, startTime: e.target.value }))} className="border rounded-md px-3 py-2"/>
                            <input type="datetime-local" value={editValues.endTime} onChange={(e) => setEditValues((v) => ({ ...v, endTime: e.target.value }))} className="border rounded-md px-3 py-2"/>
                          </div>
                        ) : (
                          <div className="flex-1 text-sm text-gray-800">
                            <div>
                              <span className="font-medium">{new Date(s.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                              <span className="mx-2 text-gray-500">â€“</span>
                              <span className="font-medium">{new Date(s.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(s.id)} className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm"><FiSave/> Save</button>
                              <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm"><FiX/> Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => beginEdit(s)} className="inline-flex items-center gap-1 bg-white border px-3 py-2 rounded-md text-sm"><FiEdit2/> Edit</button>
                              <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 bg-white border px-3 py-2 rounded-md text-sm text-red-600"><FiTrash2/> Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}