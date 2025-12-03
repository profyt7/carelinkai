"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Props = {
  caregiverUserId: string;
  className?: string;
  children?: React.ReactNode;
};

export default function MessageCaregiverButton({ caregiverUserId, className, children }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    // If not authenticated or not an Operator, send to login with callback
    const role = session?.user?.role;
    if (status !== "authenticated" || role !== "OPERATOR") {
      const callback = `/messages?userId=${encodeURIComponent(caregiverUserId)}`;
      window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(callback)}`;
      return;
    }
    try {
      setLoading(true);
      // Deep-link directly to conversation by userId (messages page hydrates from ?userId=)
      router.push(`/messages?userId=${encodeURIComponent(caregiverUserId)}`);
    } catch (e) {
      console.error("Failed to open messages:", e);
      setError("Unable to open messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Opening…" : (children ?? "Message")}
      </button>
      {error && (
        <span className="mt-1 text-xs text-error-600">{error}</span>
      )}
    </div>
  );
}
