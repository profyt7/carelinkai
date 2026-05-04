"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiCheckCircle, FiClock, FiMapPin, FiCalendar, FiX, FiDollarSign,
  FiPlay, FiFlag, FiPlus, FiUsers, FiAlertCircle, FiChevronDown, FiChevronUp,
  FiWind, FiHeart, FiStar,
} from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";

type RideStatus = "REQUESTED" | "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  tripPurpose: string | null;
  passengerCount: number;
  specialRequests: string | null;
  status: RideStatus;
  baseFare: number | null;
  platformFeePercent: number;
  platformFee: number | null;
  totalAmount: number | null;
  canceledBy: string | null;
  cancelReason: string | null;
  residentName: string | null;
  bookedByRole: string;
  // Passenger needs
  mobilityLevel: string | null;
  doorToDoorLevel: string | null;
  needsOxygen: boolean;
  hasCompanion: boolean;
  cognitionNote: boolean;
  hasServiceAnimal: boolean;
  // Ride options
  waitTimeMinutes: number | null;
  needsReturn: boolean;
  returnScheduledAt: string | null;
  isRecurring: boolean;
  recurringFrequency: string | null;
  // Shared
  isSharedRide: boolean;
  sharedRideGroupId: string | null;
  provider?: { id: string; businessName: string; contactEmail: string; contactPhone: string | null };
  family?: { id: string; user: { firstName: string; lastName: string; email: string; phone: string | null } };
}

const STATUS_CONFIG: Record<RideStatus, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED:   { label: "Pending",        color: "bg-amber-100 text-amber-800",     icon: <FiClock size={11} /> },
  CONFIRMED:   { label: "Confirmed",      color: "bg-primary-100 text-primary-800", icon: <FiDollarSign size={11} /> },
  PAID:        { label: "Paid",           color: "bg-success-100 text-success-800", icon: <FiCheckCircle size={11} /> },
  IN_PROGRESS: { label: "In Progress",   color: "bg-blue-100 text-blue-800",       icon: <FiPlay size={11} /> },
  COMPLETED:   { label: "Done",          color: "bg-neutral-100 text-neutral-600", icon: <FiCheckCircle size={11} /> },
  CANCELED:    { label: "Canceled",      color: "bg-error-100 text-error-700",     icon: <FiX size={11} /> },
};

const MOBILITY_LABELS: Record<string, string> = {
  AMBULATORY: "Ambulatory",
  ASSISTED: "Needs Assist",
  WHEELCHAIR: "Wheelchair",
  STRETCHER: "Stretcher",
  BARIATRIC: "Bariatric",
};

const DOOR_LABELS: Record<string, string> = {
  CURB_TO_CURB: "Curb-to-Curb",
  DOOR_TO_DOOR: "Door-to-Door",
  DOOR_THROUGH_DOOR: "Door-Through-Door",
  BED_TO_BED: "Bed-to-Bed",
};

function PassengerNeedsRow({ ride }: { ride: Ride }) {
  const tags: string[] = [];
  if (ride.mobilityLevel && ride.mobilityLevel !== "AMBULATORY")
    tags.push(MOBILITY_LABELS[ride.mobilityLevel] ?? ride.mobilityLevel);
  if (ride.doorToDoorLevel && ride.doorToDoorLevel !== "DOOR_TO_DOOR")
    tags.push(DOOR_LABELS[ride.doorToDoorLevel] ?? ride.doorToDoorLevel);
  if (ride.needsOxygen) tags.push("O₂");
  if (ride.hasCompanion) tags.push("+ Companion");
  if (ride.cognitionNote) tags.push("Cognition");
  if (ride.hasServiceAnimal) tags.push("Service Animal");
  if (ride.waitTimeMinutes) tags.push(`Wait ${ride.waitTimeMinutes}min`);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tags.map((t) => (
        <span key={t} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium border border-amber-200">
          {t}
        </span>
      ))}
    </div>
  );
}

