"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckCircle, FiAlertCircle, FiZap, FiExternalLink } from "react-icons/fi";
import toast from "react-hot-toast";

const PRICE = "$19/mo";
const FEATURES = [
  "Priority matching — your search results ranked for your exact care needs",
  "Unlimited saved homes and caregiver shortlists",
  "Care Concierge priority response (AI + human follow-up)",
  "Advanced filters: verified-only, licensed staff, specialty care",
  "Early access to new CareLinkAI features",
  "14-day free trial — cancel anytime",
];

type BillingStatus = {
  plusStatus: string | null;
  plusPeriodEndsAt: string | null;
  isPlus: boolean;
};

export default function FamilyBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const subscriptionSuccess = searchParams.get("subscription") === "success";
  const subscriptionCanceled = searchParams.get("subscription") === "canceled";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "FAMILY" && session?.user?.role !== "ADMIN") {
      router.push("/settings");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setBilling({
            plusStatus: data.family?.plusStatus ?? null,
            plusPeriodEndsAt: data.family?.plusPeriodEndsAt ?? null,
            isPlus: data.family?.isPlus ?? false,
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
      const res = await fetch("/api/family/billing/subscribe", { method: "POST" });
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
      const res = await fetch("/api/family/billing/portal", { method: "POST" });
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

  const isActive = billing?.plusStatus === "ACTIVE" || billing?.plusStatus === "TRIALING";
  const isPastDue = billing?.plusStatus === "PAST_DUE";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">CareLinkAI Plus</h1>
          <p className="text-neutral-500 mt-1">Priority care matching and unlimited access for families.</p>
        </div>

        {subscriptionSuccess && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-success-900">You're now on CareLinkAI Plus!</p>
              <p className="text-sm text-success-700 mt-0.5">Your 14-day free trial has started. Priority features are now active.</p>
            </div>
          </div>
        )}

        {subscriptionCanceled && (
          <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <p className="text-sm text-neutral-600">Checkout canceled — no charge was made.</p>
          </div>
        )}

        {isPastDue && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-error-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-error-900">Payment past due</p>
              <p className="text-sm text-error-700 mt-0.5">Update your payment method to restore Plus features.</p>
              <button
                onClick={handlePortal}
                disabled={actionLoading}
                className="mt-2 text-sm font-semibold text-error-700 underline underline-offset-2"
              >
                Update payment →
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <FiZap className="h-5 w-5" />
              <span className="font-semibold text-lg">CareLinkAI Plus</span>
            </div>
            <div className="text-3xl font-bold">
              {PRICE}<span className="text-base font-normal text-primary-200"> · 14-day free trial</span>
            </div>
          </div>

          {/* Features */}
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <FiCheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-neutral-700">{f}</span>
                </li>
              ))}
            </ul>

            {loading ? (
              <div className="h-10 bg-neutral-100 rounded-lg animate-pulse" />
            ) : isActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 rounded-lg">
                  <FiCheckCircle className="h-4 w-4 text-success-600 shrink-0" />
                  <span className="text-sm font-medium text-success-800">
                    {billing?.plusStatus === "TRIALING" ? "Free trial active" : "Plus active"}
                    {billing?.plusPeriodEndsAt && (
                      <span className="font-normal text-success-700">
                        {" "}· renews {new Date(billing.plusPeriodEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={handlePortal}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  <FiExternalLink className="h-4 w-4" />
                  {actionLoading ? "Opening portal..." : "Manage subscription"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <FiZap className="h-4 w-4" />
                {actionLoading ? "Redirecting..." : "Start 14-day free trial"}
              </button>
            )}

            <p className="text-xs text-neutral-400 text-center mt-3">
              No charge during trial. Cancel anytime from this page.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
