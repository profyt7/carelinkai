"use client";

import { useState } from "react";
import { BugReportModal } from "./BugReportModal";

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Bug Report Button - Positioned on bottom-left to avoid pagination overlap */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 md:left-6"
        title="Report a bug"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium hidden sm:inline">Report Bug</span>
      </button>

      {/* Bug Report Modal */}
      <BugReportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
