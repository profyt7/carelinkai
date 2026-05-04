"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiX, FiMapPin, FiCalendar, FiUsers, FiZap, FiArrowRight,
  FiArrowLeft, FiRefreshCw, FiClock, FiCheckCircle, FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface Props {
  providerId: string;
  providerName: string;
  isOperator?: boolean;
  leadId?: string;
  defaultPickup?: string;
  defaultDropoff?: string;
  defaultResidentName?: string;
  onClose: () => void;
  onRequested?: () => void;
}

const TRIP_PURPOSES = [
  { value: "medical_appointment", label: "Medical Appointment" },
  { value: "dialysis", label: "Dialysis" },
  { value: "therapy", label: "Therapy / Rehab" },
  { value: "grocery", label: "Grocery / Errands" },
  { value: "other", label: "Other" },
];

const WAIT_OPTIONS = [
  { value: 0, label: "No wait — drop off only" },
  { value: 30, label: "Wait ~30 minutes" },
  { value: 60, label: "Wait ~1 hour" },
  { value: 90, label: "Wait ~1.5 hours" },
  { value: 120, label: "Wait ~2 hours" },
  { value: 180, label: "Wait ~3 hours" },
];

const RECURRING_OPTIONS = [
  { value: "WEEKLY", label: "Weekly (same day & time)" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "DAILY", label: "Daily (Mon–Fri)" },
];

type FareEstimate = {
  miles: number | null;
  fare?: { tripFare: number; waitFare: number; platformFee: number; total: number };
  instantBook: boolean;
  message?: string;
};

