"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiSend, FiCalendar, FiAlertCircle, FiDollarSign } from "react-icons/fi";
import { MessageSquare } from "lucide-react";

interface ApplicationActionsProps {
  applicationId: string;
  onActionComplete?: () => void;
}

const HIRE_FEE_DOLLARS = parseInt(
  process.env.NEXT_PUBLIC_MARKETPLACE_HIRE_FEE_DOLLARS ?? "250",
  10
);

function HireConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center flex-shrink-0">
            <FiDollarSign className="h-5 w-5 text-warning-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Confirm Hire</h3>
            <p className="text-sm text-neutral-500 mt-0.5">A marketplace hire fee will be charged</p>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-4 mb-5 border border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Marketplace hire fee</span>
            <span className="text-base font-bold text-neutral-900">${HIRE_FEE_DOLLARS}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            This fee is collected on your next billing cycle and covers the cost of connecting you with this caregiver through CareLinkAI.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Processing…" : `Confirm Hire ($${HIRE_FEE_DOLLARS})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationActions({
  applicationId,
  onActionComplete,
}: ApplicationActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<"INVITE" | "INTERVIEW" | "OFFER" | "HIRE" | "REJECT">("INVITE");
  const [message, setMessage] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const submitAction = async (confirmedAction: string) => {
    setIsSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmedAction,
          message: message.trim() || undefined,
          interviewAt: interviewAt ? new Date(interviewAt).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update application");
      }

      setAction("INVITE");
      setMessage("");
      setInterviewAt("");
      setShowHireModal(false);
      setSuccess(
        confirmedAction === "HIRE"
          ? `Caregiver hired! A $${HIRE_FEE_DOLLARS} fee has been queued for your next billing cycle.`
          : "Application updated successfully"
      );

      if (onActionComplete) onActionComplete();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "HIRE") {
      setShowHireModal(true);
    } else {
      await submitAction(action);
    }
  };

  return (
    <>
      {showHireModal && (
        <HireConfirmModal
          onConfirm={() => submitAction("HIRE")}
          onCancel={() => setShowHireModal(false)}
          loading={isSubmitting}
        />
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Update Application Status</h3>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-error-50 text-error-700 rounded-lg text-sm border border-error-200">
            <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-success-50 text-success-700 rounded-lg text-sm border border-success-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="action" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Action
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-white"
              disabled={isSubmitting}
            >
              <option value="INVITE">Invite to Connect</option>
              <option value="INTERVIEW">Schedule Interview</option>
              <option value="OFFER">Make Offer</option>
              <option value="HIRE">Hire Caregiver</option>
              <option value="REJECT">Decline Application</option>
            </select>

            {action === "HIRE" && (
              <p className="mt-1.5 text-xs text-warning-600 flex items-center gap-1">
                <FiDollarSign className="h-3 w-3" />
                A ${HIRE_FEE_DOLLARS} hire fee will be charged to your next invoice.
              </p>
            )}
          </div>

          {action === "INTERVIEW" && (
            <div className="mb-3">
              <label htmlFor="interviewAt" className="flex items-center text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                <FiCalendar className="mr-1 text-neutral-400" size={12} />
                Interview Date & Time
              </label>
              <input
                type="datetime-local"
                id="interviewAt"
                value={interviewAt}
                onChange={(e) => setInterviewAt(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="message" className="flex items-center text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              <MessageSquare className="mr-1 text-neutral-400" size={12} />
              Message (optional)
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                action === "INVITE" ? "Add a personal message to your invitation…" :
                action === "INTERVIEW" ? "Include any details about the interview…" :
                action === "OFFER" ? "Describe the offer and any important details…" :
                action === "HIRE" ? "Add a message to the caregiver about next steps…" :
                "Provide a reason for declining (optional)…"
              }
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === "HIRE"
                  ? "bg-success-500 hover:bg-success-600 text-white"
                  : action === "REJECT"
                  ? "bg-error-500 hover:bg-error-600 text-white"
                  : "bg-primary-500 hover:bg-primary-600 text-white"
              }`}
            >
              <FiSend size={14} />
              {isSubmitting ? "Processing…" : action === "HIRE" ? "Hire Caregiver" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
