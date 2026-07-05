"use client";

import { useState } from "react";
import { FiCheck, FiAlertCircle, FiArrowRight, FiLoader } from "react-icons/fi";
import LeadConsentCheckbox, { emptyLeadConsent } from "@/components/consent/LeadConsentCheckbox";
import type { LeadConsentPayload } from "@/lib/consent/lead-consent-text";

const ROLE_OPTIONS = [
  { value: "operator", label: "Assisted Living Operator / Administrator" },
  { value: "family", label: "Family Member / Care Manager" },
  { value: "discharge_planner", label: "Discharge Planner / Hospital Case Manager" },
  { value: "caregiver", label: "Caregiver / Care Professional" },
  { value: "provider", label: "Home Care Agency" },
  { value: "other", label: "Other" },
];

export default function DemoRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    role: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TCPA/marketing consent — UNCHECKED by default; declining never blocks submit.
  const [leadConsent, setLeadConsent] = useState<LeadConsentPayload>(emptyLeadConsent());

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role || undefined,
          message: form.message.trim() || undefined,
          consent: leadConsent,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please email us directly at hello@getcarelinkai.com");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="h-16 w-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
          <FiCheck className="h-8 w-8 text-success-600" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">Request received!</h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          We'll reach out within one business day to schedule your personalized demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            Your Name <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Jane Smith"
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            Work Email <span className="text-error-500">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            placeholder="jane@yourfacility.com"
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            Organization
          </label>
          <input
            type="text"
            value={form.company}
            onChange={set("company")}
            placeholder="Sunrise Assisted Living"
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="(216) 555-0100"
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
          I am a…
        </label>
        <select
          value={form.role}
          onChange={set("role")}
          className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-white"
        >
          <option value="">Select your role</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
          What would you like to see? (optional)
        </label>
        <textarea
          rows={3}
          value={form.message}
          onChange={set("message")}
          placeholder="e.g. We run 3 ALFs and struggle with caregiver turnover and last-minute call-offs…"
          className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 resize-none"
        />
      </div>

      <LeadConsentCheckbox checked={leadConsent.given} onChange={setLeadConsent} idPrefix="demo-request" className="mt-1" />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
          <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !form.name.trim() || !form.email.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <><FiLoader className="h-4 w-4 animate-spin" /> Sending…</>
        ) : (
          <>Request My Demo <FiArrowRight className="h-4 w-4" /></>
        )}
      </button>

      <p className="text-xs text-neutral-400 text-center">
        No credit card required. We'll respond within one business day.
      </p>
    </form>
  );
}
