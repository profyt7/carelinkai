"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import {
  FiShield, FiCheckCircle, FiAlertCircle, FiClock, FiX, FiChevronDown,
  FiChevronUp, FiExternalLink, FiUser, FiMail, FiPlus,
} from "react-icons/fi";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PACKAGES = [
  {
    key: "BASIC",
    label: "Basic",
    price: 0,
    badge: "Free",
    turnaround: "1–3 days",
    highlight: false,
    includes: ["National criminal database", "Sex offender registry", "SSN trace", "Global watchlist"],
  },
  {
    key: "ENHANCED",
    label: "Enhanced",
    price: 34.99,
    badge: "$34.99",
    turnaround: "2–5 days",
    highlight: true,
    includes: ["Everything in Basic", "County criminal (7 yrs)", "Federal criminal search", "Multi-state database"],
  },
  {
    key: "MVR",
    label: "Motor Vehicle",
    price: 19.99,
    badge: "$19.99",
    turnaround: "1–2 days",
    highlight: false,
    includes: ["License status & class", "Moving violations (5 yrs)", "DUI / DWI history", "Accident history"],
  },
  {
    key: "PREMIUM",
    label: "Premium Bundle",
    price: 59.99,
    badge: "$59.99",
    turnaround: "3–7 days",
    highlight: false,
    includes: ["Enhanced + MVR combined", "Employment verification", "Professional references", "Most complete"],
  },
] as const;

const ROLES = [
  "Housekeeper / Cleaner",
  "Driver / Chauffeur",
  "Caregiver / Aide",
  "Nanny / Babysitter",
  "Contractor / Handyman",
  "Tutor / Teacher",
  "Pet Sitter / Dog Walker",
  "Security Guard",
  "Personal Trainer",
  "Other",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INVITED:   { label: "Invitation Sent",  color: "bg-blue-100 text-blue-800",     icon: <FiMail size={11} /> },
  PENDING:   { label: "In Progress",      color: "bg-amber-100 text-amber-800",   icon: <FiClock size={11} /> },
  CLEAR:     { label: "Clear",            color: "bg-success-100 text-success-800", icon: <FiCheckCircle size={11} /> },
  CONSIDER:  { label: "Review Needed",    color: "bg-amber-100 text-amber-800",   icon: <FiAlertCircle size={11} /> },
  FAILED:    { label: "Not Cleared",      color: "bg-error-100 text-error-700",   icon: <FiX size={11} /> },
  EXPIRED:   { label: "Expired",          color: "bg-neutral-100 text-neutral-500", icon: <FiClock size={11} /> },
  CANCELLED: { label: "Cancelled",        color: "bg-neutral-100 text-neutral-500", icon: <FiX size={11} /> },
};

