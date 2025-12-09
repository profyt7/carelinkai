"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRole } from "@prisma/client";
import OperatorManagementPage from "@/components/operator/OperatorManagementPage";
import OperatorDashboardPage from "@/components/operator/OperatorDashboardPage";
import { FiAlertCircle } from "react-icons/fi";

export default function OperatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    setIsChecking(false);
  }, [status, router]);

  // Loading state
  if (status === "loading" || isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin"></div>
          <p className="text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return null;
  }

  const userRole = session?.user?.role as UserRole | undefined;

  // Role-based rendering
  if (userRole === UserRole.ADMIN) {
    // Admins see the operator management page
    return <OperatorManagementPage />;
  } else if (userRole === UserRole.OPERATOR) {
    // Operators see their dashboard
    return <OperatorDashboardPage />;
  } else {
    // Other roles are not authorized
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md w-full">
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
                <p className="text-sm text-red-800 mb-4">
                  You don't have permission to access this page. This area is only available to operators and administrators.
                </p>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="btn btn-secondary text-sm"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
