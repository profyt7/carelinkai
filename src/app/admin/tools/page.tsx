"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import EmailDemo from "@/components/email/EmailDemo";
import { FiMail, FiSettings, FiUsers, FiDatabase, FiShield, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Admin Tools Page - Restricted to admin and staff users
export default function AdminToolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = (session?.user?.role as UserRole | undefined) === UserRole.ADMIN;
  // Mock mode state
  const [mockLoading, setMockLoading] = useState(false);
  const [mockEnabled, setMockEnabled] = useState<boolean | null>(null);
  const [mockError, setMockError] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Check authorization
  useEffect(() => {
    if (status === "loading") return;

    // Redirect if not logged in
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    // Check if user has admin or staff role
    const userRole = session?.user?.role as UserRole | undefined;
    const hasAccess = userRole === UserRole.ADMIN || userRole === UserRole.STAFF;
    
    setIsAuthorized(hasAccess);
    setIsLoading(false);

    // Redirect unauthorized users
    if (!hasAccess) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Load current mock mode status (admin endpoint)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMockLoading(true);
        setMockError(null);
        const res = await fetch("/api/mock-mode", { cache: "no-store", credentials: "include" as RequestCredentials });
        if (!res.ok) {
          const text = (await res.text()) || "Failed to load mock mode status";
          if (!cancelled) setMockError(res.status === 403 ? "Admin privilege required" : text);
          return;
        }
        const j = await res.json();
        if (!cancelled) setMockEnabled(!!j?.show);
      } catch (e: any) {
        if (!cancelled) setMockError("Unable to load mock mode status");
      } finally {
        if (!cancelled) setMockLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setMock = async (on: boolean) => {
    try {
      setMockLoading(true);
      setMockError(null);
      const res = await fetch(`/api/mock-mode?on=${on ? "1" : "0"}`, { method: "GET", cache: "no-store", credentials: "include" as RequestCredentials });
      if (!res.ok) {
        const text = (await res.text()) || "Failed to toggle";
        setMockError(res.status === 403 ? "Admin privilege required" : text);
        return;
      }
      const j = await res.json();
      setMockEnabled(!!j?.show);
      // If enabling, try auto-seed demo data
      if (on) {
        await seedDemo();
      }
    } catch (e: any) {
      setMockError("Unable to toggle mock mode");
    } finally {
      setMockLoading(false);
    }
  };

  const seedDemo = async () => {
    try {
      setSeedLoading(true);
      setSeedError(null);
      setSeedResult(null);
      const res = await fetch('/api/admin/seed-demo', { method: 'POST', cache: 'no-store', credentials: 'include' as RequestCredentials });
      if (!res.ok) {
        const text = (await res.text()) || 'Failed to seed demo data';
        setSeedError(res.status === 403 ? 'Admin privilege required or disabled in production' : text);
        return;
      }
      const j = await res.json();
      const homes = Array.isArray(j?.homes) ? j.homes.map((h: any) => h.name).join(', ') : 'homes created';
      setSeedResult(`Demo data created: ${j?.residents?.length ?? 0} residents across ${homes}`);
    } catch (e) {
      setSeedError('Unable to seed demo data');
    } finally {
      setSeedLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
      </div>
    );
  }

  // Unauthorized state (should redirect, but just in case)
  if (!isAuthorized) {
    return null;
  }

  // Available admin tools configuration
  const adminTools = [
    {
      id: "mock-mode",
      title: "Demo Data (Mock Mode)",
      description: "Enable demo data across the app for product walkthroughs.",
      icon: mockEnabled ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />,
      component: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-600">Current status</div>
              <div className="text-lg font-medium">
                {mockLoading ? "Checking…" : mockEnabled ? "Enabled" : mockEnabled === false ? "Disabled" : "—"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMock(true)}
                disabled={!isAdmin || mockLoading}
                className="rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Enable
              </button>
              <button
                onClick={() => setMock(false)}
                disabled={!isAdmin || mockLoading}
                className="rounded-md border px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Disable
              </button>
              <button
                onClick={seedDemo}
                disabled={!isAdmin || seedLoading}
                className="rounded-md border px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {seedLoading ? 'Seeding…' : 'Generate Demo Data'}
              </button>
            </div>
          </div>
          {mockError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {mockError}
            </div>
          )}
          {seedError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {seedError}
            </div>
          )}
          {seedResult && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {seedResult}
            </div>
          )}
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
            Tip: You can also toggle via URL by appending <code>?mock=1</code> to any page. Status is stored in an HttpOnly cookie for 7 days.
          </div>
        </div>
      ),
      isActive: true,
    },
    {
      id: "email-notifications",
      title: "Email Notifications",
      description: "Send and manage email notifications to users",
      icon: <FiMail size={24} />,
      component: <EmailDemo />,
      isActive: true,
    },
    {
      id: "user-management",
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: <FiUsers size={24} />,
      component: <div className="text-neutral-500">Coming soon</div>,
      isActive: false,
    },
    {
      id: "system-settings",
      title: "System Settings",
      description: "Configure global system settings",
      icon: <FiSettings size={24} />,
      component: <div className="text-neutral-500">Coming soon</div>,
      isActive: false,
    },
    {
      id: "data-management",
      title: "Data Management",
      description: "Backup, restore, and manage system data",
      icon: <FiDatabase size={24} />,
      component: <div className="text-neutral-500">Coming soon</div>,
      isActive: false,
    },
    {
      id: "security",
      title: "Security Controls",
      description: "Manage security settings and access controls",
      icon: <FiShield size={24} />,
      component: <div className="text-neutral-500">Coming soon</div>,
      isActive: false,
    }
  ];

  return (
    <DashboardLayout title="Admin Tools">
      <div className="px-4 py-6">
      {/* Page Header */}
      <div className="mb-8 border-b border-neutral-200 pb-5">
        <h1 className="text-3xl font-bold text-neutral-800">Admin Tools</h1>
        <p className="mt-2 text-neutral-600">
          Administrative tools and utilities for managing CareLinkAI. These features are restricted to administrators and staff members.
        </p>
        <div className="mt-4 inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-sm text-amber-800">
          <FiShield className="mr-1" />
          Restricted Area • Staff and Administrators Only
        </div>
      </div>

      {/* Admin Tools Grid */}
      <div className="grid grid-cols-1 gap-8">
        {adminTools.map((tool) => (
          <div
            key={tool.id}
            className={`rounded-lg border ${
              tool.isActive ? "border-neutral-200" : "border-neutral-100 bg-neutral-50"
            } overflow-hidden shadow-sm`}
          >
            <div className="border-b border-neutral-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    {tool.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-800">{tool.title}</h2>
                    <p className="text-sm text-neutral-500">{tool.description}</p>
                  </div>
                </div>
                {!tool.isActive && (
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
            
            {tool.isActive && (
              <div className="bg-white p-5">
                {tool.component}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Admin Documentation Link */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-lg font-medium text-neutral-800">Administration Documentation</h3>
        <p className="text-neutral-600">
          For detailed information about administrative functions and capabilities, please refer to the
          <a href="/docs/admin" className="ml-1 text-primary-600 hover:text-primary-700">
            administrator documentation
          </a>.
        </p>
      </div>
      </div>
    </DashboardLayout>
  );
}
