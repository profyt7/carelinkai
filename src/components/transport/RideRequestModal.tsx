"use client";

import { useState } from "react";
import { FiX, FiMapPin, FiCalendar, FiUsers, FiZap } from "react-icons/fi";
import toast from "react-hot-toast";

interface Props {
  providerId: string;
  providerName: string;
  leadId?: string;
  defaultPickup?: string;
  defaultDropoff?: string;
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

export default function RideRequestModal({
  providerId,
  providerName,
  leadId,
  defaultPickup = "",
  defaultDropoff = "",
  onClose,
  onRequested,
}: Props) {
  const [pickupAddress, setPickupAddress] = useState(defaultPickup);
  const [dropoffAddress, setDropoffAddress] = useState(defaultDropoff);
  const [scheduledAt, setScheduledAt] = useState("");
  const [tripPurpose, setTripPurpose] = useState("medical_appointment");
  const [mobilityNeeds, setMobilityNeeds] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);

  // Minimum allowed date/time: 1 hour from now
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress.trim() || !dropoffAddress.trim() || !scheduledAt) {
      toast.error("Please fill in pickup, dropoff, and scheduled time.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          leadId: leadId ?? undefined,
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          tripPurpose,
          mobilityNeeds: mobilityNeeds.trim() || undefined,
          passengerCount,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit ride request");
        return;
      }
      toast.success("Ride request sent! The provider will confirm shortly.");
      onRequested?.();
      onClose();
    } catch {
      toast.error("Failed to submit ride request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Request a Ride</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{providerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Scheduled date/time */}
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
              required
              className="form-input w-full"
            />
          </div>

          {/* Pickup */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <FiMapPin className="inline mr-1.5 mb-0.5" size={14} />
              Pickup Address <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="123 Main St, Cleveland, OH 44101"
              required
              className="form-input w-full"
            />
          </div>

          {/* Dropoff */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <FiMapPin className="inline mr-1.5 mb-0.5" size={14} />
              Dropoff Address <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="456 Clinic Ave, Cleveland, OH 44102"
              required
              className="form-input w-full"
            />
          </div>

          {/* Trip purpose */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Trip Purpose
            </label>
            <select
              value={tripPurpose}
              onChange={(e) => setTripPurpose(e.target.value)}
              className="form-input w-full"
            >
              {TRIP_PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Passengers */}
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
                <option key={n} value={n}>
                  {n} {n === 1 ? "passenger" : "passengers"}
                </option>
              ))}
            </select>
          </div>

          {/* Mobility needs */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Mobility / Accessibility Needs
            </label>
            <textarea
              value={mobilityNeeds}
              onChange={(e) => setMobilityNeeds(e.target.value)}
              placeholder="Wheelchair, walker, door-to-door assistance needed..."
              rows={2}
              maxLength={500}
              className="form-input w-full resize-none"
            />
          </div>

          {/* Special requests */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Special Requests
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any other notes for the driver..."
              rows={2}
              maxLength={500}
              className="form-input w-full resize-none"
            />
          </div>

          {/* Info note */}
          <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg p-3">
            The provider will review your request and set a fare. You'll receive an email to confirm
            payment once they accept.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <FiZap size={15} />
              {loading ? "Sending..." : "Request Ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
