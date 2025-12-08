"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import {
  FiMail,
  FiToggleLeft,
  FiToggleRight,
  FiBarChart2,
  FiSettings,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";

// Admin Tools Page - Restricted to admin users
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

  // Email test state
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  // Check authorization
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    const userRole = session?.user?.role as UserRole | undefined;
    const hasAccess = userRole === UserRole.ADMIN;

    setIsAuthorized(hasAccess);
    setIsLoading(false);

    if (!hasAccess) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Load current mock mode status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMockLoading(true);
        setMockError(null);
        const res = await fetch("/api/mock-mode", {
          cache: "no-store",
          credentials: "include" as RequestCredentials,
        });
        if (!res.ok) {
          const text = (await res.text()) || "Failed to load mock mode status";
          if (!cancelled)
            setMockError(res.status === 403 ? "Admin privilege required" : text);
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
    return () => {
      cancelled = true;
    };
  }, []);

  const setMock = async (on: boolean) => {
    try {
      setMockLoading(true);
      setMockError(null);
      const res = await fetch(`/api/mock-mode?on=${on ? "1" : "0"}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include" as RequestCredentials,
      });
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
      const res = await fetch("/api/admin/seed-demo", {
        method: "POST",
        cache: "no-store",
        credentials: "include" as RequestCredentials,
      });
      if (!res.ok) {
        const text = (await res.text()) || "Failed to seed demo data";
        setSeedError(
          res.status === 403
            ? "Admin privilege required or disabled in production"
            : text
        );
        return;
      }
      const j = await res.json();
      const homes = Array.isArray(j?.homes)
        ? j.homes.map((h: any) => h.name).join(", ")
        : "homes created";
      setSeedResult(
        `Demo data created: ${j?.residents?.length ?? 0} residents across ${homes}`
      );
    } catch (e) {
      setSeedError("Unable to seed demo data");
    } finally {
      setSeedLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setEmailError("Please enter an email address");
      return;
    }
    try {
      setEmailLoading(true);
      setEmailError(null);
      setEmailResult(null);
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: "Test Email from CareLinkAI Admin Tools",
          html: "<p>This is a test email from the CareLinkAI Admin Tools. If you received this, the email system is working correctly.</p>",
        }),
      });
      if (!res.ok) {
        const text = (await res.text()) || "Failed to send test email";
        setEmailError(text);
        return;
      }
      setEmailResult(`Test email sent successfully to ${testEmail}`);
    } catch (e) {
      setEmailError("Unable to send test email");
    } finally {
      setEmailLoading(false);
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

  // Unauthorized state
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="px-4 py-6">
        {/* Page Header */}
        <div className="mb-8 border-b border-neutral-200 pb-5">
          <h1 className="text-3xl font-bold text-neutral-800">Admin Tools</h1>
          <p className="mt-2 text-neutral-600">
            Essential administrative tools and utilities for managing CareLinkAI.
          </p>
          <div className="mt-4 inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-sm text-amber-800">
            <FiShield className="mr-1" />
            Restricted Area • Administrators Only
          </div>
        </div>

        {/* Admin Tools Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* 1. Admin Metrics & Analytics - PROMINENT */}
          <Link
            href="/admin/metrics"
            className="group rounded-lg border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50 p-6 shadow-md transition-all hover:border-primary-400 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-md">
                  <FiBarChart2 size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 group-hover:text-primary-700">
                    Admin Metrics & Analytics
                  </h2>
                  <p className="mt-2 text-base text-neutral-700">
                    View comprehensive usage metrics, leads, and marketplace analytics across
                    the entire platform. Monitor user growth, lead conversion, marketplace
                    activity, and system health.
                  </p>
                  <div className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-primary-700">
                    Open Admin Metrics
                    <FiArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* 2. Demo Data (Mock Mode) */}
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-white p-5">
              <div className="flex items-center">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  {mockEnabled ? (
                    <FiToggleRight size={24} />
                  ) : (
                    <FiToggleLeft size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-800">
                    Demo Data (Mock Mode)
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Enable demo data across the app for product walkthroughs and testing
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-600">Current status</div>
                    <div className="text-lg font-medium">
                      {mockLoading
                        ? "Checking…"
                        : mockEnabled
                        ? "Enabled"
                        : mockEnabled === false
                        ? "Disabled"
                        : "—"}
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
                      {seedLoading ? "Seeding…" : "Generate Demo Data"}
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
                  Tip: You can also toggle via URL by appending{" "}
                  <code className="bg-neutral-200 px-1 rounded">?mock=1</code> to any
                  page. Status is stored in an HttpOnly cookie for 7 days.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Email & Notifications (Simplified) */}
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-white p-5">
              <div className="flex items-center">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <FiMail size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-800">
                    Email & Notifications
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Test email delivery system (transactional emails handled automatically)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5">
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">
                  System emails (password reset, verification, etc.) are handled
                  automatically. Use this form to test email delivery:
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={emailLoading || !testEmail}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {emailLoading ? "Sending…" : "Send Test Email"}
                  </button>
                </div>
                {emailError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {emailError}
                  </div>
                )}
                {emailResult && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {emailResult}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. System & Access Management */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm">
            <div className="border-b border-neutral-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                    <FiSettings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-800">
                      System & Access Management
                    </h2>
                    <p className="text-sm text-neutral-500">
                      User roles, permissions, and system configuration
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">
                  Coming Soon
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 p-5">
              <div className="space-y-2 text-sm text-neutral-600">
                <p>
                  <strong>User Roles & RBAC:</strong> Currently configured via code and
                  database. UI-based role management coming soon.
                </p>
                <p>
                  <strong>Feature Flags:</strong> System settings and feature toggles are
                  managed through environment variables and configuration files.
                </p>
                <p>
                  <strong>Access Control:</strong> Role-based access control (RBAC) is
                  enforced at the API and page level through middleware.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
