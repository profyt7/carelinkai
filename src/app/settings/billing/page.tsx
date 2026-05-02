"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckCircle, FiAlertCircle, FiExternalLink, FiZap } from "react-icons/fi";
import toast from "react-hot-toast";

const PRO_FEATURES = [
  "Boosted placement — appear above basic caregivers in every search",
  "Pro badge on your marketplace profile (visible to operators)",
  "Priority job alerts — get notified before the general pool",
  "Unlimited job applications (basic: 10/month)",
  "Reliability score prominently displayed",
  "Priority support",
];

type BillingInfo = {
  isPro: boolean;
  proStatus: string | null;
  proPeriodEndsAt: string | null;
  applicationCount: number;
};

const APP_LIMIT = 10; // basic monthly application cap

export default function CaregiverBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const proSuccess = searchParams.get("pro") === "success";
  const proCanceled = searchParams.get("pro") === "canceled";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "CAREGIVER") {
      router.push("/settings");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setBilling({
            isPro: data.caregiver?.isPro ?? false,
            proStatus: data.caregiver?.proStatus ?? null,
            proPeriodEndsAt: data.caregiver?.proPeriodEndsAt ?? null,
            applicationCount: data.caregiver?.applicationCount ?? 0,
          });
        }
      } catch {
        toast.error("Failed to load billing info");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") load();
  }, [status, session, router]);

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/caregiver/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/caregiver/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = billing?.isPro && (billing.proStatus === "ACTIVE" || billing.proStatus === "TRIALING");
  const isPastDue = billing?.proStatus === "PAST_DUE";
  const hasSubscription = billing?.isPro || (!!billing?.proStatus && billing.proStatus !== "CANCELED");
  const appsRemaining = Math.max(0, APP_LIMIT - (billing?.applicationCount ?? 0));

  if (status === "loading" || loading) {
    return (
      <DashboardLayout title="Pro Membership">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pro Membership">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">CareLinkAI Pro</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Upgrade to Pro and get found faster by operators looking for caregivers like you.
        </p>

        {proSuccess && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-success-800">You&apos;re now a Pro member!</p>
              <p className="text-sm text-success-700">Your profile is boosted in search results. Go get hired.</p>
            </div>
          </div>
        )}

        {proCanceled && (
          <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800">Checkout was canceled. Upgrade anytime below.</p>
          </div>
        )}

        {isPastDue && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-error-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-error-800">Payment past due</p>
              <p className="text-sm text-error-700">Pro benefits are paused. Update your payment method to restore them.</p>
            </div>
          </div>
        )}

        {/* Application cap banner for basic members */}
        {!isActive && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm font-medium text-primary-800">
              Basic plan: {appsRemaining} application{appsRemaining !== 1 ? "s" : ""} remaining this month
            </p>
            <p className="text-xs text-primary-600 mt-1">
              Pro members have unlimited applications. Resets on the 1st of each month.
            </p>
          </div>
        )}

        {/* Plan card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="bg-gradient-to-r from-secondary-600 to-primary-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FiZap className="h-5 w-5" />
                  <h2 className="text-xl font-bold">Pro Caregiver</h2>
                </div>
                <p className="text-white/80 text-sm">Stand out. Get hired faster.</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$19</div>
                <div className="text-white/70 text-sm">per month</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Status */}
            {billing?.proStatus && (
              <div className="mb-5 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-600">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? "bg-success-100 text-success-800" :
                  isPastDue ? "bg-error-100 text-error-800" :
                  "bg-neutral-100 text-neutral-600"
                }`}>
                  {billing.isPro ? "Pro" : billing.proStatus}
                </span>
                {billing.proPeriodEndsAt && (
                  <span className="text-xs text-neutral-500">
                    · Renews {new Date(billing.proPeriodEndsAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Features */}
            <ul className="space-y-2 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                  <FiCheckCircle className="h-4 w-4 text-success-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {!hasSubscription ? (
              <button
                onClick={handleSubscribe}
                disabled={actionLoading}
                className="w-full py-3 px-6 bg-gradient-to-r from-secondary-600 to-primary-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Redirecting to checkout..." : "Upgrade to Pro — $19/mo"}
              </button>
            ) : (
              <button
                onClick={handlePortal}
                disabled={actionLoading}
                className="w-full py-3 px-6 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiExternalLink className="h-4 w-4" />
                {actionLoading ? "Opening portal..." : "Manage Pro Subscription"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-400 mt-4 text-center">
          Secured by Stripe. Cancel anytime. No contracts.
        </p>
      </div>
    </DashboardLayout>
  );
}