function addMinutesToDatetimeLocal(base: string, minutes: number): string {
  if (!base) return "";
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

export default function RideRequestModal({
  providerId,
  providerName,
  isOperator = false,
  leadId,
  defaultPickup = "",
  defaultDropoff = "",
  defaultResidentName = "",
  onClose,
  onRequested,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Trip details
  const [pickupAddress, setPickupAddress] = useState(defaultPickup);
  const [dropoffAddress, setDropoffAddress] = useState(defaultDropoff);
  const [scheduledAt, setScheduledAt] = useState("");
  const [residentName, setResidentName] = useState(defaultResidentName);
  const [tripPurpose, setTripPurpose] = useState("medical_appointment");
  const [passengerCount, setPassengerCount] = useState(1);

  // Step 2 — Ride options
  const [wheelchairRequired, setWheelchairRequired] = useState(false);
  const [waitTimeMinutes, setWaitTimeMinutes] = useState(0);
  const [needsReturn, setNeedsReturn] = useState(false);
  const [returnScheduledAt, setReturnScheduledAt] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("WEEKLY");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 3 — Fare estimate + submit
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [loading, setLoading] = useState(false);

  const minDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  // Auto-populate return time when wait time or scheduled time changes
  useEffect(() => {
    if (needsReturn && scheduledAt && waitTimeMinutes > 0) {
      setReturnScheduledAt(addMinutesToDatetimeLocal(scheduledAt, waitTimeMinutes + 30));
    }
  }, [needsReturn, scheduledAt, waitTimeMinutes]);

  const fetchEstimate = useCallback(async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) return;
    setEstimating(true);
    try {
      const res = await fetch("/api/rides/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: pickupAddress.trim(),
          dropoff: dropoffAddress.trim(),
          providerId,
          waitMinutes: waitTimeMinutes,
        }),
      });
      if (res.ok) setEstimate(await res.json());
    } catch {
      // silently fail — user can still book without estimate
    } finally {
      setEstimating(false);
    }
  }, [pickupAddress, dropoffAddress, providerId, waitTimeMinutes]);

  const goToStep3 = () => {
    setStep(3);
    fetchEstimate();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          leadId: leadId ?? undefined,
          residentName: isOperator ? residentName.trim() : undefined,
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          tripPurpose,
          passengerCount,
          specialRequests: specialRequests.trim() || undefined,
          // options
          wheelchairRequired,
          waitTimeMinutes: waitTimeMinutes || undefined,
          // return trip
          needsReturn,
          returnScheduledAt: needsReturn && returnScheduledAt
            ? new Date(returnScheduledAt).toISOString()
            : undefined,
          // recurring
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          recurringEndDate: isRecurring && recurringEndDate
            ? new Date(recurringEndDate).toISOString()
            : undefined,
          // fare
          estimatedMiles: estimate?.miles ?? undefined,
          estimatedFare: estimate?.fare?.total ?? undefined,
          instantBook: estimate?.instantBook ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit ride request");
        return;
      }
      // If instant booking → redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.success("Ride requested! The provider will confirm shortly.");
      onRequested?.();
      onClose();
    } catch {
      toast.error("Failed to submit ride request");
    } finally {
      setLoading(false);
    }
  };

  const step1Valid =
    pickupAddress.trim() &&
    dropoffAddress.trim() &&
    scheduledAt &&
    (!isOperator || residentName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Book a Ride</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{providerName}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {([1, 2, 3] as const).map((s) => (
                <div
                  key={s}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    s === step ? "bg-primary-600" : s < step ? "bg-primary-300" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* ── STEP 1: Trip Details ── */}
          {step === 1 && (
            <>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Step 1 of 3 — Trip Details
              </p>

              {isOperator && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Resident Name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="Full name of the resident"
                    className="form-input w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <FiCalendar className="inline mr-1.5 mb-0.5" size={14} />
                  Pickup Date & Time <span className="text-error-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <FiMapPin className="inline mr-1.5 mb-0.5 text-green-500" size={14} />
                  Pickup Address <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="123 Main St, Cleveland, OH 44101"
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <FiMapPin className="inline mr-1.5 mb-0.5 text-red-500" size={14} />
                  Dropoff Address <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="456 Clinic Ave, Cleveland, OH 44102"
                  className="form-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Trip Purpose</label>
                  <select
                    value={tripPurpose}
                    onChange={(e) => setTripPurpose(e.target.value)}
                    className="form-input w-full"
                  >
                    {TRIP_PURPOSES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <FiUsers className="inline mr-1.5 mb-0.5" size={14} />
                    Passengers
                  </label>
                  <select
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value))}
                    className="form-input w-full"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "passenger" : "passengers"}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-40"
                >
                  Next: Ride Options <FiArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Ride Options ── */}
          {step === 2 && (
            <>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Step 2 of 3 — Ride Options
              </p>

              {/* Wheelchair */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={wheelchairRequired}
                  onChange={(e) => setWheelchairRequired(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="text-sm font-medium text-neutral-800">Wheelchair accessible vehicle needed</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    Driver will arrive with a wheelchair-accessible van
                  </span>
                </span>
              </label>

              {/* Wait time */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <FiClock className="inline mr-1.5 mb-0.5" size={14} />
                  Will the driver need to wait?
                </label>
                <p className="text-xs text-neutral-400 mb-2">
                  For appointments, dialysis, or therapy — the driver waits and brings the passenger home.
                </p>
                <select
                  value={waitTimeMinutes}
                  onChange={(e) => setWaitTimeMinutes(parseInt(e.target.value))}
                  className="form-input w-full"
                >
                  {WAIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Return trip */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={needsReturn}
                  onChange={(e) => {
                    setNeedsReturn(e.target.checked);
                    if (e.target.checked && scheduledAt && waitTimeMinutes > 0) {
                      setReturnScheduledAt(addMinutesToDatetimeLocal(scheduledAt, waitTimeMinutes + 30));
                    }
                  }}
                  className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="text-sm font-medium text-neutral-800">Book a return trip</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    A second ride home will be booked automatically (same driver if available)
                  </span>
                </span>
              </label>

              {needsReturn && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Return Pickup Time
                  </label>
                  <input
                    type="datetime-local"
                    value={returnScheduledAt}
                    min={scheduledAt || minDateTime}
                    onChange={(e) => setReturnScheduledAt(e.target.value)}
                    className="form-input w-full text-sm"
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    Pre-filled based on your wait time — adjust if needed.
                  </p>
                </div>
              )}

              {/* Recurring */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="text-sm font-medium text-neutral-800 flex items-center gap-1.5">
                    <FiRefreshCw size={13} /> Make this a recurring ride
                  </span>
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    For regular dialysis, therapy, or weekly appointments
                  </span>
                </span>
              </label>

              {isRecurring && (
                <div className="ml-7 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Frequency</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value)}
                      className="form-input w-full text-sm"
                    >
                      {RECURRING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      End Date <span className="text-neutral-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      min={scheduledAt?.slice(0, 10)}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      className="form-input w-full text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes for the driver <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Door-to-door assistance needed, passenger uses a walker, call on arrival..."
                  rows={2}
                  maxLength={500}
                  className="form-input w-full resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <FiArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={goToStep3}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700"
                >
                  Review & Book <FiArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Fare Preview + Confirm ── */}
          {step === 3 && (
            <>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Step 3 of 3 — Review & Pay
              </p>

              {/* Trip summary */}
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <FiMapPin className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span className="text-neutral-700">{pickupAddress}</span>
                </div>
                <div className="flex gap-2">
                  <FiMapPin className="text-red-500 mt-0.5 flex-shrink-0" size={14} />
                  <span className="text-neutral-700">{dropoffAddress}</span>
                </div>
                <div className="flex gap-2">
                  <FiCalendar className="text-neutral-400 mt-0.5 flex-shrink-0" size={14} />
                  <span className="text-neutral-700">
                    {new Date(scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                {wheelchairRequired && (
                  <div className="flex gap-2">
                    <FiCheckCircle className="text-primary-500 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-neutral-700">Wheelchair accessible vehicle</span>
                  </div>
                )}
                {waitTimeMinutes > 0 && (
                  <div className="flex gap-2">
                    <FiClock className="text-neutral-400 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-neutral-700">
                      Driver waits ~{waitTimeMinutes >= 60 ? `${waitTimeMinutes / 60}h` : `${waitTimeMinutes}m`}
                    </span>
                  </div>
                )}
                {needsReturn && returnScheduledAt && (
                  <div className="flex gap-2">
                    <FiRefreshCw className="text-primary-400 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-neutral-700">
                      Return trip at {new Date(returnScheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                )}
                {isRecurring && (
                  <div className="flex gap-2">
                    <FiRefreshCw className="text-amber-500 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-neutral-700">
                      Recurring — {RECURRING_OPTIONS.find((o) => o.value === recurringFrequency)?.label}
                      {recurringEndDate ? ` until ${new Date(recurringEndDate).toLocaleDateString()}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Fare estimate */}
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200">
                  <p className="text-sm font-semibold text-neutral-700">Fare Estimate</p>
                </div>
                {estimating ? (
                  <div className="p-4 text-center text-sm text-neutral-400 animate-pulse">
                    Calculating fare...
                  </div>
                ) : estimate?.fare ? (
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Trip fare ({estimate.miles} mi)</span>
                      <span>${estimate.fare.tripFare.toFixed(2)}</span>
                    </div>
                    {estimate.fare.waitFare > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>Wait time</span>
                        <span>${estimate.fare.waitFare.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-500 text-xs">
                      <span>Platform fee (12%)</span>
                      <span>${estimate.fare.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-neutral-900 border-t border-neutral-200 pt-2 mt-1">
                      <span>Total{needsReturn ? " (one way)" : ""}</span>
                      <span className="text-lg">${estimate.fare.total.toFixed(2)}</span>
                    </div>
                    {needsReturn && (
                      <p className="text-xs text-neutral-400">
                        Return trip will be charged separately at the same rate (~${estimate.fare.total.toFixed(2)})
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 flex items-start gap-2 text-sm text-neutral-500">
                    <FiAlertCircle className="flex-shrink-0 mt-0.5 text-amber-400" size={15} />
                    <span>
                      {estimate?.message ||
                        "Fare will be set by the provider after your request is reviewed."}
                    </span>
                  </div>
                )}
              </div>

              {estimate?.instantBook ? (
                <p className="text-xs text-success-700 bg-success-50 rounded-lg p-3 flex items-start gap-2">
                  <FiZap className="flex-shrink-0 mt-0.5" size={13} />
                  Instant booking — you'll be taken to payment now. Your ride is confirmed once payment completes.
                </p>
              ) : (
                <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg p-3">
                  The provider will confirm your request and you'll receive a payment link by email.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <FiArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  <FiZap size={15} />
                  {loading
                    ? "Processing..."
                    : estimate?.instantBook
                    ? "Book & Pay Now"
                    : "Request Ride"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
