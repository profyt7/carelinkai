"use client";

import { useState, useEffect } from "react";
import { FiShield, FiCheck, FiClock, FiAlertCircle, FiLoader } from "react-icons/fi";
import Link from "next/link";

type Status = "NOT_STARTED" | "PENDING" | "CLEAR" | "CONSIDER" | "FAILED" | "EXPIRED";

export default function CaregiverVerificationPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/caregiver/background-checks/start")
      .then((r) => r.json())
      .then((d) => setStatus(d.status ?? "NOT_STARTED"))
      .catch(() => setStatus("NOT_STARTED"))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/caregiver/background-checks/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("PENDING");
        setSuccess(true);
      } else {
        setError(data.error ?? "Failed to start background check.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <FiLoader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/caregiver" className="text-sm text-primary-600 hover:text-primary-500">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center">
              <FiShield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Get Verified</h1>
              <p className="text-white/80 text-sm mt-1">
                A background check badge boosts your profile and increases hire rates
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Current status */}
          {status === "CLEAR" && (
            <div className="flex items-start gap-4 bg-success-50 border border-success-200 rounded-xl p-5 mb-6">
              <FiCheck className="h-6 w-6 text-success-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-success-900">Background Check Cleared</p>
                <p className="text-sm text-success-700 mt-1">
                  Your verified badge is active on your profile. Families can see you've been background checked through Checkr.
                </p>
              </div>
            </div>
          )}

          {status === "PENDING" && (
            <div className="flex items-start gap-4 bg-warning-50 border border-warning-200 rounded-xl p-5 mb-6">
              <FiClock className="h-6 w-6 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning-900">Check In Progress</p>
                <p className="text-sm text-warning-700 mt-1">
                  Your background check is underway through Checkr. Results typically arrive within 1–3 business days. You'll receive a notification when it's complete.
                </p>
              </div>
            </div>
          )}

          {(status === "FAILED" || status === "CONSIDER") && (
            <div className="flex items-start gap-4 bg-error-50 border border-error-200 rounded-xl p-5 mb-6">
              <FiAlertCircle className="h-6 w-6 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-error-900">Action Required</p>
                <p className="text-sm text-error-700 mt-1">
                  Your background check requires review. Please contact support at support@getcarelinkai.com for next steps.
                </p>
              </div>
            </div>
          )}

          {/* How it works */}
          <h2 className="text-lg font-bold text-neutral-900 mb-4">How it works</h2>
          <div className="space-y-4 mb-8">
            {[
              {
                step: 1,
                title: "Submit your check",
                desc: "Click below — we create your Checkr candidate profile using the info from your account.",
              },
              {
                step: 2,
                title: "Checkr runs the check",
                desc: "Checkr searches national criminal databases, sex offender registries, and more. Takes 1–3 business days.",
              },
              {
                step: 3,
                title: "Get your badge",
                desc: "When cleared, a 'Background Checked' badge appears on your profile, boosting trust with families and operators.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{item.title}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Check tiers */}
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Available checks</h2>
          <div className="space-y-3 mb-8">
            {([
              { key: "BASIC", label: "Basic Check", price: "Free", turnaround: "1–3 days", tag: null, items: ["National criminal database", "Sex offender registry", "SSN trace", "Global watchlist"] },
              { key: "ENHANCED", label: "Enhanced Check", price: "$19.99", turnaround: "2–5 days", tag: "Recommended", items: ["Everything in Basic", "County criminal (7 yrs)", "Federal criminal search"] },
              { key: "MVR", label: "Motor Vehicle Report", price: "$9.99", turnaround: "1–2 days", tag: null, items: ["License status", "Moving violations (5 yrs)", "DUI history", "Accident record"] },
              { key: "PREMIUM", label: "Premium Bundle", price: "$39.99", turnaround: "3–7 days", tag: "Most thorough", items: ["Enhanced + MVR", "Employment verification", "Professional references"] },
            ] as const).map((tier) => (
              <div key={tier.key} className={`rounded-xl border p-4 ${tier.tag === "Recommended" ? "border-secondary-300 bg-secondary-50" : "border-neutral-200 bg-neutral-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-900">{tier.label}</span>
                    {tier.tag && <span className="text-xs bg-secondary-200 text-secondary-800 font-bold px-2 py-0.5 rounded-full">{tier.tag}</span>}
                  </div>
                  <span className={`text-sm font-bold ${tier.price === "Free" ? "text-success-600" : "text-neutral-700"}`}>{tier.price}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {tier.items.map((item) => (
                    <span key={item} className="flex items-center gap-1 text-xs text-neutral-600">
                      <FiCheck className="h-3 w-3 text-success-500 flex-shrink-0" />
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 mt-2">Results in {tier.turnaround}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mb-6 text-center">
            Powered by Checkr. Families can also order enhanced checks on your profile.
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-error-50 border border-error-200 rounded-lg p-4 mb-4 text-sm text-error-700">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && status === "PENDING" && (
            <div className="flex items-center gap-2 bg-success-50 border border-success-200 rounded-lg p-4 mb-4 text-sm text-success-700">
              <FiCheck className="h-4 w-4 flex-shrink-0" />
              Background check started! You'll be notified within 1–3 business days.
            </div>
          )}

          {(status === "NOT_STARTED" || status === "EXPIRED") && (
            <button
              onClick={handleStart}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FiShield className="h-5 w-5" />
                  {status === "EXPIRED" ? "Renew Background Check" : "Start My Background Check — Free"}
                </>
              )}
            </button>
          )}

          <p className="text-xs text-neutral-400 text-center mt-4">
            Background checks are free for caregivers on CareLinkAI. Powered by Checkr.
          </p>
        </div>
      </div>
    </div>
  );
}
