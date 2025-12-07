"use client";

/**
 * RequestCareButton Component
 * Renders a "Request Care" button that opens the inquiry modal
 * Handles authentication and role checks
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import InquiryForm from "./InquiryForm";
import { canSubmitInquiry, getInquiryErrorMessage } from "@/lib/inquiry-auth";

type RequestCareButtonProps = {
  targetType: "AIDE" | "PROVIDER";
  targetId: string;
  targetName: string;
  className?: string;
};

export default function RequestCareButton({
  targetType,
  targetId,
  targetName,
  className = "",
}: RequestCareButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
    setErrorMessage(null);

    // Get current page URL for return after login
    const currentUrl = window.location.pathname + window.location.search;

    // Check if user can submit inquiry
    const authCheck = canSubmitInquiry(session, currentUrl);

    if (!authCheck.canSubmit) {
      if (authCheck.redirectUrl) {
        // Redirect to login
        router.push(authCheck.redirectUrl);
      } else {
        // Show error message
        setErrorMessage(getInquiryErrorMessage(authCheck));
      }
      return;
    }

    // All checks passed - open modal
    setShowModal(true);
  };

  const handleSuccess = (leadId: string) => {
    console.log("Lead created:", leadId);
    // Could redirect to leads page or show success message
    // router.push('/operator/leads');
  };

  const handleClose = () => {
    setShowModal(false);
    setErrorMessage(null);
  };

  return (
    <>
      {/* Request Care Button */}
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className={
          className ||
          "w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
        }
      >
        <FiHeart className="mr-2 h-5 w-5" />
        {status === "loading" ? "Loading..." : "Request Care"}
      </button>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{errorMessage}</p>
          {session?.user?.role && session.user.role !== "FAMILY" && (
            <p className="text-xs text-red-600 mt-1">
              Currently logged in as: {session.user.role}
            </p>
          )}
        </div>
      )}

      {/* Inquiry Modal */}
      {showModal && (
        <InquiryForm
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      )}
    </>
  );
}
