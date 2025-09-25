"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiUser, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

interface ListingActionsProps {
  listingId: string;
  postedByUserId: string;
  applicationCount: number;
  hireCount: number;
  status: string;
  appliedByMe?: boolean;
}

export default function ListingActions({
  listingId,
  postedByUserId,
  applicationCount,
  hireCount,
  status,
  appliedByMe = false,
}: ListingActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const [applicationNote, setApplicationNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Check if listing is closed or hired
  const isListingClosed = status === "CLOSED" || status === "HIRED";
  
  // Check if current user is the listing owner
  const isOwner = session?.user?.id === postedByUserId;
  
  // Check if current user is a caregiver
  const isCaregiver = session?.user?.role === "CAREGIVER";

  // Handle application submission
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      const response = await fetch("/api/marketplace/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          note: applicationNote,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit application");
      }
      
      setSubmitSuccess(true);
      setApplicationNote("");
      setIsApplying(false);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not logged in
  if (!session) {
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="bg-gray-50 p-4 rounded-md text-center">
          <p className="text-gray-700 mb-3">
            Please log in to apply for this position or manage your listing.
          </p>
          <Link
            href={`/auth/login?callbackUrl=${encodeURIComponent(`/marketplace/listings/${listingId}`)}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Listing owner view
  if (isOwner) {
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Listing Management</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-2xl font-bold text-gray-800">{applicationCount}</div>
              <div className="text-sm text-gray-500">Applications</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-2xl font-bold text-gray-800">{hireCount}</div>
              <div className="text-sm text-gray-500">Hires</div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/marketplace/listings/${listingId}/applications`}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Applications
            </Link>
            <Link
              href={`/marketplace/listings/${listingId}/edit`}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Edit Listing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Caregiver view
  if (isCaregiver) {
    // Show success or already-applied message
    if (submitSuccess || appliedByMe) {
      return (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="bg-green-50 p-4 rounded-md flex items-start justify-between">
            <FiCheckCircle className="text-green-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="text-green-800 font-medium">Application Submitted</h3>
              <p className="text-green-700 mt-1">
                Your application has been submitted successfully. The listing owner will be notified and may contact you.
              </p>
            </div>
            <button
              className="ml-4 inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm text-green-700 border border-green-300 hover:bg-green-100"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/marketplace/applications?listingId=${encodeURIComponent(listingId)}`, { method: 'DELETE' });
                  if (!res.ok) throw new Error('Failed to withdraw');
                  setSubmitSuccess(false);
                  // Trigger a refresh to update counts and state
                  router.refresh();
                } catch {
                  // swallow error for now or add toast
                }
              }}
            >
              Withdraw
            </button>
          </div>
        </div>
      );
    }

    // Show application form or button
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        {isListingClosed ? (
          <div className="bg-yellow-50 p-4 rounded-md flex items-start">
            <FiAlertCircle className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-yellow-800 font-medium">Listing Closed</h3>
              <p className="text-yellow-700 mt-1">
                This listing is no longer accepting applications.
              </p>
            </div>
          </div>
        ) : isApplying ? (
          <form onSubmit={handleSubmitApplication} className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Apply for this Position</h3>
            
            <div className="mb-4">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Add a note (optional)
              </label>
              <textarea
                id="note"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Introduce yourself and explain why you're a good fit..."
                value={applicationNote}
                onChange={(e) => setApplicationNote(e.target.value)}
              ></textarea>
            </div>
            
            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {submitError}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsApplying(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setIsApplying(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiUser className="mr-2" />
              Apply for this Position
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default view for other user roles
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="bg-gray-50 p-4 rounded-md text-center">
        <p className="text-gray-700">
          This listing has received {applicationCount} application{applicationCount !== 1 ? 's' : ''} so far.
        </p>
      </div>
    </div>
  );
}