interface Check {
  id: string;
  subjectFirstName: string;
  subjectLastName: string;
  subjectEmail: string;
  subjectRole: string | null;
  packageType: string;
  pricePaid: string | null;
  status: string;
  invitationUrl: string | null;
  reportUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Stripe payment form ─────────────────────────────────────────────────────
function PaymentForm({
  clientSecret,
  packageLabel,
  price,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  packageLabel: string;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) { setErr(error.message ?? "Payment failed"); setPaying(false); return; }
    if (paymentIntent?.status === "succeeded") {
      const res = await fetch("/api/background-checks/confirm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(); }
      else { setErr(data.error ?? "Confirmation failed. Contact support."); }
    }
    setPaying(false);
  };

  return (
    <div className="space-y-4 mt-4 p-4 bg-white border border-neutral-200 rounded-xl">
      <p className="text-sm font-medium text-neutral-800">Pay ${price} for {packageLabel}</p>
      <PaymentElement />
      {err && <p className="text-sm text-error-600">{err}</p>}
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={paying} className="flex-1 py-2.5 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">Cancel</button>
        <button onClick={handlePay} disabled={paying || !stripe} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-60">
          {paying ? "Processing…" : `Pay $${price}`}
        </button>
      </div>
      <p className="text-xs text-neutral-400 text-center">Secure payment via Stripe · Powered by Checkr</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function BackgroundChecksPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("BASIC");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payingPkg, setPayingPkg] = useState<(typeof PACKAGES)[number] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchChecks = useCallback(async () => {
    try {
      const res = await fetch("/api/background-checks");
      if (res.ok) { const data = await res.json(); setChecks(data.checks ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("Name and email are required."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/background-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, packageType: selectedPkg }),
      });
      const data = await res.json();
      if (data.requiresPayment) {
        setClientSecret(data.clientSecret);
        setPayingPkg(PACKAGES.find(p => p.key === selectedPkg) ?? null);
      } else if (data.success) {
        toast.success(`Invitation sent to ${form.email}. They'll get an email from Checkr to complete the check.`);
        setForm({ firstName: "", lastName: "", email: "", role: "" });
        setShowForm(false);
        fetchChecks();
      } else {
        toast.error(data.error ?? "Failed to order check.");
      }
    } catch { toast.error("Network error — please try again."); }
    finally { setSubmitting(false); }
  };

  const handlePaySuccess = () => {
    setClientSecret(null);
    setPayingPkg(null);
    toast.success("Payment confirmed! Invitation sent to complete the background check.");
    setForm({ firstName: "", lastName: "", email: "", role: "" });
    setShowForm(false);
    fetchChecks();
  };

  const pending = checks.filter(c => ["INVITED", "PENDING"].includes(c.status)).length;
  const cleared = checks.filter(c => c.status === "CLEAR").length;

  return (
    <DashboardLayout title="Background Checks">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <FiShield className="text-primary-600" /> Background Checks
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Run a background check on anyone — housekeepers, drivers, caregivers, contractors, and more. Powered by Checkr.
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiPlus size={15} /> Run a Check
          </button>
        </div>

        {/* Stats */}
        {checks.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Ordered", value: checks.length, color: "text-neutral-900" },
              { label: "In Progress", value: pending, color: "text-amber-600" },
              { label: "Cleared", value: cleared, color: "text-success-700" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Order form */}
        {showForm && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">New Background Check</h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><FiX size={18} /></button>
            </div>

            {clientSecret && payingPkg ? (
              <div className="p-5">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    packageLabel={payingPkg.label}
                    price={payingPkg.price}
                    onSuccess={handlePaySuccess}
                    onCancel={() => { setClientSecret(null); setPayingPkg(null); }}
                  />
                </Elements>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Person info */}
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2"><FiUser size={14} /> Person being checked</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">First Name *</label>
                      <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Last Name *</label>
                      <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Smith" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Their Email Address *</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                      <p className="text-xs text-neutral-400 mt-1">Checkr sends them a secure link to consent and verify identity.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Their Role</label>
                      <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Select role…</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Package selection */}
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2"><FiShield size={14} /> Select a package</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PACKAGES.map(pkg => (
                      <button
                        key={pkg.key}
                        type="button"
                        onClick={() => setSelectedPkg(pkg.key)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          selectedPkg === pkg.key
                            ? "border-primary-500 bg-primary-50"
                            : pkg.highlight
                            ? "border-secondary-200 bg-secondary-50/40 hover:border-secondary-400"
                            : "border-neutral-200 bg-white hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-sm font-semibold text-neutral-900">{pkg.label}</span>
                            {pkg.highlight && <span className="ml-2 text-xs bg-secondary-100 text-secondary-700 font-bold px-1.5 py-0.5 rounded-full">Popular</span>}
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${pkg.price === 0 ? "text-success-600" : "text-neutral-900"}`}>{pkg.badge}</span>
                        </div>
                        <p className="text-xs text-neutral-400 mb-2">{pkg.turnaround}</p>
                        <ul className="space-y-0.5">
                          {pkg.includes.map(item => (
                            <li key={item} className="text-xs text-neutral-500 flex items-center gap-1.5">
                              <FiCheckCircle size={10} className="text-success-500 shrink-0" />{item}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    <FiShield size={14} />
                    {submitting ? "Sending invitation…" : `Send Invitation${PACKAGES.find(p=>p.key===selectedPkg)?.price ? ` — $${PACKAGES.find(p=>p.key===selectedPkg)?.price}` : " — Free"}`}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Cancel</button>
                </div>
                <p className="text-xs text-neutral-400 text-center">
                  The person will receive an email from Checkr. After they consent, the check typically completes in {PACKAGES.find(p=>p.key===selectedPkg)?.turnaround}. You&apos;ll be notified when results are ready.
                </p>
              </form>
            )}
          </div>
        )}

        {/* Checks list */}
        <div>
          <h2 className="text-base font-semibold text-neutral-900 mb-3">Your Checks</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />)}
            </div>
          ) : checks.length === 0 ? (
            <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-xl p-12 text-center">
              <FiShield className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="font-semibold text-neutral-700">No background checks yet</p>
              <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">Run a check on anyone who comes into your home or life — housekeepers, drivers, caregivers, and more. Basic check is free.</p>
              <button onClick={() => setShowForm(true)} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                <FiShield size={14} /> Run Your First Check — Free
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {checks.map(check => {
                const cfg = STATUS_CONFIG[check.status] ?? STATUS_CONFIG.INVITED;
                const pkg = PACKAGES.find(p => p.key === check.packageType);
                const isExpanded = expandedId === check.id;

                return (
                  <div key={check.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : check.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          check.status === "CLEAR" ? "bg-success-100 text-success-700" :
                          check.status === "FAILED" ? "bg-error-100 text-error-700" :
                          "bg-primary-100 text-primary-700"
                        }`}>
                          {check.subjectFirstName[0]}{check.subjectLastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-900 text-sm">{check.subjectFirstName} {check.subjectLastName}</span>
                            {check.subjectRole && <span className="text-xs text-neutral-400">{check.subjectRole}</span>}
                            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {pkg?.label} · Ordered {new Date(check.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <FiChevronUp size={16} className="text-neutral-400 shrink-0" /> : <FiChevronDown size={16} className="text-neutral-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
                          <div><span className="text-neutral-400">Email</span><br />{check.subjectEmail}</div>
                          <div><span className="text-neutral-400">Package</span><br />{pkg?.label} {check.pricePaid ? `($${check.pricePaid})` : "(Free)"}</div>
                          {check.completedAt && <div><span className="text-neutral-400">Completed</span><br />{new Date(check.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
                        </div>

                        {check.status === "INVITED" && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                            <strong>Waiting for {check.subjectFirstName}</strong> — They received an email from Checkr. Once they consent and verify their identity, the check will begin automatically.
                          </div>
                        )}

                        {check.status === "CLEAR" && (
                          <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-xs text-success-700 flex items-center gap-2">
                            <FiCheckCircle size={14} className="shrink-0" />
                            Background check came back clear. No disqualifying records found.
                          </div>
                        )}

                        {check.status === "CONSIDER" && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                            Records were found that require your review. Contact Checkr support or review the full report for details.
                          </div>
                        )}

                        {check.status === "FAILED" && (
                          <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-xs text-error-700">
                            This background check could not be cleared. Review the full report for details.
                          </div>
                        )}

                        <div className="flex gap-2">
                          {check.invitationUrl && check.status === "INVITED" && (
                            <a href={check.invitationUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
                              <FiExternalLink size={12} /> View Invitation Link
                            </a>
                          )}
                          {check.reportUrl && (
                            <a href={check.reportUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                              <FiExternalLink size={12} /> View Full Report
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Explainer */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-800 text-sm mb-3">How it works</h3>
          <ol className="space-y-2">
            {[
              "Enter the person's name and email address above.",
              "They receive a secure email from Checkr to consent and verify their identity (SSN, DOB).",
              "Checkr runs the check. You're notified when results are ready.",
              "View the results here. Clear = no disqualifying records.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                <span className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="text-xs text-neutral-400 mt-4">Powered by Checkr · Background checks require consent from the person being checked. Results are FCRA compliant.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
