"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export default function MessageCaregiverButton({
  caregiverUserId,
  caregiverDetailPath,
  className = "",
}: {
  caregiverUserId: string;
  caregiverDetailPath: string; // for login callback
  className?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    // If not authenticated, redirect to login with callback back to detail page
    if (status !== "authenticated") {
      try {
        await signIn(undefined, { callbackUrl: caregiverDetailPath });
      } catch {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(caregiverDetailPath)}`);
      }
      return;
    }

    // Only Operators can initiate from marketplace
    if (session?.user?.role !== "OPERATOR") {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(caregiverDetailPath)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/messages/threads/operator-caregiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiverUserId })
      });
      if (res.status === 401) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(caregiverDetailPath)}`);
        return;
      }
      if (res.status === 403) {
        setError('Only Operators can start a new conversation from the marketplace.');
        return;
      }
      if (!res.ok) {
        throw new Error('failed');
      }
      const j = await res.json();
      const threadUserId = j?.threadUserId as string | undefined;
      if (!threadUserId) throw new Error('missing thread');
      router.push(`/messages?userId=${encodeURIComponent(threadUserId)}`);
    } catch (e) {
      setError('Unable to start conversation right now, please try again.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.role, status, caregiverUserId, caregiverDetailPath, router]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors text-center"
      >
        {loading ? 'Opening...' : 'Message'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
