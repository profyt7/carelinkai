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

  // Component mount logging (using console.error for production visibility)
  useEffect(() => {
    console.error("\n╔══════════════════════════════════════════════════════════╗");
    console.error("║  🟢 TourRequestModal - COMPONENT MOUNTED               ║");
    console.error("╚══════════════════════════════════════════════════════════╝\n");
    console.error("📍 [MOUNT] Component initialized with props:");
    console.error("  ├─ isOpen:", isOpen);
    console.error("  ├─ homeId:", homeId);
    console.error("  ├─ homeName:", homeName);
    console.error("  └─ onSuccess callback:", !!onSuccess);
    
    return () => {
      console.error("\n🔴 [UNMOUNT] TourRequestModal component unmounting\n");
    };
  }, []);

  // Log when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.error("\n╔══════════════════════════════════════════════════════════╗");
      console.error("║  🚪 MODAL OPENED                                        ║");
      console.error("╚══════════════════════════════════════════════════════════╝\n");
      console.error("📍 [MODAL OPEN] State at open:");
      console.error("  ├─ homeId:", homeId);
      console.error("  ├─ homeName:", homeName);
      console.error("  ├─ currentStep:", currentStep);
      console.error("  └─ isLoading:", isLoading);
    } else {
      console.error("\n🚪 [MODAL CLOSE] Modal closed\n");
    }
  }, [isOpen]);

  // Reset state when modal closes
  const handleClose = () => {
    console.error("\n🚪 [HANDLE CLOSE] handleClose() called");
    console.error("  ├─ isLoading:", isLoading);
    console.error("  └─ success:", success);
    
    // Prevent closing during submission
    if (isLoading) {
      console.error("⚠️ [HANDLE CLOSE] BLOCKED - Cannot close during submission");
      return;
    }
    
    console.error("✅ [HANDLE CLOSE] Closing modal and resetting state");
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
      console.error("[TourRequestModal] Fetching time slots...");
      console.error("[TourRequestModal] startDate:", startDate);
      console.error("[TourRequestModal] endDate:", endDate);
      console.error("[TourRequestModal] homeId:", homeId);
      
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();
      
      console.error("[TourRequestModal] startISO:", startISO);
      console.error("[TourRequestModal] endISO:", endISO);
      
      const url = `/api/family/tours/available-slots/${homeId}?startDate=${startISO}&endDate=${endISO}`;
      console.error("[TourRequestModal] Fetching from:", url);
      
      const response = await fetch(url);
      
      console.error("[TourRequestModal] Available slots response status:", response.status);
      
      if (!response.ok) {
        console.error("[TourRequestModal] Failed to fetch slots, status:", response.status);
        throw new Error("Failed to fetch available time slots");
      }
      
      const data = await response.json();
      console.error("[TourRequestModal] Available slots data:", data);
      
      if (data.success && data.suggestions) {
        // DEFENSIVE: Validate suggestions is an array
        if (!Array.isArray(data.suggestions)) {
          console.error("[TourRequestModal] Suggestions is not an array:", data.suggestions);
          throw new Error("Invalid response format: suggestions must be an array");
        }
        
        // Convert suggestions to TimeSlot format with validation
        console.error("[TourRequestModal] Raw suggestions from API:", data.suggestions);
        console.error("[TourRequestModal] Number of suggestions:", data.suggestions.length);
        
        const slots: TimeSlot[] = data.suggestions
          .filter((suggestion: any) => {
            // Validate slot has required time field
            if (!suggestion) {
              console.error("[TourRequestModal] Slot is null/undefined");
              return false;
            }
            
            if (!suggestion.time) {
              console.error("[TourRequestModal] Slot missing time field:", suggestion);
              return false;
            }
            
            // Validate time is a string
            if (typeof suggestion.time !== 'string') {
              console.error("[TourRequestModal] Time field is not a string:", typeof suggestion.time, suggestion);
              return false;
            }
            
            // Validate time is a valid date
            const date = new Date(suggestion.time);
            if (isNaN(date.getTime())) {
              console.error("[TourRequestModal] Invalid date string:", suggestion.time);
              return false;
            }
            
            // NOTE: reasoning/reason field is INFORMATIONAL only - not used for validation
            // NOTE: available field is set by frontend - not used for validation
            console.error("[TourRequestModal] ✅ Valid slot:", suggestion.time);
            return true;
          })
          .map((suggestion: any) => ({
            time: suggestion.time,
            available: true,
            reason: suggestion.reason || "Available",
          }));
        
        console.error("[TourRequestModal] Filtered valid slots:", slots.length);
        console.error("[TourRequestModal] Converted slots:", slots);
        
        // DEFENSIVE: Check if we have any valid slots
        if (slots.length === 0) {
          console.error("[TourRequestModal] ❌ WARNING: No valid slots after filtering!");
          console.error("[TourRequestModal] Original suggestions:", data.suggestions);
        }
        
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
    console.error("\n╔══════════════════════════════════════════════════════════╗");
    console.error("║  🚀 TOUR SUBMISSION - FRONTEND START                    ║");
    console.error("╚══════════════════════════════════════════════════════════╝\n");
    
    setIsLoading(true);
    setError(null);
    
    try {
      // === STEP 1: Validate Input Data ===
      console.error("📋 [STEP 1] Validating Input Data");
      console.error("  ├─ homeId:", homeId);
      console.error("  ├─ homeName:", homeName);
      console.error("  ├─ selectedSlot:", selectedSlot);
      console.error("  ├─ familyNotes:", familyNotes || "(empty)");
      console.error("  └─ familyNotes length:", familyNotes?.length || 0);
      
      if (!homeId) {
        const errorMsg = "Home ID is missing";
        console.error("  ❌ VALIDATION FAILED:", errorMsg);
        throw new Error(errorMsg);
      }
      console.error("  ✅ homeId is valid");
      
      if (!selectedSlot) {
        const errorMsg = "No time slot selected";
        console.error("  ❌ VALIDATION FAILED:", errorMsg);
        throw new Error(errorMsg);
      }
      console.error("  ✅ selectedSlot is present");
      
      // === STEP 2: Convert Date/Time ===
      console.error("\n🕐 [STEP 2] Converting Date/Time");
      console.error("  ├─ Input selectedSlot:", selectedSlot);
      console.error("  ├─ Type of selectedSlot:", typeof selectedSlot);
      
      let isoDateTime: string;
      try {
        const dateObj = new Date(selectedSlot);
        console.error("  ├─ Created Date object:", dateObj);
        console.error("  ├─ Date is valid:", !isNaN(dateObj.getTime()));
        
        isoDateTime = dateObj.toISOString();
        console.error("  ├─ Converted to ISO:", isoDateTime);
        console.error("  └─ ISO string length:", isoDateTime.length);
      } catch (dateErr) {
        const errorMsg = "Invalid time slot format";
        console.error("  ❌ DATE CONVERSION FAILED:", errorMsg);
        console.error("  ├─ Error:", dateErr);
        throw new Error(errorMsg);
      }
      console.error("  ✅ Date conversion successful");
      
      // === STEP 3: Prepare Request Body ===
      console.error("\n📦 [STEP 3] Preparing Request Body");
      
      const requestBody = {
        homeId,
        requestedTimes: [isoDateTime],
        familyNotes: familyNotes || undefined,
      };
      
      console.error("  ├─ Request body structure:");
      console.error("  │  ├─ homeId:", requestBody.homeId);
      console.error("  │  ├─ requestedTimes:", requestBody.requestedTimes);
      console.error("  │  └─ familyNotes:", requestBody.familyNotes || "(undefined)");
      console.error("  ├─ Full JSON:");
      console.error(JSON.stringify(requestBody, null, 2));
      console.error("  └─ JSON string length:", JSON.stringify(requestBody).length);
      console.error("  ✅ Request body prepared");
      
      // === STEP 4: Make API Call ===
      console.error("\n🌐 [STEP 4] Making API Call");
      console.error("  ├─ URL: /api/family/tours/request");
      console.error("  ├─ Method: POST");
      console.error("  ├─ Content-Type: application/json");
      console.error("  └─ Sending request...");
      
      const requestStartTime = Date.now();
      
      let response;
      try {
        response = await fetch("/api/family/tours/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        
        const requestDuration = Date.now() - requestStartTime;
        console.error("  ├─ Request completed in:", requestDuration, "ms");
      } catch (fetchErr) {
        console.error("  ❌ FETCH FAILED:", fetchErr);
        if (fetchErr instanceof Error) {
          console.error("  ├─ Error name:", fetchErr.name);
          console.error("  ├─ Error message:", fetchErr.message);
          console.error("  └─ Error stack:", fetchErr.stack);
        }
        throw new Error("Network request failed: " + (fetchErr instanceof Error ? fetchErr.message : "Unknown error"));
      }
      
      // === STEP 5: Process Response ===
      console.error("\n📨 [STEP 5] Processing Response");
      console.error("  ├─ Response status:", response.status);
      console.error("  ├─ Response statusText:", response.statusText);
      console.error("  ├─ Response ok:", response.ok);
      console.error("  ├─ Response type:", response.type);
      console.error("  ├─ Response headers:");
      
      response.headers.forEach((value, key) => {
        console.error(`  │  ├─ ${key}: ${value}`);
      });
      
      if (!response.ok) {
        console.error("  ❌ RESPONSE NOT OK - Status:", response.status);
        
        let errorData;
        try {
          const errorText = await response.text();
          console.error("  ├─ Raw error response:", errorText);
          
          try {
            errorData = JSON.parse(errorText);
            console.error("  ├─ Parsed error data:", errorData);
          } catch (jsonErr) {
            console.error("  ├─ Could not parse as JSON");
            errorData = { error: errorText };
          }
        } catch (parseErr) {
          console.error("  ├─ Failed to read error response:", parseErr);
          throw new Error(`Server error (${response.status})`);
        }
        
        const errorMsg = errorData.error || `Failed to submit tour request (${response.status})`;
        console.error("  └─ Error message:", errorMsg);
        throw new Error(errorMsg);
      }
      
      console.error("  ✅ Response status is OK");
      
      // === STEP 6: Parse Response Data ===
      console.error("\n📄 [STEP 6] Parsing Response Data");
      
      let data;
      try {
        const responseText = await response.text();
        console.error("  ├─ Raw response text:", responseText);
        console.error("  ├─ Response text length:", responseText.length);
        
        data = JSON.parse(responseText);
        console.error("  ├─ Parsed JSON successfully");
        console.error("  ├─ Response data:");
        console.error(JSON.stringify(data, null, 2));
      } catch (parseErr) {
        console.error("  ❌ JSON PARSE FAILED:", parseErr);
        throw new Error("Failed to parse server response");
      }
      
      console.error("  ✅ Response data parsed");
      
      // === STEP 7: Verify Success ===
      console.error("\n✅ [STEP 7] Verifying Success");
      console.error("  ├─ data.success:", data.success);
      console.error("  ├─ data.tourRequest:", !!data.tourRequest);
      
      if (data.success) {
        console.error("  ├─ Tour request details:");
        if (data.tourRequest) {
          console.error("  │  ├─ id:", data.tourRequest.id);
          console.error("  │  ├─ homeId:", data.tourRequest.homeId);
          console.error("  │  ├─ homeName:", data.tourRequest.homeName);
          console.error("  │  ├─ status:", data.tourRequest.status);
          console.error("  │  └─ requestedTimes:", data.tourRequest.requestedTimes);
        }
        
        console.error("\n╔══════════════════════════════════════════════════════════╗");
        console.error("║  ✅ TOUR SUBMISSION - SUCCESS!                          ║");
        console.error("╚══════════════════════════════════════════════════════════╝\n");
        
        setSuccess(true);
        setCurrentStep("confirmation");
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          if (onSuccess) {
            console.error("  └─ Calling onSuccess callback");
            onSuccess();
          }
          console.error("  └─ Closing modal");
          handleClose();
        }, 2000);
      } else {
        const errorMsg = "API returned success=false";
        console.error("  ❌ SUCCESS CHECK FAILED:", errorMsg);
        console.error("  └─ Response data:", data);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("\n╔══════════════════════════════════════════════════════════╗");
      console.error("║  ❌ TOUR SUBMISSION - ERROR CAUGHT                       ║");
      console.error("╚══════════════════════════════════════════════════════════╝\n");
      
      console.error("🚨 [ERROR HANDLER] Caught exception in tour submission");
      console.error("  ├─ Error type:", err?.constructor?.name || "Unknown");
      console.error("  ├─ Error:", err);
      
      if (err instanceof Error) {
        console.error("  ├─ Error name:", err.name);
        console.error("  ├─ Error message:", err.message);
        console.error("  ├─ Error stack:");
        console.error(err.stack);
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to submit request";
      console.error("  ├─ Setting error message:", errorMessage);
      console.error("  └─ Displaying error to user");
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.error("\n🏁 [FINALLY] Tour submission process completed");
      console.error("  └─ Loading state cleared\n");
    }
  };

  // Navigation handlers
  const handleNext = () => {
    try {
      // 🔴🔴🔴 CRITICAL: LOG AT THE VERY FIRST LINE TO CATCH BUTTON CLICK
      console.error("\n╔══════════════════════════════════════════════════════════╗");
      console.error("║  🔴 BUTTON CLICKED - handleNext() CALLED               ║");
      console.error("╚══════════════════════════════════════════════════════════╝\n");
      
      console.error("🔴 [BUTTON CLICK] Function entry - handler is executing!");
      console.error("🔴 [STATE SNAPSHOT] Current state at button click:");
      console.error("  ├─ currentStep:", currentStep);
      console.error("  ├─ homeId:", homeId);
      console.error("  ├─ homeName:", homeName);
      console.error("  ├─ selectedSlot:", selectedSlot);
      console.error("  ├─ familyNotes:", familyNotes || "(empty)");
      console.error("  ├─ startDate:", startDate);
      console.error("  ├─ endDate:", endDate);
      console.error("  ├─ isLoading:", isLoading);
      console.error("  ├─ error:", error);
      console.error("  └─ success:", success);
      
      console.error("\n🔴 [FLOW CHECK] Checking which step we're in...");
      console.error("[TourRequestModal] handleNext called, currentStep:", currentStep);
    
    if (currentStep === "date-range") {
      console.error("🔴 [FLOW] Inside date-range branch");
      if (!startDate || !endDate) {
        const errorMsg = "Please select both start and end dates";
        console.error("[TourRequestModal] Validation error:", errorMsg);
        setError(errorMsg);
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        const errorMsg = "End date must be after start date";
        console.error("[TourRequestModal] Validation error:", errorMsg);
        setError(errorMsg);
        return;
      }
      console.error("[TourRequestModal] Date range valid, fetching time slots");
      fetchTimeSlots();
    } else if (currentStep === "time-slots") {
      console.error("🔴 [FLOW] Inside time-slots branch");
      if (!selectedSlot) {
        const errorMsg = "Please select a time slot";
        console.error("🔴 [VALIDATION ERROR] No time slot selected:", errorMsg);
        setError(errorMsg);
        return;
      }
      console.error("🔴 [FLOW] Time slot selected:", selectedSlot);
      console.error("🔴 [FLOW] Moving to notes step");
      setCurrentStep("notes");
    } else if (currentStep === "notes") {
      console.error("🔴 [FLOW] Inside notes branch - ABOUT TO SUBMIT!");
      console.error("🔴 [PRE-SUBMIT CHECK]");
      console.error("  ├─ homeId exists:", !!homeId);
      console.error("  ├─ selectedSlot exists:", !!selectedSlot);
      console.error("  ├─ isLoading:", isLoading);
      console.error("  └─ About to call submitTourRequest()...");
      
      console.error("\n🔴 [CALLING] submitTourRequest() NOW...\n");
      submitTourRequest();
      console.error("🔴 [AFTER CALL] submitTourRequest() was invoked (may be async)");
    } else {
      console.error("🔴 [ERROR] Unknown step:", currentStep);
    }
    } catch (err) {
      console.error("\n╔══════════════════════════════════════════════════════════╗");
      console.error("║  🚨 CRITICAL ERROR IN handleNext()                      ║");
      console.error("╚══════════════════════════════════════════════════════════╝\n");
      console.error("🚨 [EXCEPTION CAUGHT] Error in handleNext:", err);
      if (err instanceof Error) {
        console.error("  ├─ Error name:", err.name);
        console.error("  ├─ Error message:", err.message);
        console.error("  └─ Error stack:", err.stack);
      }
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
