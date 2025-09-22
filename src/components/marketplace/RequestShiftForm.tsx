"use client";

import React, { useState } from "react";
import Link from "next/link";

interface RequestShiftFormProps {
  caregiverUserId: string;
  caregiverId: string;
}

export default function RequestShiftForm({ caregiverUserId, caregiverId }: RequestShiftFormProps) {
  // Form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [setting, setSetting] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdListingId, setCreatedListingId] = useState("");

  const isFormValid = Boolean(date && startTime && endTime);

  function toISO(dateStr: string, timeStr: string) {
    return new Date(`${dateStr}T${timeStr}`).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please fill all required fields");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const startISO = toISO(date, startTime);
      const endISO = toISO(date, endTime);

      if (new Date(endISO) <= new Date(startISO)) {
        throw new Error("End time must be after start time");
      }

      // 1) Check caregiver availability
      const availabilityRes = await fetch(
        `/api/calendar/availability?userId=${encodeURIComponent(caregiverUserId)}&startTime=${encodeURIComponent(startISO)}&endTime=${encodeURIComponent(endISO)}&appointmentType=CAREGIVER_SHIFT`
      );
      const availabilityJson = await availabilityRes.json();
      if (!availabilityRes.ok) {
        throw new Error(availabilityJson.error || "Failed to check availability");
      }
      if (!availabilityJson?.data?.isAvailable) {
        throw new Error("Caregiver is not available during this time");
      }

      // 2) Create minimal listing with optional location/setting
      const formattedDate = new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      const formattedStart = new Date(`${date}T${startTime}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const formattedEnd = new Date(`${date}T${endTime}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

      const listingRes = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Per-diem shift on ${formattedDate}`,
          description: `Shift from ${formattedStart} to ${formattedEnd}. Please apply if you're available.`,
          startTime: startISO,
          endTime: endISO,
          hourlyRateMin: hourlyRate ? parseFloat(hourlyRate) : undefined,
          hourlyRateMax: hourlyRate ? parseFloat(hourlyRate) : undefined,
          city: city || undefined,
          state: state || undefined,
          zipCode: zip || undefined,
          setting: setting || undefined,
        }),
      });
      const listingJson = await listingRes.json();
      if (!listingRes.ok) {
        throw new Error(listingJson.error || "Failed to create listing");
      }
      const listingId = listingJson.data.id as string;

      // 3) Invite caregiver to listing
      const inviteRes = await fetch("/api/marketplace/applications/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          caregiverId,
          message: `You've been invited to a shift on ${formattedDate} from ${formattedStart} to ${formattedEnd}.`,
        }),
      });
      const inviteJson = await inviteRes.json();
      if (!inviteRes.ok) {
        throw new Error(inviteJson.error || "Failed to invite caregiver");
      }

      setCreatedListingId(listingId);
      setSuccess(true);
      // reset minimal fields
      setDate("");
      setStartTime("");
      setEndTime("");
      setHourlyRate("");
      setCity("");
      setState("");
      setZip("");
      setSetting("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Request Shift</h3>
      {success ? (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Shift request created successfully!</p>
              <div className="mt-2">
                <Link href={`/marketplace/listings/${createdListingId}`} className="text-sm font-medium text-green-600 hover:text-green-500">
                  View listing details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="shift-date" className="block text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="shift-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">Start Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                id="start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">End Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="hourly-rate" className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="hourly-rate"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Location & Setting (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                maxLength={2}
              />
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700">ZIP</label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                maxLength={10}
              />
            </div>
          </div>

          <div>
            <label htmlFor="setting" className="block text-sm font-medium text-gray-700">Setting</label>
            <select
              id="setting"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
            >
              <option value="">Select...</option>
              <option value="HOME">Home</option>
              <option value="FACILITY">Facility</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading || !isFormValid
                  ? "bg-primary-300 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              }`}
            >
              {isLoading ? "Processing..." : "Request Shift"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
