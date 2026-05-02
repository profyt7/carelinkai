"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckCircle, FiAlertCircle, FiExternalLink } from "react-icons/fi";
import toast from "react-hot-toast";

const PRICE = "$99/mo";
const FEATURES = [
  "Listed in the CareLinkAI provider marketplace",
  "Visible to families searching for care services",
  "Inquiries delivered directly to your dashboard",
  "Transportation capability filters (wheelchair, Medicaid)",
  "Verified badge eligibility",
  "Priority support",
];

type BillingStatus = {
  listingStatus: string | null;
  listingPeriodEndsAt: string | null;
};

export default function ProviderBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const subscriptionSuccess = searchParams.get("subscription") === "success";
  const subscriptionCanceled = searchParams.get("subscription") === "canceled";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "PROVIDER" && session?.user?.role !== "ADMIN") {
      router.push("/settings");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setBilling({
            listingStatus: data.provider?.listingStatus ?? null,
            listingPeriodEndsAt: data.provider?.listingPeriodEndsAt ?? null,
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
      const res = await fetch("/api/provider/billing/subscribe", { method: "POST" });
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
      const res = await fetch("/api/provider/billing/portal", { method: "POST" });
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

  const isActive = billing?.listingStatus === "ACTIVE" || billing?.listingStatus === "TRIALING";
  const isPastDue = billing?.listingStatus === "PAST_DUE";
  const isCanceled = billing?.listingStatus === "CANCELED";
  const hasSubscription = !!billing?.listingStatus && billing.listingStatus !== "CANCELED";

  if (status === "loading" || loading) {
    return (
      <DashboardLayout title="Provider Billing">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Provider Billing">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Marketplace Listing</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Your listing subscription controls your visibility in the CareLinkAI provider marketplace.
        </p>

        {subscriptionSuccess && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-success-800">Subscription activated!</p>
              <p className="text-sm text-success-700">Your profile is now visible in the marketplace.</p>
            </div>
          </div>
        )}

        {subscriptionCanceled && (
          <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800">Checkout was canceled. You can subscribe anytime below.</p>
          </div>
        )}

        {isPastDue && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-error-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-error-800">Payment past due</p>
              <p className="text-sm text-error-700">
                Your marketplace listing is hidden until payment is resolved. Update your payment method below.
              </p>
            </div>
          </div>
        )}

        {/* Plan card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="bg-primary-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Provider Marketplace Listing</h2>
                <p className="text-primary-100 text-sm mt-1">Be found by families searching for care services</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$99</div>
                <div className="text-primary-200 text-sm">per month</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Current status */}
            {billing?.listingStatus && (
              <div className="mb-5 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-600">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? "bg-success-100 text-success-800" :
                  isPastDue ? "bg-error-100 text-error-800" :
                  isCanceled ? "bg-neutral-100 text-neutral-600" :
                  "bg-warning-100 text-warning-800"
                }`}>
                  {billing.listingStatus}
                </span>
                {billing.listingPeriodEndsAt && (
                  <span className="text-xs text-neutral-500">
                    · Renews {new Date(billing.listingPeriodEndsAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Features list */}
            <ul className="space-y-2 mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                  <FiCheckCircle className="h-4 w-4 text-success-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {!hasSubscription || isCanceled ? (
              <button
                onClick={handleSubscribe}
                disabled={actionLoading}
                className="w-full py-3 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Redirecting to checkout..." : `Subscribe for ${PRICE}`}
              </button>
            ) : (
              <button
                onClick={handlePortal}
                disabled={actionLoading}
                className="w-full py-3 px-6 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiExternalLink className="h-4 w-4" />
                {actionLoading ? "Opening portal..." : "Manage Subscription"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-400 mt-4 text-center">
          Secured by Stripe. Cancel anytime from the billing portal.
        </p>
      </div>
    </DashboardLayout>
  );
}
