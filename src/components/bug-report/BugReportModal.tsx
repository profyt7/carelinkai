"use client";

import { useState, useEffect, Fragment } from "react";
import { useSession } from "next-auth/react";
import { Dialog, Transition } from "@headlessui/react";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    severity: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    screenshotUrl: "",
    userEmail: "",
    userName: "",
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData({
          title: "",
          description: "",
          stepsToReproduce: "",
          severity: "MEDIUM",
          screenshotUrl: "",
          userEmail: "",
          userName: "",
        });
        setError(null);
        setSuccess(false);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Capture browser and device info
      const browserInfo = navigator.userAgent;
      const deviceInfo = `${window.screen.width}x${window.screen.height}`;
      const pageUrl = window.location.href;

      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          browserInfo,
          deviceInfo,
          pageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit bug report");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Bug Report Submitted!
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500">
                      Thank you for reporting this issue. We'll look into it as soon as possible.
                    </p>
                  </div>
                ) : (
                  <>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 mb-4"
                    >
                      🐛 Report a Bug
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Title */}
                      <div>
                        <label
                          htmlFor="title"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Bug Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="title"
                          required
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Brief summary of the issue"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="description"
                          required
                          rows={4}
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Describe what went wrong..."
                        />
                      </div>

                      {/* Steps to Reproduce */}
                      <div>
                        <label
                          htmlFor="steps"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Steps to Reproduce (Optional)
                        </label>
                        <textarea
                          id="steps"
                          rows={3}
                          value={formData.stepsToReproduce}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stepsToReproduce: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="1. Go to...\n2. Click on...\n3. See error..."
                        />
                      </div>

                      {/* Severity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Severity <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          {["LOW", "MEDIUM", "HIGH"].map((severity) => (
                            <label key={severity} className="flex items-center">
                              <input
                                type="radio"
                                name="severity"
                                value={severity}
                                checked={formData.severity === severity}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    severity: e.target.value as any,
                                  })
                                }
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {severity}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Screenshot URL */}
                      <div>
                        <label
                          htmlFor="screenshot"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Screenshot URL (Optional)
                        </label>
                        <input
                          type="url"
                          id="screenshot"
                          value={formData.screenshotUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              screenshotUrl: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="https://..."
                        />
                      </div>

                      {/* User Info (if not logged in) */}
                      {!session && (
                        <>
                          <div>
                            <label
                              htmlFor="email"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Your Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              id="email"
                              required
                              value={formData.userEmail}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  userEmail: e.target.value,
                                })
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              placeholder="your@email.com"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="name"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Your Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="name"
                              required
                              value={formData.userName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  userName: e.target.value,
                                })
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              placeholder="John Doe"
                            />
                          </div>
                        </>
                      )}

                      {/* Error Message */}
                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-red-800">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Bug Report"}
                        </button>
                      </div>
                    </form>
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
