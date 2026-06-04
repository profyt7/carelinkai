"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiCheck, FiArrowRight, FiHome, FiUser, FiZap, FiGift } from "react-icons/fi";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepNum = 1 | 2 | 3 | 4;

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

interface SeededHome {
  id: string;
  name: string;
  description: string;
  capacity: number;
  careLevel: string[];
  status: string;
  address: { street: string; city: string; state: string; zipCode: string } | null;
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
    features: [
      "Up to 10 homes",
      "Everything in Starter",
      "AI-powered matching",
      "SMS notifications",
      "Priority support",
    ],
    highlight: true,
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "$499",
    features: [
      "Unlimited homes",
      "Everything in Professional",
      "Custom analytics",
      "Dedicated support",
      "API access",
    ],
    highlight: false,
  },
  {
    key: "AGENCY",
    name: "Agency",
    price: "$799",
    features: [
      "Everything in Growth",
      "Multi-operator management",
      "White-label options",
      "SLA support",
      "Custom integrations",
    ],
    highlight: false,
  },
];

const STEP_META: Record<StepNum, { label: string; icon: React.ReactNode }> = {
  1: { label: "Company", icon: <FiUser size={16} /> },
  2: { label: "First Home", icon: <FiHome size={16} /> },
  3: { label: "Founder Link", icon: <FiGift size={16} /> },
  4: { label: "Choose Plan", icon: <FiZap size={16} /> },
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: StepNum }) {
  const steps = [1, 2, 3, 4] as StepNum[];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((n, i) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                n < current
                  ? "bg-success-500 text-white"
                  : n === current
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-200 text-neutral-500"
              }`}
            >
              {n < current ? <FiCheck size={16} /> : STEP_META[n].icon}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                n === current ? "text-primary-700" : "text-neutral-400"
              }`}
            >
              {STEP_META[n].label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mb-4 mx-1 ${
                n < current ? "bg-success-400" : "bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OperatorOnboardingStepPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const rawStep = Number(params?.step);
  const step: StepNum = ([1, 2, 3, 4].includes(rawStep) ? rawStep : 1) as StepNum;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clevelandFounder, setClevelandFounder] = useState(false);
  const [seededHome, setSeededHome] = useState<SeededHome | null>(null);

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

  // Only used on Step 3 when the operator manually enters a token
  const [manualToken, setManualToken] = useState("");
  const [claimApplied, setClaimApplied] = useState(false);

  // Redirect non-operators
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Load onboarding status + profile on mount
  useEffect(() => {
    if (status !== "authenticated") return;

    // Fetch onboarding status (includes seededHome for founders)
    fetch("/api/operator/onboarding/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.clevelandFounder) {
          setClevelandFounder(true);
          setClaimApplied(true);
        }
        if (d.seededHome) {
          setSeededHome(d.seededHome);
          // Pre-populate Step 2 form with seeded home data
          setHome({
            name: d.seededHome.name ?? "",
            description: d.seededHome.description ?? "",
            street: d.seededHome.address?.street ?? "",
            city: d.seededHome.address?.city ?? "",
            state: d.seededHome.address?.state ?? "",
            zipCode: d.seededHome.address?.zipCode ?? "",
            capacity: String(d.seededHome.capacity ?? ""),
            careLevel: d.seededHome.careLevel ?? [],
          });
        }
      })
      .catch(() => {});

    // Pre-fill company profile
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

  const goToStep = (n: StepNum) => router.push(`/operator/onboarding/${n}`);

  // ── Step 1: Save company profile ─────────────────────────────────────────
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
        body: JSON.stringify({
          companyName: profile.companyName.trim(),
          phone: profile.phone.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile.");
      goToStep(2);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Add / claim first home ───────────────────────────────────────
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
      if (clevelandFounder && seededHome) {
        // Transfer the seeded home to this operator instead of creating a new one
        const res = await fetch(`/api/operator/homes/${seededHome.id}/claim`, {
          method: "POST",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to claim home.");
        }
      } else {
        // Standard path: create a new home.
        // Wrap address fields in the `address` object the API expects.
        const res = await fetch("/api/operator/homes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: home.name.trim(),
            description: home.description.trim(),
            address: {
              street: home.street.trim(),
              city: home.city.trim(),
              state: home.state.trim(),
              zipCode: home.zipCode.trim(),
            },
            capacity: parseInt(home.capacity),
            careLevel: home.careLevel,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const fieldMsg = errData.fields
            ? Object.values(errData.fields as Record<string, string>).join(". ")
            : null;
          throw new Error(fieldMsg || errData.error || "Failed to save home.");
        }
      }
      goToStep(3);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: Apply claim token manually (for operators who weren't deep-linked) ─
  const applyClaimToken = async () => {
    if (!manualToken.trim()) {
      setError("Enter your claim token.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/operator/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: manualToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid token.");
      setClaimApplied(true);
      setClevelandFounder(true);
      if (data.seededHomeId) {
        // Refresh seeded home data so Step 4 has the right context
        fetch("/api/operator/onboarding/status")
          .then((r) => r.json())
          .then((d) => { if (d.seededHome) setSeededHome(d.seededHome); })
          .catch(() => {});
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const proceedFromStep3 = () => {
    setError(null);
    goToStep(4);
  };

  // ── Step 4: Cleveland founder — complete without Stripe ──────────────────
  const completeFreeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch("/api/operator/onboarding/complete", { method: "POST" });
      router.push("/operator?onboarding=complete");
    } catch {
      setError("Failed to complete onboarding.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 4: Subscribe to a paid plan ─────────────────────────────────────
  const selectPlan = async (planKey: string) => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/operator/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout.");
      await fetch("/api/operator/onboarding/complete", { method: "POST" });
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <span className="text-xl font-bold text-primary-700">CareLinkAI</span>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
              {error}
            </div>
          )}

          {/* ── Step 1: Company Profile ── */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">Company profile</h1>
              <p className="text-neutral-500 text-sm mb-6">Tell us about your business.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Company name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    placeholder="Sunrise Senior Living"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Business phone
                  </label>
                  <input
                    type="tel"
                    className="form-input w-full"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>

              <button
                onClick={submitProfile}
                disabled={saving}
                className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {saving ? "Saving…" : <>Continue <FiArrowRight /></>}
              </button>
            </div>
          )}

          {/* ── Step 2: First Home (or claim seeded home for founders) ── */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                {clevelandFounder && seededHome ? "Confirm your home" : "Add your first home"}
              </h1>
              <p className="text-neutral-500 text-sm mb-6">
                {clevelandFounder && seededHome
                  ? "We've pre-filled your seeded home. Review and confirm to claim it."
                  : "You can add more homes later."}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Home name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={home.name}
                    onChange={(e) => setHome({ ...home, name: e.target.value })}
                    placeholder="Sunrise East Wing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    className="form-input w-full"
                    value={home.description}
                    onChange={(e) => setHome({ ...home, description: e.target.value })}
                    placeholder="Warm, community-focused assisted living…"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Street address <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={home.street}
                      onChange={(e) => setHome({ ...home, street: e.target.value })}
                      placeholder="1234 Oak Lane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      City <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={home.city}
                      onChange={(e) => setHome({ ...home, city: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        State <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        className="form-input w-full uppercase"
                        value={home.state}
                        onChange={(e) =>
                          setHome({ ...home, state: e.target.value.toUpperCase() })
                        }
                        placeholder="OH"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        ZIP <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input w-full"
                        value={home.zipCode}
                        onChange={(e) => setHome({ ...home, zipCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Capacity <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input w-full"
                      value={home.capacity}
                      onChange={(e) => setHome({ ...home, capacity: e.target.value })}
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Care types <span className="text-error-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CARE_LEVELS.map((cl) => (
                      <button
                        key={cl.value}
                        type="button"
                        onClick={() =>
                          setHome((h) => ({
                            ...h,
                            careLevel: h.careLevel.includes(cl.value)
                              ? h.careLevel.filter((v) => v !== cl.value)
                              : [...h.careLevel, cl.value],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          home.careLevel.includes(cl.value)
                            ? "bg-primary-600 text-white border-primary-600"
                            : "bg-white text-neutral-600 border-neutral-300 hover:border-primary-400"
                        }`}
                      >
                        {cl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={submitHome}
                disabled={saving}
                className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {saving
                  ? "Saving…"
                  : clevelandFounder && seededHome
                  ? <>Claim this home <FiArrowRight /></>
                  : <>Continue <FiArrowRight /></>}
              </button>
            </div>
          )}

          {/* ── Step 3: Claim link (Cleveland founder) ── */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                Cleveland founder access
              </h1>
              <p className="text-neutral-500 text-sm mb-6">
                {claimApplied
                  ? "Your founder access is active — proceed to choose your plan."
                  : "If you received a CareLinkAI founder claim link, paste it here to unlock 6 months of free access. Otherwise skip to choose a plan."}
              </p>

              {claimApplied ? (
                <div className="rounded-lg bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-800 flex items-center gap-2 mb-6">
                  <FiCheck className="w-4 h-4 flex-shrink-0" />
                  Founder access applied — 6 months free unlocked!
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <label className="block text-sm font-medium text-neutral-700">
                    Claim token
                  </label>
                  <input
                    type="text"
                    className="form-input w-full font-mono text-xs"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste your claim token here…"
                  />
                  <button
                    onClick={applyClaimToken}
                    disabled={saving || !manualToken.trim()}
                    className="btn btn-secondary w-full"
                  >
                    {saving ? "Checking…" : "Apply token"}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                {!claimApplied && (
                  <button onClick={proceedFromStep3} className="btn btn-ghost flex-1">
                    Skip — choose a plan
                  </button>
                )}
                {claimApplied && (
                  <button
                    onClick={proceedFromStep3}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    Continue to plan <FiArrowRight />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Choose plan (or free founder card) ── */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">Choose a plan</h1>
              <p className="text-neutral-500 text-sm mb-6">
                {clevelandFounder
                  ? "Your founder access is active. Complete setup below."
                  : "14-day free trial on all plans. Cancel anytime."}
              </p>

              {clevelandFounder ? (
                /* Cleveland Founder — free card, no Stripe */
                <div className="rounded-xl border-2 border-success-400 bg-success-50 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-success-500 flex items-center justify-center">
                      <FiGift className="text-white" size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900">
                        Cleveland Founder Program
                      </div>
                      <div className="text-success-700 font-bold text-lg">
                        Free for 6 months
                      </div>
                    </div>
                  </div>
                  <ul className="text-sm text-neutral-700 space-y-1.5 mb-5">
                    {[
                      "Full platform access",
                      "Unlimited homes",
                      "AI-powered matching",
                      "Priority support",
                      "No credit card required",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <FiCheck className="w-4 h-4 text-success-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={completeFreeOnboarding}
                    disabled={saving}
                    className="w-full bg-success-600 hover:bg-success-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? "Setting up…" : <>Complete setup <FiArrowRight /></>}
                  </button>
                </div>
              ) : (
                /* Paid plans */
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
                            <span className="ml-2 text-xs font-medium text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-bold text-neutral-900">
                          {plan.price}
                          <span className="text-xs font-normal text-neutral-500">/mo</span>
                        </span>
                      </div>
                      <ul className="text-xs text-neutral-600 space-y-1 mb-3">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <FiCheck className="w-3 h-3 text-success-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => selectPlan(plan.key)}
                        disabled={saving}
                        className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
                          plan.highlight
                            ? "bg-primary-600 text-white hover:bg-primary-700"
                            : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                        }`}
                      >
                        {saving ? "Loading…" : `Start with ${plan.name}`}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