// Group rides by day for the manifest view
function groupByDay(rides: Ride[]): [string, Ride[]][] {
  const map = new Map<string, Ride[]>();
  for (const r of rides) {
    const day = new Date(r.scheduledAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(r);
  }
  return Array.from(map.entries());
}

// Detect rides going same direction around same time (within 90 min, same destination)
function findBatchOpportunities(rides: Ride[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < rides.length; i++) {
    for (let j = i + 1; j < rides.length; j++) {
      const a = rides[i];
      const b = rides[j];
      const timeDiff = Math.abs(new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      const sameDestination =
        a.dropoffAddress.toLowerCase().includes(b.dropoffAddress.slice(0, 20).toLowerCase()) ||
        b.dropoffAddress.toLowerCase().includes(a.dropoffAddress.slice(0, 20).toLowerCase());
      if (timeDiff <= 90 * 60 * 1000 && sameDestination) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}

// Provider manifest card
function ManifestCard({
  ride, vehicleCapacity, onConfirm, onStart, onComplete, onCancel, onToggleShared,
  hasBatchOpportunity, fareInput, setFareInput, actionLoading,
}: {
  ride: Ride;
  vehicleCapacity: number;
  onConfirm: (id: string, fare: number) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onToggleShared: (id: string, val: boolean) => void;
  hasBatchOpportunity: boolean;
  fareInput: Record<string, string>;
  setFareInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  actionLoading: Record<string, boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[ride.status];
  const timeStr = new Date(ride.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const passengerName = ride.residentName ?? (ride.family ? `${ride.family.user.firstName} ${ride.family.user.lastName}` : "Unknown");
  const contactInfo = ride.family?.user.phone ?? ride.family?.user.email ?? null;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${
      hasBatchOpportunity ? "border-amber-300" : "border-neutral-200"
    }`}>
      {hasBatchOpportunity && (
        <div className="flex items-center gap-1.5 bg-amber-50 px-4 py-1.5 text-xs text-amber-700 font-medium border-b border-amber-200">
          <FiStar size={11} /> Batch opportunity — similar time & destination
        </div>
      )}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-neutral-900">{timeStr}</span>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              {ride.isSharedRide && (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <FiUsers size={10} /> Shared
                </span>
              )}
            </div>
            <p className="font-medium text-neutral-800 mt-0.5">{passengerName}</p>
            {ride.bookedByRole === "OPERATOR" && (
              <p className="text-xs text-neutral-400">Facility booking</p>
            )}
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 shrink-0"
          >
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>

        {/* Route */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-start gap-2 text-sm text-neutral-700">
            <FiMapPin size={13} className="text-primary-500 mt-0.5 shrink-0" />
            <span className="truncate">{ride.pickupAddress}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-neutral-700">
            <FiMapPin size={13} className="text-success-500 mt-0.5 shrink-0" />
            <span className="truncate">{ride.dropoffAddress}</span>
          </div>
        </div>

        {/* Passenger needs summary */}
        <PassengerNeedsRow ride={ride} />

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2 text-sm">
            {contactInfo && (
              <p className="text-neutral-600">
                <span className="text-neutral-400 text-xs">Contact </span>{contactInfo}
              </p>
            )}
            {ride.tripPurpose && (
              <p className="text-neutral-600">
                <span className="text-neutral-400 text-xs">Purpose </span>{ride.tripPurpose}
              </p>
            )}
            {ride.specialRequests && (
              <p className="text-neutral-600 italic">
                <span className="text-neutral-400 text-xs not-italic">Notes </span>{ride.specialRequests}
              </p>
            )}
            {ride.passengerCount > 1 && (
              <p className="text-neutral-600">
                <span className="text-neutral-400 text-xs">Passengers </span>{ride.passengerCount}
              </p>
            )}
            {ride.needsReturn && ride.returnScheduledAt && (
              <p className="text-neutral-600">
                <span className="text-neutral-400 text-xs">Return at </span>
                {new Date(ride.returnScheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
            {ride.isRecurring && (
              <p className="text-neutral-600">
                <span className="text-neutral-400 text-xs">Recurring </span>
                {ride.recurringFrequency?.toLowerCase() ?? "yes"}
              </p>
            )}
            {ride.totalAmount != null && (
              <p className="text-neutral-800 font-medium">
                <span className="text-neutral-400 text-xs font-normal">Total fare </span>
                ${Number(ride.totalAmount).toFixed(2)}
              </p>
            )}
            {/* Shared ride toggle */}
            {["REQUESTED", "CONFIRMED", "PAID"].includes(ride.status) && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={ride.isSharedRide}
                  onChange={(e) => onToggleShared(ride.id, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-neutral-600">
                  Allow shared ride — batch with other pickups to fill vehicle
                </span>
              </label>
            )}
          </div>
        )}

        {/* Actions */}
        {ride.status === "REQUESTED" && (
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
              <input
                type="number" min="1" step="0.01" placeholder="Set fare"
                value={fareInput[ride.id] ?? ""}
                onChange={(e) => setFareInput((p) => ({ ...p, [ride.id]: e.target.value }))}
                className="form-input pl-6 w-full text-sm py-2"
              />
            </div>
            <button
              onClick={() => onConfirm(ride.id, parseFloat(fareInput[ride.id] ?? ""))}
              disabled={actionLoading[ride.id]}
              className="px-3 py-2 bg-success-600 text-white text-xs font-semibold rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50"
            >
              {actionLoading[ride.id] ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => onCancel(ride.id)}
              disabled={actionLoading[ride.id]}
              className="px-3 py-2 border border-neutral-200 text-neutral-600 text-xs rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {ride.status === "PAID" && (
          <button
            onClick={() => onStart(ride.id)}
            disabled={actionLoading[ride.id]}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mt-3"
          >
            <FiPlay size={13} />
            {actionLoading[ride.id] ? "Starting..." : "Start Ride"}
          </button>
        )}

        {ride.status === "IN_PROGRESS" && (
          <button
            onClick={() => onComplete(ride.id)}
            disabled={actionLoading[ride.id]}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success-600 text-white text-sm font-semibold rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50 mt-3"
          >
            <FiFlag size={13} />
            {actionLoading[ride.id] ? "Completing..." : "Complete Ride"}
          </button>
        )}

        {["CONFIRMED", "PAID", "IN_PROGRESS"].includes(ride.status) && (
          <button
            onClick={() => onCancel(ride.id)}
            disabled={actionLoading[ride.id]}
            className="mt-2 text-xs text-neutral-400 hover:text-error-600 transition-colors w-full text-center"
          >
            Cancel ride
          </button>
        )}
      </div>
    </div>
  );
}

// Capacity bar shown at the day level
function CapacityBar({ rides, capacity }: { rides: Ride[]; capacity: number }) {
  const active = rides.filter((r) => !["COMPLETED", "CANCELED"].includes(r.status));
  const totalPassengers = active.reduce((s, r) => s + (r.passengerCount ?? 1), 0);
  const pct = Math.min(100, (totalPassengers / capacity) * 100);
  const color = pct >= 100 ? "bg-error-500" : pct >= 75 ? "bg-amber-500" : "bg-success-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500 shrink-0">{totalPassengers}/{capacity} passengers</span>
    </div>
  );
}

export default function RidesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");

  const [rides, setRides] = useState<Ride[]>([]);
  const [vehicleCapacity, setVehicleCapacity] = useState(4);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [fareInput, setFareInput] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  const role = session?.user?.role;
  const isProvider = role === "PROVIDER";
  const isOperator = role === "OPERATOR" || role === "STAFF";

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rides");
      if (res.ok) {
        const data = await res.json();
        setRides(data.rides ?? []);
        if (data.vehicleCapacity) setVehicleCapacity(data.vehicleCapacity);
      }
    } catch { toast.error("Failed to load rides"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (session?.user) fetchRides(); }, [session, fetchRides]);

  useEffect(() => {
    if (paymentResult === "success") toast.success("Payment complete! Your ride is confirmed.");
    if (paymentResult === "canceled") toast("Payment canceled — no charge was made.", { icon: "ℹ️" });
  }, [paymentResult]);

  const withLoading = async (id: string, fn: () => Promise<void>) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try { await fn(); } finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  };

  const handleConfirm = (rideId: string, fare: number) => withLoading(rideId, async () => {
    if (!fare || fare <= 0) { toast.error("Enter a valid fare amount"); return; }
    const res = await fetch(`/api/rides/${rideId}/confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseFare: fare }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to confirm ride"); return; }
    toast.success("Ride confirmed — family notified to complete payment.");
    setFareInput((p) => { const n = { ...p }; delete n[rideId]; return n; });
    fetchRides();
  });

  const handleStart = (rideId: string) => withLoading(rideId, async () => {
    const res = await fetch(`/api/rides/${rideId}/start`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to start ride"); return; }
    toast.success("Ride marked as in progress.");
    fetchRides();
  });

  const handleComplete = (rideId: string) => withLoading(rideId, async () => {
    const res = await fetch(`/api/rides/${rideId}/complete`, { method: "POST" });
    if (!res.ok) { toast.error("Failed to complete ride"); return; }
    toast.success("Ride marked complete.");
    fetchRides();
  });

  const handleCancel = (rideId: string) => withLoading(rideId, async () => {
    if (!window.confirm("Cancel this ride?")) return;
    const res = await fetch(`/api/rides/${rideId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) { toast.error("Failed to cancel ride"); return; }
    toast.success("Ride canceled.");
    fetchRides();
  });

  const handleToggleShared = async (rideId: string, val: boolean) => {
    const res = await fetch(`/api/rides/${rideId}/shared`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSharedRide: val }),
    });
    if (!res.ok) { toast.error("Failed to update shared status"); return; }
    setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, isSharedRide: val } : r));
  };

  const handlePay = async (rideId: string) => {
    setPaying(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to start payment"); return; }
      if (data.url) window.location.href = data.url;
    } catch { toast.error("Failed to start payment"); }
    finally { setPaying(null); }
  };

  const upcomingStatuses: RideStatus[] = ["REQUESTED", "CONFIRMED", "PAID", "IN_PROGRESS"];
  const completedStatuses: RideStatus[] = ["COMPLETED", "CANCELED"];
  const visible = rides.filter((r) =>
    activeTab === "upcoming" ? upcomingStatuses.includes(r.status) : completedStatuses.includes(r.status)
  );

  const pageTitle = isProvider ? "Dispatch" : isOperator ? "Resident Rides" : "My Rides";
  const pageDesc = isProvider
    ? "Your daily ride manifest."
    : isOperator
    ? "Manage transport rides booked for your residents."
    : "Track your ride requests and upcoming bookings.";

  // ── Provider manifest view ─────────────────────────────────────────────────
  if (isProvider) {
    const days = groupByDay(visible);
    const batchIds = findBatchOpportunities(visible);

    return (
      <DashboardLayout title={pageTitle}>
        <div className="max-w-3xl mx-auto p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
              <p className="text-neutral-500 mt-1 text-sm">{pageDesc}</p>
            </div>
          </div>

          <div className="flex gap-1 mb-6 border-b border-neutral-200">
            {(["upcoming", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tab === "upcoming"
                  ? `Upcoming (${rides.filter((r) => upcomingStatuses.includes(r.status)).length})`
                  : "Completed"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-neutral-100 rounded-xl animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <FiCalendar size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-neutral-600">No {activeTab} rides</p>
              <p className="text-sm mt-1">New bookings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {days.map(([day, dayRides]) => {
                const dayBatchIds = findBatchOpportunities(dayRides);
                const hasBatch = dayRides.some((r) => dayBatchIds.has(r.id));
                return (
                  <div key={day}>
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="font-semibold text-neutral-800 text-sm">{day}</h2>
                        <p className="text-xs text-neutral-400 mt-0.5">{dayRides.length} ride{dayRides.length !== 1 ? "s" : ""}</p>
                      </div>
                      {hasBatch && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                          <FiAlertCircle size={11} /> Batch possible
                        </span>
                      )}
                    </div>

                    {/* Capacity bar */}
                    <div className="mb-3">
                      <CapacityBar rides={dayRides} capacity={vehicleCapacity} />
                    </div>

                    <div className="space-y-3">
                      {dayRides.map((ride) => (
                        <ManifestCard
                          key={ride.id}
                          ride={ride}
                          vehicleCapacity={vehicleCapacity}
                          onConfirm={handleConfirm}
                          onStart={handleStart}
                          onComplete={handleComplete}
                          onCancel={handleCancel}
                          onToggleShared={handleToggleShared}
                          hasBatchOpportunity={batchIds.has(ride.id)}
                          fareInput={fareInput}
                          setFareInput={setFareInput}
                          actionLoading={actionLoading}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── Family / Operator standard view ───────────────────────────────────────
  return (
    <DashboardLayout title={pageTitle}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
            <p className="text-neutral-500 mt-1 text-sm">{pageDesc}</p>
          </div>
          {!isProvider && (
            <Link
              href="/marketplace?tab=providers&services=transportation"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
            >
              <FiPlus size={15} />
              Book a Ride
            </Link>
          )}
        </div>

        <div className="flex gap-1 mb-6 border-b border-neutral-200">
          {(["upcoming", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab === "upcoming" ? `Upcoming (${rides.filter(r => upcomingStatuses.includes(r.status)).length})` : "Completed"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-neutral-100 rounded-xl animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <FiCalendar size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-neutral-600">No {activeTab} rides</p>
            {activeTab === "upcoming" && !isOperator ? (
              <div className="mt-3">
                <p className="text-sm mb-4">Find a transportation provider in the marketplace and book your first ride.</p>
                <Link
                  href="/marketplace?tab=providers&services=transportation"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <FiPlus size={15} />
                  Find a Transport Provider
                </Link>
              </div>
            ) : activeTab === "upcoming" && isOperator ? (
              <p className="text-sm mt-1">Book transport rides for residents from their profile page, or browse <Link href="/marketplace?tab=providers&services=transportation" className="text-primary-600 underline">transport providers</Link>.</p>
            ) : (
              <p className="text-sm mt-1">Nothing here yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((ride) => {
              const cfg = STATUS_CONFIG[ride.status];
              const scheduledStr = new Date(ride.scheduledAt).toLocaleString("en-US", {
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
              });
              const passengerLabel = ride.residentName
                ?? (ride.family ? `${ride.family.user.firstName} ${ride.family.user.lastName}` : null);

              return (
                <div key={ride.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      {isOperator && passengerLabel && (
                        <p className="font-semibold text-neutral-900 text-sm">
                          {passengerLabel}
                          {ride.bookedByRole === "OPERATOR" && (
                            <span className="ml-2 text-xs text-neutral-400 font-normal">(facility)</span>
                          )}
                        </p>
                      )}
                      {ride.provider && (
                        <p className="font-semibold text-neutral-900 text-sm">{ride.provider.businessName}</p>
                      )}
                      <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                        <FiCalendar size={11} /> {scheduledStr}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-start gap-2 text-sm text-neutral-700">
                      <FiMapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
                      <span><span className="text-neutral-400 text-xs">From </span>{ride.pickupAddress}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-neutral-700">
                      <FiMapPin size={14} className="text-success-500 mt-0.5 shrink-0" />
                      <span><span className="text-neutral-400 text-xs">To </span>{ride.dropoffAddress}</span>
                    </div>
                  </div>

                  <PassengerNeedsRow ride={ride} />

                  {ride.totalAmount != null && (
                    <div className="flex items-center gap-3 text-sm mt-3 p-2.5 bg-neutral-50 rounded-lg flex-wrap">
                      <span className="text-neutral-500">Base fare</span>
                      <span>${Number(ride.baseFare).toFixed(2)}</span>
                      <span className="text-neutral-400">+</span>
                      <span className="text-neutral-500">Service fee</span>
                      <span>${Number(ride.platformFee).toFixed(2)}</span>
                      <span className="ml-auto text-neutral-500">Total</span>
                      <span className="font-semibold text-neutral-900">${Number(ride.totalAmount).toFixed(2)}</span>
                    </div>
                  )}

                  {ride.specialRequests && (
                    <p className="text-xs text-neutral-500 mt-3 italic">{ride.specialRequests}</p>
                  )}

                  {!isProvider && ride.status === "CONFIRMED" && (
                    <button
                      onClick={() => handlePay(ride.id)} disabled={paying === ride.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 mt-3"
                    >
                      <FiDollarSign size={15} />
                      {paying === ride.id ? "Redirecting..." : `Pay $${Number(ride.totalAmount).toFixed(2)} to Confirm Ride`}
                    </button>
                  )}

                  {!isProvider && ["REQUESTED", "CONFIRMED"].includes(ride.status) && (
                    <button
                      onClick={() => handleCancel(ride.id)} disabled={canceling === ride.id}
                      className="mt-2 text-xs text-neutral-400 hover:text-error-600 transition-colors w-full text-center"
                    >
                      {canceling === ride.id ? "Canceling..." : "Cancel ride"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
