"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckCircle, FiAlertCircle, FiExternalLink, FiTrendingUp } from "react-icons/fi";
import toast from "react-hot-toast";
import { usePaidFeatures, PaidFeatureUnavailable } from "@/hooks/usePaidFeatures";
import { BOOST_PERKS, BOOST_PRICE_LABEL, FOUNDER_BOOST_DAYS, FOUNDER_BOOST_SPOTS, isBoosted } from "@/lib/providers/boost";

/**
 * Listing & Boost (10/29 provider pricing):
 *  - the listing is free (PROVIDER_LISTING_ENABLED): nothing to buy;
 *  - Boost $39/mo (PROVIDER_BOOST_ENABLED): placement and visibility only, never "Verified";
 *  - founding providers: first 25 get Boost free for 90 days, no card, no auto-charge.
 * A legacy paid-listing subscriber can still open the Stripe portal to cancel.
 */
type Billing = {
  listingStatus: string | null;
  listingPeriodEndsAt: string | null;
  boostStatus: string | null;
  boostPeriodEndsAt: string | null;
  founderBoostStartedAt: string | null;
  founderBoostEndsAt: string | null;
};

type FounderState = { total: number; spotsLeft: number; claimed: { startedAt: string; endsAt: string | null } | null };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");

export default function ProviderBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [founder, setFounder] = useState<FounderState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"" | "subscribe" | "portal" | "founder">("");
  const { loading: flagLoading, isEnabled } = usePaidFeatures();
  const listingOn = isEnabled("PROVIDER_LISTING");
  const boostOn = isEnabled("PROVIDER_BOOST");

  const boostSuccess = searchParams.get("boost") === "success";
  const boostCanceled = searchParams.get("boost") === "canceled";

  const loadFounder = useCallback(async () => {
    try {
      const res = await fetch("/api/provider/boost/founder");
      if (res.ok) setFounder(await res.json());
    } catch {
      /* the counter is optional */
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "PROVIDER" && session?.user?.role !== "ADMIN") {
      router.push("/settings");
      return;
    }
    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const p = (await res.json()).provider ?? {};
          setBilling({
            listingStatus: p.listingStatus ?? null,
            listingPeriodEndsAt: p.listingPeriodEndsAt ?? null,
            boostStatus: p.boostStatus ?? null,
            boostPeriodEndsAt: p.boostPeriodEndsAt ?? null,
            founderBoostStartedAt: p.founderBoostStartedAt ?? null,
            founderBoostEndsAt: p.founderBoostEndsAt ?? null,
          });
        }
      } catch {
        toast.error("Failed to load your listing");
      } finally {
        setLoading(false);
      }
    };
    if (status === "authenticated") load();
  }, [status, session, router]);

  useEffect(() => {
    if (boostOn) loadFounder();
  }, [boostOn, loadFounder]);

  const post = async (url: string, kind: "subscribe" | "portal") => {
    setActionLoading(kind);
    try {
      const data = await (await fetch(url, { method: "POST" })).json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Something went wrong");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading("");
    }
  };

  const claimFounder = async () => {
    setActionLoading("founder");
    try {
      const res = await fetch("/api/provider/boost/founder", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Founding-provider Boost is on for ${FOUNDER_BOOST_DAYS} days.`);
        setBilling((b) => (b ? { ...b, founderBoostStartedAt: data.claimed.startedAt, founderBoostEndsAt: data.claimed.endsAt } : b));
        setFounder((f) => (f ? { ...f, spotsLeft: data.spotsLeft, claimed: data.claimed } : f));
      } else {
        toast.error(data.error || "Could not claim the offer");
        loadFounder();
      }
    } catch {
      toast.error("Could not claim the offer");
    } finally {
      setActionLoading("");
    }
  };

  const legacyListing = !!billing?.listingStatus && billing.listingStatus !== "CANCELED";
  const paidBoostActive = billing?.boostStatus === "ACTIVE" || billing?.boostStatus === "TRIALING";
  const boostPastDue = billing?.boostStatus === "PAST_DUE";
  const founderActive = !!billing?.founderBoostEndsAt && new Date(billing.founderBoostEndsAt) > new Date();
  const boosted = !!billing && isBoosted({ boostStatus: billing.boostStatus as never, founderBoostEndsAt: billing.founderBoostEndsAt });
  const hasBoostSubscription = !!billing?.boostStatus && billing.boostStatus !== "CANCELED";

  if (status === "loading" || loading || flagLoading) {
    return (
      <DashboardLayout title="Listing & Boost">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Nothing switched on and nothing to manage.
  if (!listingOn && !boostOn && !legacyListing && !hasBoostSubscription) {
    return (
      <DashboardLayout title="Listing & Boost">
        <PaidFeatureUnavailable title="Listing & Boost" message="Provider listings are not open yet." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Listing & Boost">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Listing &amp; Boost</h1>
          <p className="text-sm text-neutral-500">Your CareLinkAI provider listing is free. Boost is optional.</p>
        </div>

        {boostSuccess && (
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-success-800">Boost is active. You&apos;ll rank first in provider search.</p>
          </div>
        )}
        {boostCanceled && (
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800">Checkout was canceled. Your free listing is unchanged.</p>
          </div>
        )}

        {/* Free listing */}
        {listingOn && (
          <section className="bg-white rounded-xl border border-neutral-200 p-6" data-testid="provider-free-listing">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Provider listing</h2>
                <p className="text-sm text-neutral-500 mt-1">Families searching for your services can find and contact you.</p>
              </div>
              <span className="rounded-full bg-success-100 px-3 py-1 text-sm font-semibold text-success-800">Free</span>
            </div>
          </section>
        )}

        {/* Legacy paid listing: let an old subscriber cancel. */}
        {legacyListing && (
          <section className="bg-white rounded-xl border border-warning-200 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-5 w-5 text-warning-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-neutral-900">You have an old paid listing subscription</h2>
                <p className="text-sm text-neutral-600 mt-1">Listings are free now. You can cancel it in the billing portal.</p>
                <button
                  onClick={() => post("/api/provider/billing/portal", "portal")}
                  disabled={!!actionLoading}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                  {actionLoading === "portal" ? "Opening portal..." : "Open billing portal"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Boost */}
        {(boostOn || hasBoostSubscription) && (
          <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden" data-testid="provider-boost">
            <div className="bg-primary-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><FiTrendingUp aria-hidden="true" /> Provider Boost</h2>
                <p className="text-white text-sm mt-1">More visibility. It does not change your Verified status.</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$39</div>
                <div className="text-white text-sm">per month</div>
              </div>
            </div>
            <div className="p-6">
              {boosted && (
                <p className="mb-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-800" data-testid="boost-active">
                  {paidBoostActive
                    ? `Boost is active${billing?.boostPeriodEndsAt ? ` · renews ${fmt(billing.boostPeriodEndsAt)}` : ""}.`
                    : `Founding-provider Boost is active until ${fmt(billing?.founderBoostEndsAt ?? null)}. It ends on its own; nothing is charged.`}
                </p>
              )}
              {boostPastDue && (
                <p className="mb-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-800">Boost payment is past due. Your free listing stays up.</p>
              )}
              <ul className="space-y-2 mb-6">
                {BOOST_PERKS.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                    <FiCheckCircle className="h-4 w-4 text-success-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Founding-provider offer */}
              {boostOn && founder && !paidBoostActive && (
                <div className="mb-5 rounded-lg border border-primary-200 bg-primary-50 p-4" data-testid="founder-offer">
                  <p className="text-sm font-semibold text-primary-900" data-testid="founder-spots">
                    Founding provider: {founder.spotsLeft} of {founder.total} spots left
                  </p>
                  <p className="text-sm text-primary-800 mt-1">
                    The first {FOUNDER_BOOST_SPOTS} providers get Boost free for {FOUNDER_BOOST_DAYS} days. No card needed, and nothing is charged afterwards.
                  </p>
                  {!billing?.founderBoostStartedAt && founder.spotsLeft > 0 && (
                    <button
                      onClick={claimFounder}
                      disabled={!!actionLoading}
                      className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {actionLoading === "founder" ? "Claiming..." : `Claim ${FOUNDER_BOOST_DAYS} days free`}
                    </button>
                  )}
                  {billing?.founderBoostStartedAt && !founderActive && (
                    <p className="mt-2 text-sm text-primary-800">Your founding-provider Boost has ended.</p>
                  )}
                </div>
              )}

              {hasBoostSubscription ? (
                <button
                  onClick={() => post("/api/provider/billing/portal", "portal")}
                  disabled={!!actionLoading}
                  className="w-full py-3 px-6 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                  {actionLoading === "portal" ? "Opening portal..." : "Manage Boost"}
                </button>
              ) : boostOn ? (
                <button
                  onClick={() => post("/api/provider/billing/subscribe", "subscribe")}
                  disabled={!!actionLoading}
                  className="w-full py-3 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {actionLoading === "subscribe" ? "Redirecting to checkout..." : `Boost for ${BOOST_PRICE_LABEL}`}
                </button>
              ) : null}
              <p className="text-xs text-neutral-500 mt-3 text-center">Secured by Stripe. Cancel anytime; your free listing stays.</p>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
