"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiCalendar, FiUser, FiPlus, FiCheckCircle, FiXCircle, FiClock,
  FiTrash2, FiAlertCircle, FiRefreshCw,
} from "react-icons/fi";

// ── Types ────────────────────────────────────────────────────────────────────

interface CaregiverUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface Caregiver {
  id: string;
  user: CaregiverUser;
}

interface HouseholdShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
}

interface Hire {
  id: string;
  listing: { id: string; title: string };
  caregiver: Caregiver;
  householdShifts: HouseholdShift[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: HouseholdShift["status"]) {
  const map = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {status === "SCHEDULED" && <FiClock size={11} />}
      {status === "COMPLETED" && <FiCheckCircle size={11} />}
      {status === "CANCELLED" && <FiXCircle size={11} />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HouseholdPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  // Redirect non-FAMILY users
  useEffect(() => {
    if (authStatus === "authenticated" && role && role !== "FAMILY") {
      router.replace("/dashboard");
    }
  }, [authStatus, role, router]);

  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule form state
  const [selectedHireId, setSelectedHireId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchHires = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/family/household", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load household data");
      const data = await res.json();
      setHires(data.hires ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") fetchHires();
  }, [authStatus, fetchHires]);

  // ── Schedule a shift ────────────────────────────────────────────────────────

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedHireId) return setFormError("Please select a caregiver.");
    if (!startDate || !endDate) return setFormError("Start and end time are required.");
    if (new Date(endDate) <= new Date(startDate)) return setFormError("End time must be after start time.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/family/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hireId: selectedHireId,
          scheduledStart: new Date(startDate).toISOString(),
          scheduledEnd: new Date(endDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to schedule shift");
      }
      setFormSuccess("Shift scheduled!");
      setSelectedHireId("");
      setStartDate("");
      setEndDate("");
      setNotes("");
      await fetchHires();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Update shift status ─────────────────────────────────────────────────────

  async function updateStatus(shiftId: string, status: HouseholdShift["status"]) {
    try {
      const res = await fetch(`/api/family/household/shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update shift");
      await fetchHires();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Delete shift ────────────────────────────────────────────────────────────

  async function deleteShift(shiftId: string) {
    if (!confirm("Delete this shift permanently?")) return;
    try {
      const res = await fetch(`/api/family/household/shifts/${shiftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete shift");
      await fetchHires();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const allShifts = hires.flatMap((h) =>
    h.householdShifts.map((s) => ({ ...s, hire: h }))
  ).sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());

  return (
    <DashboardLayout title="My Household">
      <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">

        {/* ── Care Team ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <FiUser className="text-primary-500" /> Care Team
          </h2>
          {loading && (
            <div className="flex items-center gap-2 text-neutral-500">
              <FiRefreshCw className="animate-spin" size={16} /> Loading…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          {!loading && !error && hires.length === 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center text-neutral-500">
              <p className="mb-2">No caregivers hired yet.</p>
              <a href="/marketplace" className="text-primary-600 font-medium hover:underline">Browse the marketplace →</a>
            </div>
          )}
          {hires.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hires.map((hire) => {
                const cg = hire.caregiver;
                const name = [cg.user.firstName, cg.user.lastName].filter(Boolean).join(" ") || "Caregiver";
                const upcoming = hire.householdShifts.filter((s) => s.status === "SCHEDULED").length;
                return (
                  <div key={hire.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    {cg.user.profileImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cg.user.profileImageUrl} alt={name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <FiUser className="text-primary-600" size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{name}</p>
                      <p className="text-xs text-neutral-500 truncate">{hire.listing.title}</p>
                      <p className="text-xs text-neutral-400 mt-1">{upcoming} upcoming shift{upcoming !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Schedule a Shift ──────────────────────────────────────────── */}
        {hires.length > 0 && (
          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <FiPlus className="text-primary-500" /> Schedule a Shift
            </h2>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Caregiver</label>
                  <select
                    value={selectedHireId}
                    onChange={(e) => setSelectedHireId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select caregiver…</option>
                    {hires.map((h) => {
                      const cg = h.caregiver;
                      const name = [cg.user.firstName, cg.user.lastName].filter(Boolean).join(" ") || "Caregiver";
                      return <option key={h.id} value={h.id}>{name} — {h.listing.title}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Morning routine, medication reminder"
                    maxLength={500}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 flex items-center gap-1"><FiAlertCircle size={14} /> {formError}</p>
              )}
              {formSuccess && (
                <p className="text-sm text-green-600 flex items-center gap-1"><FiCheckCircle size={14} /> {formSuccess}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Scheduling…" : "Schedule Shift"}
              </button>
            </form>
          </section>
        )}

        {/* ── Shift History ─────────────────────────────────────────────── */}
        {allShifts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <FiCalendar className="text-primary-500" /> Shifts
            </h2>
            <div className="space-y-3">
              {allShifts.map((shift) => {
                const cg = shift.hire.caregiver;
                const name = [cg.user.firstName, cg.user.lastName].filter(Boolean).join(" ") || "Caregiver";
                return (
                  <div key={shift.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-neutral-900 text-sm truncate">{name}</p>
                        {statusBadge(shift.status)}
                      </div>
                      <p className="text-xs text-neutral-500">{fmt(shift.scheduledStart)} → {fmt(shift.scheduledEnd)}</p>
                      {shift.notes && <p className="text-xs text-neutral-400 mt-0.5 truncate">{shift.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {shift.status === "SCHEDULED" && (
                        <>
                          <button
                            onClick={() => updateStatus(shift.id, "COMPLETED")}
                            className="text-xs text-green-700 border border-green-300 bg-green-50 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => updateStatus(shift.id, "CANCELLED")}
                            className="text-xs text-red-700 border border-red-300 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteShift(shift.id)}
                        className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                        title="Delete shift"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
