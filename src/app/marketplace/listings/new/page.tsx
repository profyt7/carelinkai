"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiCheck, FiAlertCircle, FiDollarSign,
  FiMapPin, FiCalendar, FiFileText, FiBriefcase,
} from "react-icons/fi";

// ─── static option lists (value = slug stored in DB, label = display text) ─

// Job type determines which category panels are shown
const JOB_TYPES = [
  { value: 'care', label: '🩺 Care Worker', desc: 'Caregiver, aide, nurse — hands-on personal or medical care' },
  { value: 'household', label: '🏠 Household Services', desc: 'Housekeeper, chef, companion, errands, pet care, yard work' },
];

const SETTINGS: { value: string; label: string }[] = [
  { value: 'in-home', label: 'Private Home' },
  { value: 'assisted-living', label: 'Assisted Living' },
  { value: 'memory-care', label: 'Memory Care' },
  { value: 'independent-living', label: 'Independent Living' },
  { value: 'skilled-nursing', label: 'Skilled Nursing' },
  { value: 'hospice', label: 'Hospice' },
  { value: 'senior-living-community', label: 'Senior Living' },
];

const CARE_TYPES: { value: string; label: string }[] = [
  { value: 'senior-care', label: 'Senior Care' },
  { value: 'dementia-care', label: 'Dementia Care' },
  { value: 'alzheimers-care', label: "Alzheimer's Care" },
  { value: 'parkinsons-care', label: "Parkinson's Care" },
  { value: 'post-surgery-care', label: 'Post-Surgery Care' },
  { value: 'disability-care', label: 'Disability Care' },
  { value: 'overnight-care', label: 'Overnight Care' },
  { value: 'live-in-care', label: 'Live-In Care' },
  { value: 'respite-care', label: 'Respite Care' },
  { value: 'companion-care', label: 'Companion Care' },
];

const SERVICES: { value: string; label: string }[] = [
  { value: 'personal-care', label: 'Personal Care / ADLs' },
  { value: 'medication-management', label: 'Medication Management' },
  { value: 'meal-preparation', label: 'Meal Preparation' },
  { value: 'light-housekeeping', label: 'Light Housekeeping' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'companionship', label: 'Companionship' },
  { value: 'wound-care', label: 'Wound Care' },
  { value: 'bathing-grooming', label: 'Bathing & Grooming' },
  { value: 'incontinence-care', label: 'Incontinence Care' },
  { value: 'mobility-assistance', label: 'Mobility Assistance' },
];

const SPECIALTIES: { value: string; label: string }[] = [
  { value: 'dementia-alzheimers', label: "Dementia / Alzheimer's" },
  { value: 'parkinsons', label: "Parkinson's Disease" },
  { value: 'stroke-recovery', label: 'Stroke Recovery' },
  { value: 'diabetes-management', label: 'Diabetes Management' },
  { value: 'hospice-end-of-life', label: 'Hospice / End of Life' },
  { value: 'autism-support', label: 'Autism Support' },
  { value: 'veteran-care', label: 'Veteran Care' },
  { value: 'pediatric-special-needs', label: 'Pediatric Special Needs' },
  { value: 'behavioral-health', label: 'Behavioral Health' },
];

// Household service categories (separate from care roles)
const HOUSEHOLD_SERVICES: { value: string; label: string }[] = [
  { value: 'housekeeping', label: 'Housekeeping / Cleaning' },
  { value: 'deep-cleaning', label: 'Deep Cleaning' },
  { value: 'laundry', label: 'Laundry & Ironing' },
  { value: 'personal-chef', label: 'Personal Chef / Cooking' },
  { value: 'meal-prep', label: 'Meal Prep (batch cooking)' },
  { value: 'grocery-shopping', label: 'Grocery Shopping' },
  { value: 'errands', label: 'Errand Running' },
  { value: 'companion', label: 'Companion / Sitter' },
  { value: 'pet-care', label: 'Pet Care / Dog Walking' },
  { value: 'yard-work', label: 'Yard Work / Outdoor Help' },
  { value: 'handyman', label: 'Handyman / Minor Repairs' },
  { value: 'childcare', label: 'Childcare / Babysitting' },
  { value: 'transportation-errand', label: 'Driving / Errands' },
  { value: 'other-household', label: 'Other Household Help' },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY",
];

