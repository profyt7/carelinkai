"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckCircle, FiClock, FiMapPin, FiCalendar, FiX, FiDollarSign, FiZap, FiPlay, FiFlag, FiPlus } from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";

type RideStatus = "REQUESTED" | "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  tripPurpose: string | null;
  mobilityNeeds: string | null;
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
  provider?: { id: string; businessName: string; contactEmail: string; contactPhone: string | null };
  family?: { id: string; user: { firstName: string; lastName: string; email: string; phone: string | null } };
}

const STATUS_CONFIG: Record<RideStatus, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED:   { label: "Pending Confirmation", color: "bg-amber-100 text-amber-800",     icon: <FiClock size={13} /> },
  CONFIRMED:   { label: "Confirmed — Pay Now",  color: "bg-primary-100 text-primary-800", icon: <FiDollarSign size={13} /> },
  PAID:        { label: "Paid & Scheduled",     color: "bg-success-100 text-success-800", icon: <FiCheckCircle size={13} /> },
  IN_PROGRESS: { label: "In Progress",          color: "bg-blue-100 text-blue-800",       icon: <FiPlay size={13} /> },
  COMPLETED:   { label: "Completed",            color: "bg-neutral-100 text-neutral-600", icon: <FiCheckCircle size={13} /> },
  CANCELED:    { label: "Canceled",             color: "bg-error-100 text-error-700",     icon: <FiX size={13} /> },
};

