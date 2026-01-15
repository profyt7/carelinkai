"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiX } from "react-icons/fi";

interface ImpersonationSession {
  id: string;
  targetUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  startedAt: string;
  expiresAt: string;
  reason?: string;
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);

  // Check impersonation status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/admin/impersonate/status");
        const data = await response.json();

        if (data.active && data.session) {
          setSession(data.session);
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error("Failed to check impersonation status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle stop impersonation
  const handleStopImpersonation = async () => {
    setStopping(true);

    try {
      const response = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
      });

      if (response.ok) {
        setSession(null);
        // Redirect to admin dashboard - router.push will load fresh page data
        router.push("/admin");
      } else {
        const data = await response.json();
        alert(`Failed to stop impersonation: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
      alert("Failed to stop impersonation. Please try again.");
    } finally {
      setStopping(false);
    }
  };

  // Don't render if loading or no active session
  if (loading || !session) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 relative z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <FiAlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-amber-900">
                  Impersonating User:
                </span>
                <span className="text-sm font-medium text-amber-800">
                  {session.targetUser.firstName} {session.targetUser.lastName}
                </span>
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  {session.targetUser.email}
                </span>
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  {session.targetUser.role}
                </span>
              </div>
              {session.reason && (
                <p className="text-xs text-amber-700 mt-1">
                  Reason: {session.reason}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStopImpersonation}
              disabled={stopping}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-md transition-colors"
            >
              <FiX className="w-4 h-4" />
              {stopping ? "Stopping..." : "Stop Impersonating"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
