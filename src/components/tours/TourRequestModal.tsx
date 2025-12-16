/**
 * Tour Request Modal Component
 * Allows families to request tours with AI-suggested times
 */

"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface TourRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeId: string;
  homeName: string;
}

interface TimeSlot {
  dateTime: Date;
  dayOfWeek: string;
  timeSlot: string;
  score: number;
  reasoning: string;
}

export default function TourRequestModal({
  isOpen,
  onClose,
  homeId,
  homeName,
}: TourRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select times, 2: Add notes, 3: Confirm
  const [aiSuggestions, setAiSuggestions] = useState<TimeSlot[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [familyNotes, setFamilyNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch AI suggestions when modal opens
  useEffect(() => {
    if (isOpen && step === 1) {
      fetchSuggestions();
    }
  }, [isOpen, homeId]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/family/tours/available-slots/${homeId}?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      setAiSuggestions(
        data.suggestions.map((s: any) => ({
          ...s,
          dateTime: new Date(s.dateTime),
        }))
      );
    } catch (err) {
      setError("Failed to load available times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/family/tours/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId,
          requestedTimes: selectedTimes,
          familyNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit tour request");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload(); // Refresh to show new tour
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTime = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter((t) => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedTimes([]);
    setFamilyNotes("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={resetAndClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {success ? (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-6xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Tour Request Submitted!
                    </h3>
                    <p className="text-gray-600">
                      We'll notify you once the operator confirms your tour.
                    </p>
                  </div>
                ) : (
                  <>
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold leading-6 text-gray-900 mb-4"
                    >
                      Schedule a Tour at {homeName}
                    </Dialog.Title>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mb-6">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              step >= s
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {s}
                          </div>
                          {s < 3 && (
                            <div
                              className={`h-1 w-20 mx-2 ${
                                step > s ? "bg-indigo-600" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {error && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Step 1: Select Times */}
                    {step === 1 && (
                      <div>
                        <p className="text-gray-600 mb-4">
                          Select one or more preferred times for your tour. Our AI has suggested optimal times based on availability and historical data.
                        </p>

                        {loading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading available times...</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {aiSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  toggleTime(suggestion.dateTime.toISOString())
                                }
                                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                                  selectedTimes.includes(
                                    suggestion.dateTime.toISOString()
                                  )
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 hover:border-indigo-300"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {suggestion.dayOfWeek},{" "}
                                      {suggestion.dateTime.toLocaleDateString()}
                                    </div>
                                    <div className="text-lg text-indigo-600 font-medium">
                                      {suggestion.timeSlot}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {suggestion.reasoning}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {suggestion.score}% Match
                                    </span>
                                    {selectedTimes.includes(
                                      suggestion.dateTime.toISOString()
                                    ) && (
                                      <span className="mt-2 text-indigo-600 text-xl">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-6 flex justify-between">
                          <button
                            onClick={resetAndClose}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setStep(2)}
                            disabled={selectedTimes.length === 0}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Add Notes */}
                    {step === 2 && (
                      <div>
                        <p className="text-gray-600 mb-4">
                          Add any questions or special requests for your tour.
                        </p>

                        <textarea
                          value={familyNotes}
                          onChange={(e) => setFamilyNotes(e.target.value)}
                          placeholder="E.g., I'd like to see the memory care unit, meet with staff, learn about activities..."
                          rows={5}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />

                        <div className="mt-6 flex justify-between">
                          <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                          >
                            Back
                          </button>
                          <button
                            onClick={() => setStep(3)}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                      <div>
                        <p className="text-gray-600 mb-4">
                          Review your tour request before submitting.
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Selected Times:
                          </h4>
                          <ul className="space-y-2">
                            {selectedTimes.map((time, idx) => {
                              const date = new Date(time);
                              return (
                                <li key={idx} className="text-gray-700">
                                  • {date.toLocaleString()}
                                </li>
                              );
                            })}
                          </ul>

                          {familyNotes && (
                            <>
                              <h4 className="font-semibold text-gray-900 mt-4 mb-2">
                                Your Notes:
                              </h4>
                              <p className="text-gray-700">{familyNotes}</p>
                            </>
                          )}
                        </div>

                        <div className="mt-6 flex justify-between">
                          <button
                            onClick={() => setStep(2)}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                            disabled={loading}
                          >
                            Back
                          </button>
                          <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                          >
                            {loading ? "Submitting..." : "Submit Request"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