export default function RidesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [confirming, setConfirming]   = useState<string | null>(null);
  const [fareInput, setFareInput]     = useState<Record<string, string>>({});
  const [canceling, setCanceling]     = useState<string | null>(null);
  const [paying, setPaying]           = useState<string | null>(null);
  const [starting, setStarting]       = useState<string | null>(null);
  const [completing, setCompleting]   = useState<string | null>(null);

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
      }
    } catch { toast.error("Failed to load rides"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (session?.user) fetchRides(); }, [session, fetchRides]);

  useEffect(() => {
    if (paymentResult === "success") toast.success("Payment complete! Your ride is confirmed.");
    if (paymentResult === "canceled") toast("Payment canceled — no charge was made.", { icon: "ℹ️" });
  }, [paymentResult]);

  const upcomingStatuses: RideStatus[] = ["REQUESTED", "CONFIRMED", "PAID", "IN_PROGRESS"];
  const completedStatuses: RideStatus[] = ["COMPLETED", "CANCELED"];
  const visible = rides.filter((r) =>
    activeTab === "upcoming" ? upcomingStatuses.includes(r.status) : completedStatuses.includes(r.status)
  );

  const handleConfirm = async (rideId: string) => {
    const fare = parseFloat(fareInput[rideId] ?? "");
    if (!fare || fare <= 0) { toast.error("Enter a valid fare amount"); return; }
    setConfirming(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseFare: fare }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to confirm ride"); return; }
      toast.success("Ride confirmed — family notified to complete payment.");
      setFareInput((p) => { const n = { ...p }; delete n[rideId]; return n; });
      fetchRides();
    } catch { toast.error("Failed to confirm ride"); }
    finally { setConfirming(null); }
  };

  const handleStart = async (rideId: string) => {
    setStarting(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/start`, { method: "POST" });
      if (!res.ok) { toast.error("Failed to start ride"); return; }
      toast.success("Ride marked as in progress.");
      fetchRides();
    } catch { toast.error("Failed to start ride"); }
    finally { setStarting(null); }
  };

  const handleComplete = async (rideId: string) => {
    setCompleting(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/complete`, { method: "POST" });
      if (!res.ok) { toast.error("Failed to complete ride"); return; }
      toast.success("Ride marked complete.");
      fetchRides();
    } catch { toast.error("Failed to complete ride"); }
    finally { setCompleting(null); }
  };

  const handleCancel = async (rideId: string) => {
    if (!window.confirm("Cancel this ride? If payment was made, a refund will be issued.")) return;
    setCanceling(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) { toast.error("Failed to cancel ride"); return; }
      toast.success("Ride canceled.");
      fetchRides();
    } catch { toast.error("Failed to cancel ride"); }
    finally { setCanceling(null); }
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

  const pageTitle = isProvider ? "Ride Dispatch" : isOperator ? "Resident Rides" : "My Rides";
  const pageDesc = isProvider
    ? "Confirm requests, start rides, and mark completions."
    : isOperator
    ? "Manage transport rides booked for your residents."
    : "Track your ride requests and upcoming bookings.";

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
              href="/marketplace?tab=providers&serviceType=transportation"
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
            {activeTab === "upcoming" && !isProvider && !isOperator ? (
              <div className="mt-3">
                <p className="text-sm mb-4">Find a transportation provider in the marketplace and book your first ride.</p>
                <Link
                  href="/marketplace?tab=providers&serviceType=transportation"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <FiPlus size={15} />
                  Find a Transport Provider
                </Link>
              </div>
            ) : activeTab === "upcoming" && isOperator ? (
              <p className="text-sm mt-1">Book transport rides for residents from their profile page, or browse <Link href="/marketplace?tab=providers&serviceType=transportation" className="text-primary-600 underline">transport providers</Link>.</p>
            ) : (
              <p className="text-sm mt-1">Nothing here yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((ride) => {
              const cfg = STATUS_CONFIG[ride.status];
              const scheduledStr = new Date(ride.scheduledAt).toLocaleString("en-US", {
                weekday: "short", month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit",
              });

              // Determine displayed passenger name
              const passengerLabel = ride.residentName
                ?? (ride.family ? `${ride.family.user.firstName} ${ride.family.user.lastName}` : null);

              return (
                <div key={ride.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      {(isProvider || isOperator) && passengerLabel && (
                        <p className="font-semibold text-neutral-900 text-sm">
                          {passengerLabel}
                          {ride.bookedByRole === "OPERATOR" && (
                            <span className="ml-2 text-xs text-neutral-400 font-normal">(facility booking)</span>
                          )}
                        </p>
                      )}
                      {!isProvider && ride.provider && (
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

                  {/* Route */}
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

                  {/* Fare summary */}
                  {ride.totalAmount != null && (
                    <div className="flex items-center gap-3 text-sm mb-3 p-2.5 bg-neutral-50 rounded-lg flex-wrap">
                      <span className="text-neutral-500">Base fare</span>
                      <span>${Number(ride.baseFare).toFixed(2)}</span>
                      <span className="text-neutral-400">+</span>
                      <span className="text-neutral-500">Service fee</span>
                      <span>${Number(ride.platformFee).toFixed(2)}</span>
                      <span className="ml-auto text-neutral-500">Total</span>
                      <span className="font-semibold text-neutral-900">${Number(ride.totalAmount).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Accessibility / notes */}
                  {(ride.mobilityNeeds || ride.specialRequests) && (
                    <p className="text-xs text-neutral-500 mb-3 italic">
                      {[ride.mobilityNeeds, ride.specialRequests].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {/* ── Provider actions ── */}
                  {isProvider && ride.status === "REQUESTED" && (
                    <div className="flex gap-2 mt-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                        <input
                          type="number" min="1" step="0.01" placeholder="Set fare"
                          value={fareInput[ride.id] ?? ""}
                          onChange={(e) => setFareInput((p) => ({ ...p, [ride.id]: e.target.value }))}
                          className="form-input pl-7 w-full text-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleConfirm(ride.id)} disabled={confirming === ride.id}
                        className="px-4 py-2 bg-success-600 text-white text-sm font-semibold rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50"
                      >
                        {confirming === ride.id ? "Confirming..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => handleCancel(ride.id)} disabled={canceling === ride.id}
                        className="px-3 py-2 border border-neutral-200 text-neutral-600 text-sm rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {isProvider && ride.status === "PAID" && (
                    <button
                      onClick={() => handleStart(ride.id)} disabled={starting === ride.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mt-3"
                    >
                      <FiPlay size={14} />
                      {starting === ride.id ? "Starting..." : "Start Ride"}
                    </button>
                  )}

                  {isProvider && ride.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleComplete(ride.id)} disabled={completing === ride.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success-600 text-white text-sm font-semibold rounded-lg hover:bg-success-700 transition-colors disabled:opacity-50 mt-3"
                    >
                      <FiFlag size={14} />
                      {completing === ride.id ? "Completing..." : "Complete Ride"}
                    </button>
                  )}

                  {/* Provider cancel (CONFIRMED or PAID) */}
                  {isProvider && ["CONFIRMED", "PAID"].includes(ride.status) && (
                    <button
                      onClick={() => handleCancel(ride.id)} disabled={canceling === ride.id}
                      className="mt-2 text-xs text-neutral-400 hover:text-error-600 transition-colors w-full text-center"
                    >
                      {canceling === ride.id ? "Canceling..." : "Cancel ride"}
                    </button>
                  )}

                  {/* ── Family / Operator pay action ── */}
                  {!isProvider && ride.status === "CONFIRMED" && (
                    <button
                      onClick={() => handlePay(ride.id)} disabled={paying === ride.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 mt-3"
                    >
                      <FiDollarSign size={15} />
                      {paying === ride.id ? "Redirecting..." : `Pay $${Number(ride.totalAmount).toFixed(2)} to Confirm Ride`}
                    </button>
                  )}

                  {/* Family / Operator cancel */}
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
