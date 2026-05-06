"use client";

import { useState, useCallback } from "react";
import { FiShield, FiCheck, FiLoader, FiChevronDown, FiChevronUp, FiAlertCircle, FiLock } from "react-icons/fi";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PackageKey = "BASIC" | "ENHANCED" | "MVR" | "PREMIUM";

const PACKAGES: Record<PackageKey, {
  label: string;
  price: number;
  badge: string;
  turnaround: string;
  includes: string[];
  highlight?: boolean;
}> = {
  BASIC: {
    label: "Basic Check",
    price: 0,
    badge: "Free",
    turnaround: "1–3 days",
    includes: ["National criminal database", "Sex offender registry", "SSN trace", "Global watchlist"],
  },
  ENHANCED: {
    label: "Enhanced Check",
    price: 34.99,
    badge: "$34.99",
    turnaround: "2–5 days",
    includes: ["Everything in Basic", "County criminal (7 yrs)", "Federal criminal search", "Multi-state database"],
    highlight: true,
  },
  MVR: {
    label: "Motor Vehicle Report",
    price: 19.99,
    badge: "$19.99",
    turnaround: "1–2 days",
    includes: ["License status & class", "Moving violations (5 yrs)", "DUI / DWI history", "Accident history"],
  },
  PREMIUM: {
    label: "Premium Bundle",
    price: 59.99,
    badge: "$59.99",
    turnaround: "3–7 days",
    includes: ["Enhanced + MVR combined", "Employment verification", "Professional references", "Most thorough option"],
  },
};

interface Props {
  caregiverId: string;
  caregiverFirstName: string;
  existingStatus: string;
  defaultExpanded?: boolean;
}

// Inner form rendered inside <Elements> provider
function PaymentForm({
  caregiverId,
  packageType,
  label,
  price,
  turnaround,
  onSuccess,
  onCancel,
}: {
  caregiverId: string;
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
        // Confirm with backend to trigger Checkr
        const res = await fetch(`/api/family/background-checks/order/${caregiverId}`, {
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
    <div className="space-y-4">
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
          className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handlePay}
          disabled={paying || !stripe}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {paying ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiLock className="h-4 w-4" />}
          {paying ? "Processing..." : `Pay $${price}`}
        </button>
      </div>

      <p className="text-center text-xs text-neutral-400">
        Secure payment via Stripe · Results typically in {turnaround}
      </p>
    </div>
  );
}

export default function BackgroundCheckOrderPanel({ caregiverId, caregiverFirstName, existingStatus, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selected, setSelected] = useState<PackageKey>("ENHANCED");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);
  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payingPackage, setPayingPackage] = useState<PackageKey | null>(null);

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/family/background-checks/order/${caregiverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selected }),
      });
      const data = await res.json();

      if (data.requiresPayment && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPayingPackage(selected);
      } else if (data.success) {
        setResult({ success: true, message: data.message ?? "Background check ordered!" });
      } else {
        setResult({ success: false, message: data.error ?? "Failed to order check." });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = useCallback((msg: string) => {
    setClientSecret(null);
    setPayingPackage(null);
    setResult({ success: true, message: msg });
  }, []);

  const handlePaymentCancel = useCallback(() => {
    setClientSecret(null);
    setPayingPackage(null);
  }, []);

  if (existingStatus === "CLEAR") {
    return (
      <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-xl">
        <div className="flex items-center gap-2 text-success-800">
          <FiShield className="h-5 w-5 text-success-600" />
          <span className="font-semibold text-sm">Background Check Cleared</span>
        </div>
        <p className="text-xs text-success-700 mt-1">
          This caregiver has a verified background check on file.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <FiShield className="h-5 w-5 text-primary-600" />
          <div>
            <p className="font-semibold text-neutral-900 text-sm">Order a Background Check</p>
            <p className="text-xs text-neutral-500">Starting free · Enhanced options from $9.99</p>
          </div>
        </div>
        {expanded ? <FiChevronUp className="h-4 w-4 text-neutral-400" /> : <FiChevronDown className="h-4 w-4 text-neutral-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Stripe payment form shown after initial order call */}
          {clientSecret && payingPackage ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: "stripe" } }}
            >
              <PaymentForm
                caregiverId={caregiverId}
                packageType={payingPackage}
                label={PACKAGES[payingPackage].label}
                price={PACKAGES[payingPackage].price}
                turnaround={PACKAGES[payingPackage].turnaround}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          ) : (
            <>
              <p className="text-xs text-neutral-500 mb-3">
                Choose the level of screening you need. Results are shared with you and a verified badge appears on {caregiverFirstName}&apos;s profile.
              </p>

              {(Object.entries(PACKAGES) as [PackageKey, typeof PACKAGES[PackageKey]][]).map(([key, pkg]) => (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    selected === key
                      ? "border-primary-500 bg-primary-50"
                      : pkg.highlight
                      ? "border-secondary-200 bg-secondary-50/50 hover:border-secondary-400"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selected === key ? "border-primary-500 bg-primary-500" : "border-neutral-300"
                      }`}>
                        {selected === key && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-900">{pkg.label}</span>
                          {pkg.highlight && (
                            <span className="text-xs bg-secondary-100 text-secondary-700 font-bold px-2 py-0.5 rounded-full">Most Popular</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{pkg.turnaround}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${pkg.price === 0 ? "text-success-600" : "text-neutral-900"}`}>
                      {pkg.price === 0 ? "Free" : `$${pkg.price}`}
                    </span>
                  </div>
                  {selected === key && (
                    <ul className="mt-3 space-y-1 pl-6">
                      {pkg.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-neutral-600">
                          <FiCheck className="h-3 w-3 text-success-500 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}

              {result ? (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  result.success ? "bg-success-50 text-success-700 border border-success-200" : "bg-error-50 text-error-700 border border-error-200"
                }`}>
                  {result.success ? <FiCheck className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                  {result.message}
                </div>
              ) : (
                <button
                  onClick={handleOrder}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiShield className="h-4 w-4" />}
                  {loading ? "Processing..." : `Order ${PACKAGES[selected].label}${PACKAGES[selected].price > 0 ? ` — $${PACKAGES[selected].price}` : " — Free"}`}
                </button>
              )}

              <p className="text-xs text-neutral-400 text-center">
                Powered by Checkr · Secure payment via Stripe · Results typically in {PACKAGES[selected].turnaround}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
