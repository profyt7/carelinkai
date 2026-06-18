"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isHouseholdEmployerLaneEnabled } from "@/lib/feature-flags";
import { format, parseISO } from "date-fns";
import {
  FiCheckCircle, FiCalendar, FiBriefcase, FiUser, FiPlus,
  FiClock, FiXCircle, FiTrash2, FiAlertCircle, FiChevronDown,
  FiChevronUp, FiRefreshCw,
} from "react-icons/fi";

// ── Caregiver‑side types (from /api/marketplace/hires) ──────────────────────

type CaregiverHire = {
  id: string;
  status: string;
  createdAt: string;
  position?: string | null;
  hourlyRate?: number | null;
  caregiver?: { id: string; name?: string; photoUrl?: string | null } | null;
  listing?: { id: string; title: string } | null;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    home?: { id: string; name: string } | null;
  } | null;
  payment?: { id: string; status: string } | null;
};

const CAREGIVER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success-100 text-success-800",
  COMPLETED: "bg-primary-100 text-primary-800",
  CANCELLED: "bg-error-100 text-error-800",
  PENDING: "bg-amber-100 text-amber-800",
};

// ── Family‑side types (from /api/family/household) ──────────────────────────

interface FamilyUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface HouseholdShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
}

interface FamilyHire {
  id: string;
  listing: { id: string; title: string };
  caregiver: { id: string; user: FamilyUser };
  householdShifts: HouseholdShift[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtShift(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function ShiftBadge({ status }: { status: HouseholdShift["status"] }) {
  const cls = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }[status];
  const Icon = status === "SCHEDULED" ? FiClock : status === "COMPLETED" ? FiCheckCircle : FiXCircle;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Icon size={11} />{status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Family hire card with inline shift management ────────────────────────────

function FamilyHireCard({
  hire,
  onRefresh,
}: {
  hire: FamilyHire;
  onRefresh: () => void;
}) {
  const cg = hire.caregiver;
  const name = [cg.user.firstName, cg.user.lastName].filter(Boolean).join(" ") || "Caregiver";
  const upcoming = hire.householdShifts.filter((s) => s.status === "SCHEDULED").length;

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function scheduleShift(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!startDate || !endDate) return setFormError("Start and end time required.");
    if (new Date(endDate) <= new Date(startDate)) return setFormError("End must be after start.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/family/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hireId: hire.id,
          scheduledStart: new Date(startDate).toISOString(),
          scheduledEnd: new Date(endDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to schedule shift");
      }
      setStartDate(""); setEndDate(""); setNotes("");
      onRefresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(shiftId: string, status: HouseholdShift["status"]) {
    await fetch(`/api/family/household/shifts/${shiftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  }

  async function deleteShift(shiftId: string) {
    if (!confirm("Delete this shift permanently?")) return;
    await fetch(`/api/family/household/shifts/${shiftId}`, { method: "DELETE" });
    onRefresh();
  }

  const sorted = [...hire.householdShifts].sort(
    (a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-5 flex items-start gap-4">
        {cg.user.profileImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cg.user.profileImageUrl} alt={name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <FiUser className="text-primary-600" size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900">{name}</p>
          <Link
            href={`/marketplace/listings/${hire.listing.id}`}
            className="text-sm text-primary-600 hover:underline truncate block"
          >
            <FiBriefcase size={12} className="inline mr-1" />
            {hire.listing.title}
          </Link>
          <p className="text-xs text-neutral-400 mt-0.5">
            {upcoming} upcoming shift{upcoming !== 1 ? "s" : ""}
            {hire.householdShifts.length > upcoming && ` · ${hire.householdShifts.length - upcoming} past`}
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 border border-primary-200 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
        >
          {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          {open ? "Hide" : "Manage Shifts"}
        </button>
      </div>

      {/* Expandable shift panel */}
      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50 p-5 space-y-5">
          {/* Schedule form */}
          <form onSubmit={scheduleShift} className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
              <FiPlus size={12} /> Schedule a Shift
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Start</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">End</label>
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-neutral-500 mb-1">Notes (optional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning routine, medication reminder"
                  maxLength={500}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
            {formError && (
              <p className="text-xs text-red-600 flex items-center gap-1"><FiAlertCircle size={12} /> {formError}</p>
            )}
            <button type="submit" disabled={submitting}
              className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {submitting ? "Scheduling…" : "Schedule Shift"}
            </button>
          </form>

          {/* Shift history */}
          {sorted.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Shifts</p>
              {sorted.map((shift) => (
                <div key={shift.id}
                  className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <ShiftBadge status={shift.status} />
                    </div>
                    <p className="text-xs text-neutral-500">
                      {fmtShift(shift.scheduledStart)} → {fmtShift(shift.scheduledEnd)}
                    </p>
                    {shift.notes && <p className="text-xs text-neutral-400 truncate mt-0.5">{shift.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {shift.status === "SCHEDULED" && (
                      <>
                        <button onClick={() => updateStatus(shift.id, "COMPLETED")}
                          className="text-xs text-green-700 border border-green-200 bg-green-50 px-2 py-0.5 rounded hover:bg-green-100 transition-colors">
                          Complete
                        </button>
                        <button onClick={() => updateStatus(shift.id, "CANCELLED")}
                          className="text-xs text-red-700 border border-red-200 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 transition-colors">
                          Cancel
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteShift(shift.id)}
                      className="text-neutral-300 hover:text-red-500 transition-colors p-0.5" title="Delete">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 text-center py-2">No shifts scheduled yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MyHiresPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;
  const isFamily = role === "FAMILY";
  // CNOS: the family household-employer lane is gated off pending legal review.
  const householdEnabled = isHouseholdEmployerLaneEnabled();
  const householdGatedOff = isFamily && !householdEnabled;

  // Family state
  const [familyHires, setFamilyHires] = useState<FamilyHire[]>([]);
  // Caregiver/Operator state
  const [cgHires, setCgHires] = useState<CaregiverHire[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      setLoading(true);
      setError(null);
      if (householdGatedOff) {
        setFamilyHires([]);
      } else if (isFamily) {
        const res = await fetch("/api/family/household", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load hires");
        const json = await res.json();
        setFamilyHires(json.hires ?? []);
      } else {
        const res = await fetch("/api/marketplace/hires", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load hires");
        const json = await res.json();
        setCgHires(json.hires ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hires");
    } finally {
      setLoading(false);
    }
  }, [status, isFamily, householdGatedOff]);

  useEffect(() => { load(); }, [load]);

  const isEmpty = isFamily ? familyHires.length === 0 : cgHires.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiCheckCircle size={28} className="text-success-600" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">My Hires</h1>
            <p className="text-sm text-neutral-500">
              {role === "CAREGIVER"
                ? "Positions you have been hired for"
                : "People you have hired"}
            </p>
          </div>
        </div>
        {loading && <FiRefreshCw size={18} className="text-neutral-400 animate-spin" />}
      </div>

      {error && !loading && (
        <div className="rounded-lg bg-error-50 border border-error-200 p-4 text-error-700 mb-4 flex items-center gap-2">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {householdGatedOff && !loading && (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <FiBriefcase size={48} className="mx-auto text-neutral-300 mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">Household scheduling isn’t available</h2>
          <p className="text-neutral-500">
            Direct household hiring &amp; shift scheduling isn’t available on CareLinkAI right now.
          </p>
        </div>
      )}

      {!loading && !error && isEmpty && !householdGatedOff && (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <FiBriefcase size={48} className="mx-auto text-neutral-300 mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">No hires yet</h2>
          <p className="text-neutral-500 mb-6">
            {role === "CAREGIVER"
              ? "You haven't been hired for any positions yet."
              : "You haven't hired anyone through the marketplace yet."}
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Browse Marketplace
          </Link>
        </div>
      )}

      {/* FAMILY view — hire cards with inline shift management */}
      {!loading && isFamily && familyHires.length > 0 && (
        <div className="space-y-4">
          {familyHires.map((hire) => (
            <FamilyHireCard key={hire.id} hire={hire} onRefresh={load} />
          ))}
        </div>
      )}

      {/* Caregiver / Operator view — simple hire list */}
      {!loading && !isFamily && cgHires.length > 0 && (
        <div className="space-y-4">
          {cgHires.map((hire) => (
            <div key={hire.id} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  {hire.listing && (
                    <Link
                      href={`/marketplace/listings/${hire.listing.id}`}
                      className="text-base font-semibold text-primary-700 hover:underline flex items-center gap-1"
                    >
                      <FiBriefcase size={16} />
                      {hire.listing.title}
                    </Link>
                  )}
                  {hire.shift && (
                    <div className="flex items-center gap-1 text-sm text-neutral-700">
                      <FiCalendar size={14} />
                      {format(parseISO(hire.shift.startTime), "MMM d, yyyy")} •{" "}
                      {format(parseISO(hire.shift.startTime), "h:mm a")} –{" "}
                      {format(parseISO(hire.shift.endTime), "h:mm a")}
                    </div>
                  )}
                  {hire.position && <p className="text-sm text-neutral-600 mt-1">{hire.position}</p>}
                  {typeof hire.hourlyRate === "number" && (
                    <p className="text-sm font-medium text-neutral-800 mt-1">
                      ${hire.hourlyRate.toFixed(2)}/hr
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    CAREGIVER_STATUS_COLORS[hire.status] || "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {hire.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Hired {format(parseISO(hire.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
