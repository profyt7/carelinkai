"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiCheck, FiArrowRight, FiHome, FiUser, FiZap, FiGift, FiX } from "react-icons/fi";

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

type FieldProvenance = 'AI' | 'SEED' | 'OPERATOR';

interface SeededPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface SeededHome {
  id: string;
  name: string;
  description: string;
  capacity: number;
  careLevel: string[];
  amenities: string[];
  status: string;
  address: { street: string; city: string; state: string; zipCode: string } | null;
  // AI auto-population
  websiteUrl: string | null;
  autoPopulatedAt: string | null;
  autoPopulatedFromUrl: string | null;
  aiPopulationConfidence: string | null;
  preFilledFields: Record<string, FieldProvenance> | null;
  imageRightsAcknowledgedAt: string | null;
  enrichmentStatus: 'NONE' | 'RUNNING' | 'READY' | 'FAILED';
  enrichmentError: string | null;
  photos: SeededPhoto[];
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

// ─── Provenance badge ─────────────────────────────────────────────────────────

function ProvenanceBadge({ provenance }: { provenance: FieldProvenance | undefined }) {
  if (!provenance || provenance === 'OPERATOR') return null;
  if (provenance === 'AI') {
    return (
      <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
        ✨ AI-suggested
      </span>
    );
  }
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
      📋 From OH DOH records
    </span>
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

  // Snapshot of AI-suggested values so operator can reset to them
  const [aiOriginal, setAiOriginal] = useState<HomeForm | null>(null);

  // Auto-populated (scraped) photos shown for review in Step 2
  const [photos, setPhotos] = useState<SeededPhoto[]>([]);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [imageRightsAck, setImageRightsAck] = useState(false);

  // On-claim enrichment lifecycle (scrape + AI + photos)
  const [enrichStatus, setEnrichStatus] = useState<'NONE' | 'RUNNING' | 'READY' | 'FAILED' | null>(null);

  // Only used on Step 3 when the operator manually enters a token
  const [manualToken, setManualToken] = useState("");
  const [claimApplied, setClaimApplied] = useState(false);
  // Which paid tiers are actually purchasable (have a configured Stripe price).
  // null = not loaded yet; before it loads we hide AGENCY so a tier that would
  // dead-end at checkout never flashes. Once loaded we render exactly this set.
  const [availablePlans, setAvailablePlans] = useState<string[] | null>(null);

  // Apply an onboarding-status payload to local state (reused by polling).
  const applyStatus = (d: any) => {
    if (d.clevelandFounder) {
      setClevelandFounder(true);
      setClaimApplied(true);
    }
    if (d.seededHome) {
      setSeededHome(d.seededHome);
      const pre: HomeForm = {
        name: d.seededHome.name ?? "",
        description: d.seededHome.description ?? "",
        street: d.seededHome.address?.street ?? "",
        city: d.seededHome.address?.city ?? "",
        state: d.seededHome.address?.state ?? "",
        zipCode: d.seededHome.address?.zipCode ?? "",
        capacity: String(d.seededHome.capacity ?? ""),
        careLevel: d.seededHome.careLevel ?? [],
      };
      setHome(pre);
      if (d.seededHome.autoPopulatedAt) setAiOriginal(pre);
      if (Array.isArray(d.seededHome.photos)) setPhotos(d.seededHome.photos);
      if (d.seededHome.imageRightsAcknowledgedAt) setImageRightsAck(true);
      setEnrichStatus(d.seededHome.enrichmentStatus ?? 'NONE');
    }
  };

  // Redirect non-operators
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Load onboarding status + profile on mount; kick off enrichment if needed.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      const d = await fetch("/api/operator/onboarding/status")
        .then((r) => r.json())
        .catch(() => null);
      if (!d || cancelled) return;
      applyStatus(d);

      // Claim-start trigger: a seeded home with a website that hasn't been
      // enriched yet → start the background enrichment job.
      const sh = d.seededHome;
      if (sh && sh.websiteUrl && sh.enrichmentStatus === "NONE" && !sh.autoPopulatedAt) {
        const res = await fetch("/api/operator/onboarding/enrich", { method: "POST" })
          .then((r) => r.json())
          .catch(() => null);
        if (!cancelled && res?.status) setEnrichStatus(res.status);
      }
    })();

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

    return () => { cancelled = true; };
  }, [status]);

  // Learn which paid tiers are purchasable so the plan picker hides any tier
  // whose Stripe price isn't configured (e.g. AGENCY) — no broken checkout clicks.
  useEffect(() => {
    fetch("/api/operator/billing/plans")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.available)) setAvailablePlans(d.available); })
      .catch(() => {});
  }, []);

  // Poll the status endpoint while enrichment is running; stop when it resolves.
  useEffect(() => {
    if (enrichStatus !== "RUNNING") return;
    const id = setInterval(async () => {
      const d = await fetch("/api/operator/onboarding/status")
        .then((r) => r.json())
        .catch(() => null);
      if (d) applyStatus(d);
    }, 3000);
    return () => clearInterval(id);
  }, [enrichStatus]);

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
    const missingAddress: string[] = [];
    if (!home.street.trim()) missingAddress.push("Street address");
    if (!home.city.trim()) missingAddress.push("City");
    if (!home.state.trim()) missingAddress.push("State");
    if (!home.zipCode.trim()) missingAddress.push("ZIP code");
    if (missingAddress.length > 0) {
      setError(`${missingAddress.join(", ")} ${missingAddress.length === 1 ? "is" : "are"} required.`);
      return;
    }
    if (home.careLevel.length === 0) { setError("Select at least one care type."); return; }
    if (!home.capacity || parseInt(home.capacity) < 1) { setError("Capacity must be at least 1."); return; }

    // Claiming a listing requires confirming rights to the website's content.
    if (clevelandFounder && seededHome && !imageRightsAck) {
      setError("Please confirm you have rights to use your website's photos and content.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      if (clevelandFounder && seededHome) {
        // Transfer the seeded home to this operator instead of creating a new one
        const res = await fetch(`/api/operator/homes/${seededHome.id}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageRightsAcknowledged: imageRightsAck }),
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

  // ── Step 2: Remove an auto-populated photo ───────────────────────────────
  const removePhoto = async (photoId: string) => {
    setRemovingPhotoId(photoId);
    // Optimistic removal — restore on failure.
    const prev = photos;
    setPhotos((ps) => ps.filter((p) => p.id !== photoId));
    try {
      const res = await fetch(`/api/operator/onboarding/seeded-photo/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove photo.");
    } catch {
      setPhotos(prev); // restore
      setError("Couldn't remove that photo — please try again.");
    } finally {
      setRemovingPhotoId(null);
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

          {/* ── Step 2: First Home (or claim / confirm pre-populated home) ── */}
          {step === 2 && (() => {
            const isPrePopulated = !!(clevelandFounder && seededHome?.autoPopulatedAt);
            const pf = seededHome?.preFilledFields ?? {};
            const prov = (field: string): FieldProvenance | undefined => pf[field] as FieldProvenance | undefined;
            const sourceDomain = seededHome?.autoPopulatedFromUrl
              ? (() => { try { return new URL(seededHome.autoPopulatedFromUrl).hostname.replace(/^www\./, ''); } catch { return seededHome.autoPopulatedFromUrl; } })()
              : null;
            const buildDomain = seededHome?.websiteUrl
              ? (() => { try { return new URL(seededHome.websiteUrl).hostname.replace(/^www\./, ''); } catch { return seededHome.websiteUrl; } })()
              : null;

            // While enrichment runs, show a "building" state instead of the form.
            if (enrichStatus === 'RUNNING') {
              return (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-5 h-12 w-12 rounded-full border-[3px] border-violet-200 border-t-violet-600 animate-spin" />
                  <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                    Building your profile…
                  </h1>
                  <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                    We're pulling your details and photos{buildDomain ? ` from ${buildDomain}` : " from your website"} and
                    drafting your listing. This usually takes under a minute.
                  </p>
                  <div className="mt-6 flex flex-col items-center gap-2 text-sm text-neutral-400">
                    <span className="inline-flex items-center gap-2"><span className="text-violet-500">✨</span> Reading your website</span>
                    <span className="inline-flex items-center gap-2"><span className="text-violet-500">🖼️</span> Selecting your best photos</span>
                    <span className="inline-flex items-center gap-2"><span className="text-violet-500">📝</span> Drafting your description</span>
                  </div>
                </div>
              );
            }

            return (
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                  {isPrePopulated
                    ? `We pre-populated your profile`
                    : clevelandFounder && seededHome
                    ? "Confirm your home"
                    : "Add your first home"}
                </h1>
                <p className="text-neutral-500 text-sm mb-1">
                  {isPrePopulated
                    ? `Content pulled from ${sourceDomain ?? "your website"}.`
                    : clevelandFounder && seededHome
                    ? "We've pre-filled your seeded home. Review and confirm to claim it."
                    : "You can add more homes later."}
                </p>
                {isPrePopulated && (
                  <p className="text-neutral-400 text-xs mb-5">
                    Review the fields below. Edit anything that isn't right, then continue.
                    Nothing is committed until you click <strong>Confirm and continue</strong>.
                  </p>
                )}
                {enrichStatus === 'FAILED' && !isPrePopulated && (
                  <div className="mb-5 rounded-lg px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-800">
                    We couldn't automatically pull your website content this time — no problem,
                    just fill in the details below and you're all set.
                  </div>
                )}
                {!isPrePopulated && <div className="mb-6" />}

                {/* Confidence banner for AI-populated homes */}
                {isPrePopulated && seededHome?.aiPopulationConfidence && (
                  <div className={`mb-5 rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
                    seededHome.aiPopulationConfidence === 'HIGH'
                      ? 'bg-violet-50 border border-violet-200 text-violet-800'
                      : seededHome.aiPopulationConfidence === 'MEDIUM'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-neutral-50 border border-neutral-200 text-neutral-600'
                  }`}>
                    <span className="text-base leading-none mt-0.5">✨</span>
                    <span>
                      <strong>AI extraction confidence: {seededHome.aiPopulationConfidence}</strong>
                      {seededHome.aiPopulationConfidence === 'LOW' &&
                        " — the website had limited content. Please fill in any missing fields."}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Home name */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Home name <span className="text-error-500">*</span>
                      <ProvenanceBadge provenance={prov('name')} />
                    </label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={home.name}
                      onChange={(e) => setHome({ ...home, name: e.target.value })}
                      placeholder="Sunrise East Wing"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Description <span className="text-error-500">*</span>
                      <ProvenanceBadge provenance={prov('description')} />
                    </label>
                    <textarea
                      rows={isPrePopulated ? 5 : 2}
                      className="form-input w-full"
                      value={home.description}
                      onChange={(e) => setHome({ ...home, description: e.target.value })}
                      placeholder="Warm, community-focused assisted living…"
                    />
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Street address <span className="text-error-500">*</span>
                        <ProvenanceBadge provenance={prov('street')} />
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
                        <ProvenanceBadge provenance={prov('city')} />
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
                          <ProvenanceBadge provenance={prov('state')} />
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
                          <ProvenanceBadge provenance={prov('zipCode')} />
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
                        <ProvenanceBadge provenance={prov('capacity')} />
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

                  {/* Care types */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Care types <span className="text-error-500">*</span>
                      <ProvenanceBadge provenance={prov('careLevel')} />
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

                  {/* AI-suggested amenities (read-only preview) */}
                  {isPrePopulated && seededHome?.amenities && seededHome.amenities.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Amenities
                        <ProvenanceBadge provenance={prov('amenities')} />
                        <span className="ml-2 text-xs text-neutral-400">(editable after onboarding)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {seededHome.amenities.slice(0, 10).map((a) => (
                          <span
                            key={a}
                            className="px-2.5 py-1 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-200"
                          >
                            {a}
                          </span>
                        ))}
                        {seededHome.amenities.length > 10 && (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-neutral-100 text-neutral-500">
                            +{seededHome.amenities.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Auto-populated photos (Task 5) */}
                  {photos.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Photos
                        <ProvenanceBadge provenance={'AI'} />
                      </label>
                      <p className="text-xs text-neutral-500 mb-3">
                        We pre-populated these photos from your website. Click ✕ to remove
                        any image — only the ones you keep will appear on your public listing.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((p) => (
                          <div
                            key={p.id}
                            className="group relative aspect-square overflow-hidden rounded-xl shadow-sm border border-neutral-200 bg-neutral-100"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt={p.caption ?? "Facility photo"}
                              loading="lazy"
                              className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                              onClick={() => setLightboxUrl(p.url)}
                            />
                            <button
                              type="button"
                              aria-label="Remove photo"
                              disabled={removingPhotoId === p.id}
                              onClick={() => removePhoto(p.id)}
                              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-error-600 transition-all disabled:opacity-40"
                            >
                              <FiX size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image rights acknowledgment (Task 6) — required to claim a listing */}
                {clevelandFounder && seededHome && (
                  <label className="mt-6 flex items-start gap-2.5 text-sm text-neutral-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={imageRightsAck}
                      onChange={(e) => setImageRightsAck(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      By claiming this listing, I confirm I have rights to use the photos
                      and content from my website on CareLinkAI.
                    </span>
                  </label>
                )}

                {/* Footer: confirm + reset link */}
                <button
                  onClick={submitHome}
                  disabled={saving}
                  className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
                >
                  {saving
                    ? "Saving…"
                    : isPrePopulated
                    ? <>Confirm and continue <FiArrowRight /></>
                    : clevelandFounder && seededHome
                    ? <>Claim this home <FiArrowRight /></>
                    : <>Continue <FiArrowRight /></>}
                </button>

                {isPrePopulated && aiOriginal && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setHome(aiOriginal)}
                      className="text-xs text-neutral-400 hover:text-violet-600 transition-colors underline underline-offset-2"
                    >
                      Reset to AI suggestions
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

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
                /* Paid plans — only those actually purchasable (configured Stripe price).
                   Before availability loads, hide AGENCY so a dead-end tier never flashes. */
                <div className="space-y-3">
                  {PLANS.filter((plan) =>
                    availablePlans === null ? plan.key !== "AGENCY" : availablePlans.includes(plan.key)
                  ).map((plan) => (
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

      {/* Photo lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Facility photo"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
