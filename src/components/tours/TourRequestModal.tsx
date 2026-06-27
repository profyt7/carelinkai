"use client";

import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
  FiArrowRight,
  FiAlertCircle,
  FiLoader,
  FiStar,
  FiZap,
} from "react-icons/fi";
import { MessageSquare } from "lucide-react";
import { addDays, format, startOfDay } from "date-fns";
import TimeSlotSelector from "./TimeSlotSelector";

interface TourRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeId: string;
  homeName: string;
  /** True when the home is an unclaimed directory listing — softens the confirmation copy. */
  homeUnclaimed?: boolean;
  onSuccess?: () => void;
}

type Step = "date-range" | "time-slots" | "notes" | "confirmation";

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
  score?: number; // AI confidence score (0-100)
}

export default function TourRequestModal({
  isOpen,
  onClose,
  homeId,
  homeName,
  homeUnclaimed = false,
  onSuccess,
}: TourRequestModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("date-range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [familyNotes, setFamilyNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = startOfDay(new Date());
      const thirtyDaysLater = addDays(today, 30);
      setStartDate(format(today, "yyyy-MM-dd"));
      setEndDate(format(thirtyDaysLater, "yyyy-MM-dd"));
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    setTimeout(() => {
      setCurrentStep("date-range");
      setStartDate("");
      setEndDate("");
      setAvailableSlots([]);
      setSelectedSlot("");
      setFamilyNotes("");
      setError(null);
      setSuccess(false);
    }, 200);
    onClose();
  };

  const fetchTimeSlots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();
      const url = `/api/family/tours/available-slots/${homeId}?startDate=${startISO}&endDate=${endISO}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch available time slots");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.suggestions)) {
        const slots: TimeSlot[] = data.suggestions
          .filter((suggestion: any) => {
            if (!suggestion?.time || typeof suggestion.time !== "string") return false;
            const date = new Date(suggestion.time);
            return !isNaN(date.getTime());
          })
          .map((suggestion: any) => ({
            time: suggestion.time,
            available: true,
            reason: suggestion.reason || "Available",
            score: suggestion.score || 0,
          }));

        setAvailableSlots(slots);
        setCurrentStep("time-slots");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load time slots");
    } finally {
      setIsLoading(false);
    }
  };

  const submitTourRequest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!homeId) throw new Error("Home ID is missing");
      if (!selectedSlot) throw new Error("No time slot selected");

      const dateObj = new Date(selectedSlot);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid time slot format");
      const isoDateTime = dateObj.toISOString();

      const requestBody = {
        homeId,
        requestedTimes: [isoDateTime],
        familyNotes: familyNotes || undefined,
      };

      let response;
      try {
        response = await fetch("/api/family/tours/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      } catch (fetchErr) {
        throw new Error(
          "Network request failed: " +
            (fetchErr instanceof Error ? fetchErr.message : "Unknown error")
        );
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Server error (${response.status})`);
        }
        throw new Error(
          errorData.error || `Failed to submit tour request (${response.status})`
        );
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setCurrentStep("confirmation");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          handleClose();
        }, 2000);
      } else {
        throw new Error("Failed to submit tour request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setError(null);

    if (currentStep === "date-range") {
      if (!startDate || !endDate) {
        setError("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError("End date must be after start date");
        return;
      }
      fetchTimeSlots();
    } else if (currentStep === "time-slots") {
      if (!selectedSlot) {
        setError("Please select a time slot");
        return;
      }
      setCurrentStep("notes");
    } else if (currentStep === "notes") {
      submitTourRequest();
    }
  };

  const handleBack = () => {
    if (currentStep === "time-slots") setCurrentStep("date-range");
    else if (currentStep === "notes") setCurrentStep("time-slots");
  };

  const steps = [
    { id: "date-range", label: "Date Range", number: 1 },
    { id: "time-slots", label: "Select Time", number: 2 },
    { id: "notes", label: "Add Notes", number: 3 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={isLoading ? () => {} : handleClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between border-b border-neutral-200 pb-4"
                >
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-neutral-900">
                      Schedule a Tour
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600">{homeName}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={isLoading ? undefined : handleClose}
                    disabled={isLoading}
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                {/* Step Indicator */}
                {currentStep !== "confirmation" && (
                  <div className="mt-6">
                    <nav aria-label="Progress">
                      <ol className="flex items-center">
                        {steps.map((step, index) => (
                          <li
                            key={step.id}
                            className={`relative ${index !== steps.length - 1 ? "flex-1" : ""}`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                  index <= currentStepIndex
                                    ? "border-primary-600 bg-primary-600"
                                    : "border-neutral-300 bg-white"
                                }`}
                              >
                                {index < currentStepIndex ? (
                                  <FiCheckCircle className="h-5 w-5 text-white" />
                                ) : (
                                  <span
                                    className={`text-sm font-medium ${
                                      index === currentStepIndex
                                        ? "text-white"
                                        : "text-neutral-500"
                                    }`}
                                  >
                                    {step.number}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`ml-2 text-sm font-medium ${
                                  index <= currentStepIndex
                                    ? "text-primary-600"
                                    : "text-neutral-500"
                                }`}
                              >
                                {step.label}
                              </span>
                              {index !== steps.length - 1 && (
                                <div
                                  className={`ml-4 h-0.5 flex-1 ${
                                    index < currentStepIndex
                                      ? "bg-primary-600"
                                      : "bg-neutral-300"
                                  }`}
                                />
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  </div>
                )}

                {/* Content */}
                <div className="mt-6">
                  {/* Step 1: Date Range */}
                  {currentStep === "date-range" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          <FiCalendar className="mr-1 inline h-4 w-4" />
                          Select Date Range
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                          Choose the date range you'd like to visit (next 30 days)
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-neutral-600">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              min={format(new Date(), "yyyy-MM-dd")}
                              max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              disabled={isLoading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-600">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate || format(new Date(), "yyyy-MM-dd")}
                              max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Time Slots */}
                  {currentStep === "time-slots" && (
                    <div className="space-y-4">
                      {/* AI Branding Banner */}
                      <div className="rounded-lg border-2 border-success-200 bg-gradient-to-r from-success-50 to-emerald-50 p-4">
                        <div className="flex items-start">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-600">
                            <FiZap className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <h4 className="flex items-center text-base font-semibold text-success-900">
                              <FiStar className="mr-2 h-4 w-4" />
                              AI-Powered Tour Recommendations
                            </h4>
                            <p className="mt-1 text-sm text-success-800">
                              Our intelligent system has analyzed home availability, tour duration,
                              and optimal scheduling patterns to suggest the best times for your
                              visit. Times are ranked by confidence level.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          <FiClock className="mr-1 inline h-4 w-4" />
                          Select a Time Slot
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                          Choose from AI-recommended times sorted by best match
                        </p>
                      </div>

                      {availableSlots.length > 0 ? (
                        <TimeSlotSelector
                          slots={availableSlots}
                          selectedSlot={selectedSlot}
                          onSelect={setSelectedSlot}
                        />
                      ) : (
                        <div className="rounded-md bg-warning-50 p-4">
                          <div className="flex">
                            <FiAlertCircle className="h-5 w-5 text-warning-400" />
                            <div className="ml-3">
                              <p className="text-sm text-warning-700">
                                No available time slots found for the selected date range.
                                Please try a different date range.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Notes */}
                  {currentStep === "notes" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          <MessageSquare className="mr-1 inline h-4 w-4" />
                          Add Notes or Questions (Optional)
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                          Let us know if you have any specific questions or requirements
                        </p>
                        <textarea
                          value={familyNotes}
                          onChange={(e) => setFamilyNotes(e.target.value)}
                          rows={5}
                          placeholder="e.g., I'd like to see the dining area and meet some residents..."
                          className="mt-3 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          disabled={isLoading}
                        />
                      </div>

                      {/* Tour Summary */}
                      <div className="rounded-md bg-neutral-50 p-4">
                        <h4 className="text-sm font-medium text-neutral-900">Tour Summary</h4>
                        <dl className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-neutral-600">Home:</dt>
                            <dd className="font-medium text-neutral-900">{homeName}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-neutral-600">Requested Time:</dt>
                            <dd className="font-medium text-neutral-900">
                              {selectedSlot
                                ? format(new Date(selectedSlot), "EEEE, MMMM d, yyyy 'at' h:mm a")
                                : "Not selected"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* Confirmation */}
                  {currentStep === "confirmation" && success && (
                    <div className="py-8 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
                        <FiCheckCircle className="h-10 w-10 text-success-600" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-neutral-900">
                        Tour Request Submitted!
                      </h3>
                      {homeUnclaimed ? (
                        <>
                          <p className="mt-2 text-sm text-neutral-600">
                            Your tour request has been sent to {homeName} and we&apos;ve let them know a
                            family wants to visit. Some communities haven&apos;t set up their CareLinkAI
                            page yet, so confirmation can take a little longer — we&apos;ll email you the
                            moment they respond.
                          </p>
                          <a
                            href="/search"
                            className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                          >
                            Browse similar communities ready to respond
                          </a>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-sm text-neutral-600">
                            Your tour request has been sent to {homeName}. They will confirm your
                            appointment shortly.
                          </p>
                          <p className="mt-4 text-xs text-neutral-500">
                            You&apos;ll receive an email confirmation once the tour is confirmed.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 rounded-md bg-error-50 p-4">
                      <div className="flex">
                        <FiAlertCircle className="h-5 w-5 text-error-400" />
                        <div className="ml-3">
                          <p className="text-sm text-error-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {currentStep !== "confirmation" && (
                  <div className="mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={currentStep === "date-range" || isLoading}
                      className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={
                        isLoading ||
                        (currentStep === "time-slots" && availableSlots.length === 0)
                      }
                      className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                          {currentStep === "date-range" ? "Loading..." : "Submitting..."}
                        </>
                      ) : currentStep === "notes" ? (
                        <>
                          Submit Request
                          <FiCheckCircle className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Next
                          <FiArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
