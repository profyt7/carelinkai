"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiCheck, FiArrowRight, FiHome, FiUser, FiZap } from "react-icons/fi";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface ProfileForm {
  companyName: string;
  phone: string;
}

interface HomeForm {
  name: string;
  description: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  capacity: string;
  careLevel: string[];
}

const CARE_LEVELS = [
  { value: "INDEPENDENT", label: "Independent Living" },
  { value: "ASSISTED", label: "Assisted Living" },
  { value: "MEMORY_CARE", label: "Memory Care" },
  { value: "SKILLED_NURSING", label: "Skilled Nursing" },
];

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    price: "$99",
    features: ["Up to 2 homes", "Inquiry management", "Basic analytics", "Email support"],
    highlight: false,
  },
  {
    key: "PROFESSIONAL",
    name: "Professional",
    price: "$249",
    features: ["Up to 10 homes", "Everything in Starter", "AI-powered matching", "SMS notifications", "Priority support"],
    highlight: true,
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "$499",
    features: ["Unlimited homes", "Everything in Professional", "Custom analytics", "Dedicated support", "API access"],
    highlight: false,
  },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: "Company", icon: <FiUser size={16} /> },
    { n: 2 as Step, label: "First Home", icon: <FiHome size={16} /> },
    { n: 3 as Step, label: "Choose Plan", icon: <FiZap size={16} /> },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                s.n < current
                  ? "bg-green-500 text-white"
                  : s.n === current
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-200 text-neutral-500"
              }`}
            >
              {s.n < current ? <FiCheck size={16} /> : s.icon}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                s.n === current ? "text-primary-700" : "text-neutral-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-4 mx-1 ${
                s.n < current ? "bg-green-400" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OperatorOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileForm>({ companyName: "", phone: "" });
  const [home, setHome] = useState<HomeForm>({
    name: "",
    description: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    capacity: "",
    careLevel: [],
  });

  // Pre-fill existing profile data
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/operator/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.operator) {
          setProfile({
            companyName: d.operator.companyName || "",
            phone: d.user?.phone || "",
          });
        }
      })
      .catch(() => {});
  }, [status]);

  // Redirect non-operators
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "OPERATOR") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // ── Step 1 submit ──────────────────────────────────────────────────────────
  const submitProfile = async () => {
    if (!profile.companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/operator/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: profile.companyName.trim(), phone: profile.phone.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save profile.");
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────
  const submitHome = async () => {
    if (!home.name.trim()) { setError("Home name is required."); return; }
    if (!home.description.trim()) { setError("A brief description is required."); return; }
    if (!home.street.trim() || !home.city.trim() || !home.state.trim() || !home.zipCode.trim()) {
      setError("Full address is required.");
      return;
    }
    if (home.careLevel.length === 0) { setError("Select at least one care type."); return; }
    if (!home.capacity || parseInt(home.capacity) < 1) { setError("Capacity must be at least 1."); return; }

    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/operator/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: home.name.trim(),
          description: home.description.trim(),
          careLevel: home.careLevel,
          capacity: parseInt(home.capacity),
          address: {
            street: home.street.trim(),
            city: home.city.trim(),
            state: home.state.trim(),
            zipCode: home.zipCode.trim(),
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create home.");
      }
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: start checkout ─────────────────────────────────────────────────
  const startCheckout = async (plan: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        throw new Error(d.error || "Could not start checkout.");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setSaving(false);
    }
  };

  const toggleCareLevel = (val: string) => {
    setHome((prev) => ({
      ...prev,
      careLevel: prev.careLevel.includes(val)
        ? prev.careLevel.filter((v) => v !== val)
        : [...prev.careLevel, val],
    }));
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / brand */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-9 w-9 rounded-md bg-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-xl font-semibold text-neutral-800">CareLinkAI</span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <StepIndicator current={step} />

        {/* ── Step 1: Company Profile ── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Set up your company</h1>
            <p className="text-neutral-500 text-sm mb-6">This is what families will see when they find your listing.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Company / Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="form-input w-full"
                  value={profile.companyName}
                  onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="e.g. Sunrise Care Homes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Phone</label>
                <input
                  className="form-input w-full"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. (216) 555-0100"
                  type="tel"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              onClick={submitProfile}
              disabled={saving}
              className="mt-6 btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? "Saving…" : <>Continue <FiArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {/* ── Step 2: First Home ── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Add your first home</h1>
            <p className="text-neutral-500 text-sm mb-6">Families search by location and care type — fill these in to get found.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Home Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="form-input w-full"
                  value={home.name}
                  onChange={(e) => setHome((h) => ({ ...h, name: e.target.value }))}
                  placeholder="e.g. Sunrise East"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Brief Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="form-input w-full"
                  rows={2}
                  value={home.description}
                  onChange={(e) => setHome((h) => ({ ...h, description: e.target.value }))}
                  placeholder="e.g. A warm, family-style assisted living home in East Cleveland."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  className="form-input w-full"
                  value={home.street}
                  onChange={(e) => setHome((h) => ({ ...h, street: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="form-input w-full"
                    value={home.city}
                    onChange={(e) => setHome((h) => ({ ...h, city: e.target.value }))}
                    placeholder="Cleveland"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="form-input w-full"
                    value={home.state}
                    onChange={(e) => setHome((h) => ({ ...h, state: e.target.value }))}
                    placeholder="OH"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="form-input w-full"
                    value={home.zipCode}
                    onChange={(e) => setHome((h) => ({ ...h, zipCode: e.target.value }))}
                    placeholder="44101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="form-input w-full"
                    type="number"
                    min={1}
                    value={home.capacity}
                    onChange={(e) => setHome((h) => ({ ...h, capacity: e.target.value }))}
                    placeholder="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Care Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CARE_LEVELS.map((cl) => (
                    <button
                      key={cl.value}
                      type="button"
                      onClick={() => toggleCareLevel(cl.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                        home.careLevel.includes(cl.value)
                          ? "bg-primary-50 border-primary-400 text-primary-700"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {home.careLevel.includes(cl.value) && (
                        <FiCheck className="inline mr-1 text-primary-600" size={13} />
                      )}
                      {cl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setStep(1); setError(null); }}
                className="btn btn-secondary flex-1"
                disabled={saving}
              >
                Back
              </button>
              <button
                onClick={submitHome}
                disabled={saving}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? "Saving…" : <>Add Home <FiArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Choose Plan ── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Choose a plan</h1>
            <p className="text-neutral-500 text-sm mb-1">
              14-day free trial on all plans. Cancel anytime.
            </p>
            <p className="text-xs text-amber-700 font-medium mb-6">
              Early adopter? Enter code <span className="font-mono bg-amber-100 px-1 rounded">FOUNDERS49</span> at checkout for $49/mo on Starter — locked forever.
            </p>

            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className={`rounded-xl border p-4 ${
                    plan.highlight
                      ? "border-primary-400 bg-primary-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-neutral-900">{plan.name}</span>
                      {plan.highlight && (
                        <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Most popular</span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-neutral-900">
                      {plan.price}<span className="text-sm font-normal text-neutral-500">/mo</span>
                    </span>
                  </div>
                  <ul className="text-xs text-neutral-600 space-y-1 mb-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <FiCheck size={11} className="text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => startCheckout(plan.key)}
                    disabled={saving}
                    className={`w-full btn text-sm ${
                      plan.highlight ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {saving ? "Opening checkout…" : `Start free trial — ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              onClick={() => router.push("/operator")}
              className="mt-4 w-full text-sm text-neutral-400 hover:text-neutral-600 text-center transition-colors"
            >
              Skip for now — go to dashboard
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Need help? Email <a href="mailto:hello@getcarelinkai.com" className="underline">hello@getcarelinkai.com</a>
      </p>
    </div>
  );
}
