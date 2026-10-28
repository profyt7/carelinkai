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

  // Check impersonation status on mount and periodically with exponential backoff
  useEffect(() => {
    let errorCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const MAX_ERRORS = 3;
    const BASE_INTERVAL = 30000; // 30 seconds
    const MAX_INTERVAL = 300000; // 5 minutes max
    
    const checkStatus = async () => {
      if (cancelled) return;
      
      try {
        const response = await fetch("/api/admin/impersonate/status");
        if (cancelled) return;
        
        if (response.ok) {
          const data = await response.json();
          if (data?.active && data?.session) {
            setSession(data.session);
          } else {
            setSession(null);
          }
          errorCount = 0; // Reset on success
        } else if (response.status >= 500 || response.status === 404) {
          // Server error - back off
          errorCount++;
          console.warn(`[ImpersonationBanner] Status API error: ${response.status}, error count: ${errorCount}`);
        } else {
          // 403, 401 etc - not an error, just not impersonating
          setSession(null);
        }
      } catch (error) {
        if (cancelled) return;
        errorCount++;
        console.warn("[ImpersonationBanner] Status check failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
      
      // Schedule next poll with exponential backoff
      if (!cancelled && errorCount < MAX_ERRORS) {
        const delay = Math.min(BASE_INTERVAL * Math.pow(2, errorCount), MAX_INTERVAL);
        timeoutId = setTimeout(checkStatus, delay);
      } else if (errorCount >= MAX_ERRORS) {
        console.warn('[ImpersonationBanner] Stopping polling after max errors');
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
