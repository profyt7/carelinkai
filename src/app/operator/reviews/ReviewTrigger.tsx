"use client";

import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import dynamic from 'next/dynamic';

const LeaveReviewModal = dynamic(
  () => import('@/components/marketplace/LeaveReviewModal'),
  { ssr: false }
);

export default function ReviewTrigger({
  caregiverId,
  caregiverName,
}: {
  caregiverId: string;
  caregiverName: string;
}) {
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
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-warning-700 bg-warning-50 border border-warning-200 rounded-lg hover:bg-warning-100 hover:border-warning-300 transition-colors"
      >
        <FiStar className="h-3 w-3" />
        Leave Review
      </button>
    </>
  );
}
