"use client";

import { useState } from "react";
import { FiShield, FiCheck, FiLoader } from "react-icons/fi";

interface Props {
  caregiverId: string;
  caregiverName: string;
  currentStatus: string;
}

export default function OrderBackgroundCheckButton({ caregiverId, caregiverName, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);

  if (currentStatus === "CLEAR") {
    return (
      <div className="flex items-center gap-2 text-sm text-success-700 bg-success-50 border border-success-200 rounded-lg px-4 py-2">
        <FiCheck className="h-4 w-4 flex-shrink-0" />
        <span>Background check cleared</span>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
        <FiShield className="h-4 w-4 flex-shrink-0" />
        <span>{result.message}</span>
      </div>
    );
  }

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/family/background-checks/order/${caregiverId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          status: data.status,
          message:
            data.alreadyCleared
              ? "Background check already cleared."
              : data.alreadyOrdered
              ? "You already have an order in progress."
              : "Background check ordered. Results in 1–3 business days.",
        });
      } else {
        setResult({ status: "error", message: data.error ?? "Failed to order check." });
      }
    } catch {
      setResult({ status: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleOrder}
      disabled={loading || currentStatus === "PENDING"}
      className="flex items-center gap-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 rounded-lg px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <FiLoader className="h-4 w-4 animate-spin" />
      ) : (
        <FiShield className="h-4 w-4" />
      )}
      {currentStatus === "PENDING"
        ? "Check In Progress"
        : loading
        ? "Ordering..."
        : `Order Background Check on ${caregiverName}`}
    </button>
  );
}
