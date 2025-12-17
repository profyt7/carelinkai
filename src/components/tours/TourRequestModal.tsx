"use client";

import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiMessageSquare,
  FiCheckCircle,
  FiArrowLeft,
  FiArrowRight,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { addDays, format, startOfDay } from "date-fns";
import TimeSlotSelector from "./TimeSlotSelector";

interface TourRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeId: string;
  homeName: string;
  onSuccess?: () => void;
}

type Step = "date-range" | "time-slots" | "notes" | "confirmation";

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export default function TourRequestModal({
  isOpen,
  onClose,
  homeId,
  homeName,
  onSuccess,
}: TourRequestModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("date-range");
  
  // Form data
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [familyNotes, setFamilyNotes] = useState("");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Initialize dates to next 30 days
  useEffect(() => {
    if (isOpen) {
      const today = startOfDay(new Date());
      const thirtyDaysLater = addDays(today, 30);
      setStartDate(format(today, "yyyy-MM-dd"));
      setEndDate(format(thirtyDaysLater, "yyyy-MM-dd"));
    }
  }, [isOpen]);

  // Reset state when modal closes
  const handleClose = () => {
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

  // Fetch available time slots
  const fetchTimeSlots = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("[TourRequestModal] Fetching time slots...");
      console.log("[TourRequestModal] startDate:", startDate);
      console.log("[TourRequestModal] endDate:", endDate);
      console.log("[TourRequestModal] homeId:", homeId);
      
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();
      
      console.log("[TourRequestModal] startISO:", startISO);
      console.log("[TourRequestModal] endISO:", endISO);
      
      const url = `/api/family/tours/available-slots/${homeId}?startDate=${startISO}&endDate=${endISO}`;
      console.log("[TourRequestModal] Fetching from:", url);
      
      const response = await fetch(url);
      
      console.log("[TourRequestModal] Available slots response status:", response.status);
      
      if (!response.ok) {
        console.error("[TourRequestModal] Failed to fetch slots, status:", response.status);
        throw new Error("Failed to fetch available time slots");
      }
      
      const data = await response.json();
      console.log("[TourRequestModal] Available slots data:", data);
      
      if (data.success && data.suggestions) {
        // Convert suggestions to TimeSlot format
        const slots: TimeSlot[] = data.suggestions.map((suggestion: any) => ({
          time: suggestion.time,
          available: true,
          reason: suggestion.reason || "Available",
        }));
        
        console.log("[TourRequestModal] Converted slots:", slots);
        setAvailableSlots(slots);
        setCurrentStep("time-slots");
      } else {
        console.error("[TourRequestModal] Invalid response format:", data);
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("[TourRequestModal] Error fetching time slots:", err);
      if (err instanceof Error) {
        console.error("[TourRequestModal] Error stack:", err.stack);
      }
      setError(err instanceof Error ? err.message : "Failed to load time slots");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit tour request
  const submitTourRequest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate required data before making API call
      console.log("[TourRequestModal] Starting tour submission...");
      console.log("[TourRequestModal] homeId:", homeId);
      console.log("[TourRequestModal] selectedSlot:", selectedSlot);
      console.log("[TourRequestModal] familyNotes:", familyNotes);
      
      if (!homeId) {
        const errorMsg = "Home ID is missing";
        console.error("[TourRequestModal] ERROR:", errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!selectedSlot) {
        const errorMsg = "No time slot selected";
        console.error("[TourRequestModal] ERROR:", errorMsg);
        throw new Error(errorMsg);
      }
      
      // Ensure selectedSlot is a valid ISO datetime string
      let isoDateTime: string;
      try {
        isoDateTime = new Date(selectedSlot).toISOString();
        console.log("[TourRequestModal] Converted slot to ISO:", isoDateTime);
      } catch (dateErr) {
        const errorMsg = "Invalid time slot format";
        console.error("[TourRequestModal] ERROR:", errorMsg, dateErr);
        throw new Error(errorMsg);
      }
      
      const requestBody = {
        homeId,
        requestedTimes: [isoDateTime],
        familyNotes: familyNotes || undefined,
      };
      
      console.log("[TourRequestModal] Request body:", JSON.stringify(requestBody, null, 2));
      console.log("[TourRequestModal] Making API call to /api/family/tours/request");
      
      const response = await fetch("/api/family/tours/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("[TourRequestModal] Response status:", response.status);
      console.log("[TourRequestModal] Response ok:", response.ok);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error("[TourRequestModal] API error response:", errorData);
        } catch (parseErr) {
          console.error("[TourRequestModal] Failed to parse error response:", parseErr);
          throw new Error(`Server error (${response.status})`);
        }
        throw new Error(errorData.error || `Failed to submit tour request (${response.status})`);
      }
      
      const data = await response.json();
      console.log("[TourRequestModal] API response data:", data);
      
      if (data.success) {
        console.log("[TourRequestModal] Tour request created successfully!");
        setSuccess(true);
        setCurrentStep("confirmation");
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        }, 2000);
      } else {
        const errorMsg = "API returned success=false";
        console.error("[TourRequestModal] ERROR:", errorMsg, data);
        throw new Error(errorMsg);
      }
    } catch (err) {
      // Log the complete error details
      console.error("[TourRequestModal] CAUGHT ERROR:", err);
      if (err instanceof Error) {
        console.error("[TourRequestModal] Error name:", err.name);
        console.error("[TourRequestModal] Error message:", err.message);
        console.error("[TourRequestModal] Error stack:", err.stack);
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to submit request";
      console.error("[TourRequestModal] Setting error message:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log("[TourRequestModal] Request completed, loading state cleared");
    }
  };

  // Navigation handlers
  const handleNext = () => {
    console.log("[TourRequestModal] handleNext called, currentStep:", currentStep);
    
    if (currentStep === "date-range") {
      if (!startDate || !endDate) {
        const errorMsg = "Please select both start and end dates";
        console.log("[TourRequestModal] Validation error:", errorMsg);
        setError(errorMsg);
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        const errorMsg = "End date must be after start date";
        console.log("[TourRequestModal] Validation error:", errorMsg);
        setError(errorMsg);
        return;
      }
      console.log("[TourRequestModal] Date range valid, fetching time slots");
      fetchTimeSlots();
    } else if (currentStep === "time-slots") {
      if (!selectedSlot) {
        const errorMsg = "Please select a time slot";
        console.log("[TourRequestModal] Validation error:", errorMsg);
        setError(errorMsg);
        return;
      }
      console.log("[TourRequestModal] Time slot selected:", selectedSlot);
      console.log("[TourRequestModal] Moving to notes step");
      setCurrentStep("notes");
    } else if (currentStep === "notes") {
      console.log("[TourRequestModal] Submitting tour request from notes step");
      submitTourRequest();
    }
  };

  const handleBack = () => {
    if (currentStep === "time-slots") {
      setCurrentStep("date-range");
    } else if (currentStep === "notes") {
      setCurrentStep("time-slots");
    }
  };

  // Step indicator
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
        {/* Backdrop */}
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
                  className="flex items-center justify-between border-b border-gray-200 pb-4"
                >
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Schedule a Tour
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{homeName}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
                            className={`relative ${
                              index !== steps.length - 1 ? "flex-1" : ""
                            }`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                  index <= currentStepIndex
                                    ? "border-primary-600 bg-primary-600"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {index < currentStepIndex ? (
                                  <FiCheckCircle className="h-5 w-5 text-white" />
                                ) : (
                                  <span
                                    className={`text-sm font-medium ${
                                      index === currentStepIndex
                                        ? "text-white"
                                        : "text-gray-500"
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
                                    : "text-gray-500"
                                }`}
                              >
                                {step.label}
                              </span>
                              {index !== steps.length - 1 && (
                                <div
                                  className={`ml-4 h-0.5 flex-1 ${
                                    index < currentStepIndex
                                      ? "bg-primary-600"
                                      : "bg-gray-300"
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
                        <label className="block text-sm font-medium text-gray-700">
                          <FiCalendar className="mr-1 inline h-4 w-4" />
                          Select Date Range
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          Choose the date range you'd like to visit (next 30 days)
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              min={format(new Date(), "yyyy-MM-dd")}
                              max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              disabled={isLoading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate || format(new Date(), "yyyy-MM-dd")}
                              max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <FiClock className="mr-1 inline h-4 w-4" />
                          Select a Time Slot
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          Our AI has suggested the best times based on availability
                        </p>
                      </div>
                      {availableSlots.length > 0 ? (
                        <TimeSlotSelector
                          slots={availableSlots}
                          selectedSlot={selectedSlot}
                          onSelect={setSelectedSlot}
                        />
                      ) : (
                        <div className="rounded-md bg-yellow-50 p-4">
                          <div className="flex">
                            <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                No available time slots found for the selected date
                                range. Please try a different date range.
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
                        <label className="block text-sm font-medium text-gray-700">
                          <FiMessageSquare className="mr-1 inline h-4 w-4" />
                          Add Notes or Questions (Optional)
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          Let us know if you have any specific questions or requirements
                        </p>
                        <textarea
                          value={familyNotes}
                          onChange={(e) => setFamilyNotes(e.target.value)}
                          rows={5}
                          placeholder="e.g., I'd like to see the dining area and meet some residents..."
                          className="mt-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          disabled={isLoading}
                        />
                      </div>
                      
                      {/* Summary */}
                      <div className="rounded-md bg-gray-50 p-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          Tour Summary
                        </h4>
                        <dl className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Home:</dt>
                            <dd className="font-medium text-gray-900">{homeName}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Requested Time:</dt>
                            <dd className="font-medium text-gray-900">
                              {selectedSlot
                                ? format(
                                    new Date(selectedSlot),
                                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                                  )
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
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <FiCheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Tour Request Submitted!
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Your tour request has been sent to {homeName}. They will
                        confirm your appointment shortly.
                      </p>
                      <p className="mt-4 text-xs text-gray-500">
                        You'll receive an email confirmation once the tour is confirmed.
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <FiAlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
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
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                          {currentStep === "date-range"
                            ? "Loading..."
                            : "Submitting..."}
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