// ─── helpers ───────────────────────────────────────────────────────────────

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function CheckGroup({
  label, options, selected, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(toggle(selected, opt.value))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                active
                  ? "bg-primary-500 border-primary-500 text-white"
                  : "bg-white border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-600"
              }`}
            >
              {active && <FiCheck className="h-3 w-3" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, children,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary-600" />
        </div>
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────

export default function NewListingPage() {
  const router = useRouter();

  const [jobType, setJobType] = useState<"care" | "household">("care");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [setting, setSetting] = useState("");
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [householdServices, setHouseholdServices] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        setting: setting || undefined,
        careTypes: jobType === "care" ? careTypes : [],
        services: jobType === "care" ? services : householdServices,
        specialties: jobType === "care" ? specialties : [],
        jobType,
        city: city || undefined,
        state: state || undefined,
        zipCode: zip || undefined,
      };

      if (rateMin) body.hourlyRateMin = parseFloat(rateMin);
      if (rateMax) body.hourlyRateMax = parseFloat(rateMax);
      if (startDate) body.startTime = new Date(startDate).toISOString();
      if (endDate) body.endTime = new Date(endDate).toISOString();

      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create listing");
      }

      const { data } = await res.json();
      router.push(`/marketplace/listings/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/marketplace?tab=jobs"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <FiArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">Marketplace</p>
        <h1 className="text-2xl font-bold text-neutral-900">Post a Job</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Describe what you need and qualified people will apply directly.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3">
          <FiAlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job type selector */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">What kind of help are you looking for?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {JOB_TYPES.map((jt) => (
              <button
                key={jt.value}
                type="button"
                onClick={() => setJobType(jt.value as "care" | "household")}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  jobType === jt.value
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 hover:border-primary-300"
                }`}
              >
                <p className="font-semibold text-neutral-900 text-sm">{jt.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{jt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Job details */}
        <Section icon={FiFileText} title="Job Details">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Job Title <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={jobType === "care" ? "e.g. Evening caregiver for mom with Alzheimer's" : "e.g. Weekly housekeeper for 3-bedroom home"}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Description <span className="text-error-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the care needs, schedule expectations, and any important details about the role..."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 resize-none"
              required
            />
            <p className="text-xs text-neutral-400 mt-1">{description.length} characters</p>
          </div>
        </Section>

        {/* Pay rate */}
        <Section icon={FiDollarSign} title="Pay Rate">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                Min Rate ($/hr)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={rateMin}
                  onChange={(e) => setRateMin(e.target.value)}
                  placeholder="18"
                  className="w-full rounded-lg border border-neutral-200 pl-7 pr-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                Max Rate ($/hr)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={rateMax}
                  onChange={(e) => setRateMax(e.target.value)}
                  placeholder="25"
                  className="w-full rounded-lg border border-neutral-200 pl-7 pr-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-400">Leave blank if rate is negotiable.</p>
        </Section>

        {/* Setting + Categories */}
        <Section icon={FiBriefcase} title={jobType === "care" ? "Care Setting" : "Job Details"}>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Location Setting
            </label>
            <div className="flex flex-wrap gap-2">
              {SETTINGS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSetting(setting === s.value ? "" : s.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    setting === s.value
                      ? "bg-primary-500 border-primary-500 text-white"
                      : "bg-white border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {jobType === "care" ? (
            <>
              <CheckGroup label="Care Types" options={CARE_TYPES} selected={careTypes} onChange={setCareTypes} />
              <CheckGroup label="Services Required" options={SERVICES} selected={services} onChange={setServices} />
              <CheckGroup label="Specialties" options={SPECIALTIES} selected={specialties} onChange={setSpecialties} />
            </>
          ) : (
            <CheckGroup label="Services Needed" options={HOUSEHOLD_SERVICES} selected={householdServices} onChange={setHouseholdServices} />
          )}
        </Section>

        {/* Location */}
        <Section icon={FiMapPin} title="Location">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cleveland"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-white"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">ZIP Code</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="44101"
              maxLength={5}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
        </Section>

        {/* Schedule */}
        <Section icon={FiCalendar} title="Schedule (Optional)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-400">Leave blank for an ongoing/open-ended position.</p>
        </Section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/marketplace?tab=jobs"
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {submitting ? "Posting…" : "Post Job Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
