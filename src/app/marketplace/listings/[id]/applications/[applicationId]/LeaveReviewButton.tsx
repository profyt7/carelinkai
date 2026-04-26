"use client";

import { useState } from "react";
import { FiStar } from "react-icons/fi";
import dynamic from "next/dynamic";

const LeaveReviewModal = dynamic(
  () => import("@/components/marketplace/LeaveReviewModal"),
  { ssr: false }
);

interface LeaveReviewButtonProps {
  caregiverId: string;
  caregiverName: string;
}

export default function LeaveReviewButton({ caregiverId, caregiverName }: LeaveReviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <LeaveReviewModal
          caregiverId={caregiverId}
          caregiverName={caregiverName}
          onClose={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-warning-200 bg-warning-50 text-sm font-medium text-warning-700 hover:bg-warning-100 hover:border-warning-300 transition-colors"
      >
        <FiStar className="h-4 w-4" />
        Leave a Review
      </button>
    </>
  );
}
