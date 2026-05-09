"use client";

import { useState, useCallback } from "react";
import {
  FiShield,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiLock,
  FiTruck,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PackageKey = "BASIC" | "ENHANCED" | "MVR" | "PREMIUM";

const PACKAGES: Record<
  PackageKey,
  {
    label: string;
    price: number;
    turnaround: string;
    includes: string[];
    icon: "shield" | "truck";
    highlight?: boolean;
  }
> = {
  BASIC: {
    label: "Basic Check",
    price: 0,
    turnaround: "1–3 days",
    includes: ["National criminal database", "Sex offender registry", "SSN trace", "Global watchlist"],
    icon: "shield",
  },
  ENHANCED: {
    label: "Enhanced Check",
    price: 34.99,
    turnaround: "2–5 days",
    includes: ["Everything in Basic", "County criminal (7 yrs)", "Federal criminal search", "Multi-state database"],
    icon: "shield",
    highlight: true,
  },
  MVR: {
    label: "Motor Vehicle Report",
    price: 19.99,
    turnaround: "1–2 days",
    includes: ["License status & class", "Moving violations (5 yrs)", "DUI / DWI history", "Accident history"],
    icon: "truck",
  },
  PREMIUM: {
    label: "Premium Bundle",
    price: 59.99,
    turnaround: "3–7 days",
    includes: ["Enhanced + MVR combined", "Employment verification", "Professional references", "Most thorough option"],
    icon: "shield",
  },
};

interface Props {
  caregiverId: string;
  caregiverFirstName: string;
  existingStatus: string;
  /** Override the base API path. Defaults to /api/family/background-checks/order */
  apiBasePath?: string;
  /** Unused — kept for API compatibility; component is always visible */
  defaultExpanded?: boolean;
}

function PaymentForm({
  caregiverId,
  apiBasePath,
  packageType,
  label,
  price,
  turnaround,
  onSuccess,
  onCancel,
}: {
  caregiverId: string;
  apiBasePath: string;
  packageType: PackageKey;
  label: string;
  price: number;
  turnaround: string;
  onSuccess: (msg: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError(null);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (confirmError) {
        setPayError(confirmError.message ?? "Payment failed.");
        setPaying(false);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        const res = await fetch(`${apiBasePath}/${caregiverId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id, packageType }),
        });
        const data = await res.json();
        if (data.success) {
          onSuccess(data.message ?? `${label} ordered. Results in ${turnaround}.`);
        } else {
          setPayError(data.error ?? "Payment succeeded but order failed. Contact support.");
        }
      } else {
        setPayError("Payment did not complete. Please try again.");
      }
    } catch {
      setPayError("Network error. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-800">
          <FiLock className="h-4 w-4 text-neutral-400" />
          Pay ${price} for {label}
        </div>
        <PaymentElement />
      </div>
      {payError && (
        <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {payError}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={paying}
          className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handlePay}
          disabled={paying || !stripe}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {paying ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiLock className="h-4 w-4" />}
          {paying ? "Processing..." : `Pay $${price}`}
        </button>
      </div>
      <p className="text-center text-xs text-neutral-400">
        Secure payment via Stripe · Results in {turnaround}
      </p>
    </div>
  );
}

export default function BackgroundCheckOrderPanel({
  caregiverId,
  caregiverFirstName,
  existingStatus,
  apiBasePath = "/api/family/background-checks/order",
}: Props) {
  const [loadingPackage, setLoadingPackage] = useState<PackageKey | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<PackageKey | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payingPackage, setPayingPackage] = useState<PackageKey | null>(null);
  const [orderedPackage, setOrderedPackage] = useState<PackageKey | null>(null);
  const [errorPackage, setErrorPackage] = useState<{ key: PackageKey; msg: string } | null>(null);

  const handleOrder = async (key: PackageKey) => {
    setLoadingPackage(key);
    setErrorPackage(null);
    try {
      const res = await fetch(`${apiBasePath}/${caregiverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: key }),
      });
      const data = await res.json();
      if (data.requiresPayment && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPayingPackage(key);
      } else if (data.success) {
        setOrderedPackage(key);
      } else {
        setErrorPackage({ key, msg: data.error ?? "Failed to order check." });
      }
    } catch {
      setErrorPackage({ key, msg: "Network error. Please try again." });
    } finally {
      setLoadingPackage(null);
    }
  };

  const handlePaymentSuccess = useCallback((msg: string) => {
    const pkg = payingPackage;
    setClientSecret(null);
    setPayingPackage(null);
    if (pkg) setOrderedPackage(pkg);
  }, [payingPackage]);

  const handlePaymentCancel = useCallback(() => {
    setClientSecret(null);
    setPayingPackage(null);
  }, []);

  const isClear = existingStatus === "CLEAR";

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <FiShield className="h-4 w-4 text-primary-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-neutral-900">Safety & Background Checks</span>
        {isClear && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
            <FiCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>

      {/* Per-check rows */}
      <div className="divide-y divide-neutral-100">
        {(Object.entries(PACKAGES) as [PackageKey, typeof PACKAGES[PackageKey]][]).map(([key, pkg]) => {
          const isOrdered = orderedPackage === key;
          const isLoadingThis = loadingPackage === key;
          const isPayingThis = payingPackage === key;
          const isBasicAndClear = key === "BASIC" && isClear;
          const hasError = errorPackage?.key === key;
          const Icon = pkg.icon === "truck" ? FiTruck : FiShield;
          const isDetailOpen = expandedDetail === key;

          return (
            <div key={key}>
              <div
                className={`flex items-center gap-3 px-4 py-3 ${
                  pkg.highlight ? "bg-secondary-50/40" : ""
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    isBasicAndClear || isOrdered
                      ? "bg-success-100"
                      : "bg-neutral-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isBasicAndClear || isOrdered ? "text-success-600" : "text-neutral-500"
                    }`}
                  />
                </div>

                {/* Label + detail toggle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-neutral-900">{pkg.label}</span>
                    {pkg.highlight && (
                      <span className="text-xs bg-secondary-100 text-secondary-700 font-semibold px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedDetail(isDetailOpen ? null : key)}
                    className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5"
                  >
                    {isBasicAndClear || isOrdered ? (
                      <span className="text-success-600 font-medium">✓ On file</span>
                    ) : (
                      <>
                        <span>Not on file</span>
                        <span className="text-neutral-300 mx-1">·</span>
                        <span>{pkg.turnaround}</span>
                        {isDetailOpen ? (
                          <FiChevronDown className="h-3 w-3 ml-0.5" />
                        ) : (
                          <FiChevronRight className="h-3 w-3 ml-0.5" />
                        )}
                      </>
                    )}
                  </button>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {isBasicAndClear || isOrdered ? (
                    <FiCheck className="h-5 w-5 text-success-500" />
                  ) : isLoadingThis ? (
                    <FiLoader className="h-5 w-5 animate-spin text-primary-500" />
                  ) : isPayingThis ? (
                    <span className="text-xs text-primary-600 font-medium">Paying…</span>
                  ) : (
                    <button
                      onClick={() => handleOrder(key)}
                      disabled={!!loadingPackage || !!payingPackage}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        pkg.price === 0
                          ? "border-success-400 text-success-700 hover:bg-success-50"
                          : "border-primary-400 text-primary-700 hover:bg-primary-50"
                      }`}
                    >
                      {pkg.price === 0 ? "Order Free" : `$${pkg.price}`}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable detail — what's included */}
              {isDetailOpen && !isBasicAndClear && !isOrdered && (
                <div className="px-4 pb-3 bg-neutral-50">
                  <ul className="space-y-1 pl-11">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-neutral-600">
                        <FiCheck className="h-3 w-3 text-success-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error for this row */}
              {hasError && (
                <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 p-2 text-xs text-error-700">
                  <FiAlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {errorPackage!.msg}
                </div>
              )}

              {/* Stripe payment form — inline below triggered row */}
              {isPayingThis && clientSecret && (
                <div className="px-4 pb-4">
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                    <PaymentForm
                      caregiverId={caregiverId}
                      apiBasePath={apiBasePath}
                      packageType={key}
                      label={pkg.label}
                      price={pkg.price}
                      turnaround={pkg.turnaround}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  </Elements>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-100">
        <p className="text-xs text-neutral-400 text-center">
          Powered by Checkr · Results shared with you · Badge appears on {caregiverFirstName}&apos;s profile
        </p>
      </div>
    </div>
  );
}
