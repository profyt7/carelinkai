"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiMessageSquare,
  FiCalendar,
  FiUsers,
  FiHome,
  FiChevronLeft,
  FiCheck,
} from "react-icons/fi";

type InquiryForm = {
  homeName: string;
  homeAddress: string;
  contactName: string;
  email: string;
  phone: string;
  moveInTimeframe: string;
  careNeeded: string[];
  message: string;
  tourDate: string;
  tourTime: string;
};

const CARE_OPTIONS = [
  "Assisted Living",
  "Memory Care",
  "Medication Management",
  "Incontinence Care",
  "Diabetes Management",
  "Physical Therapy",
];

export default function NewInquiryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<InquiryForm>({
    homeName: "",
    homeAddress: "",
    contactName: "",
    email: "",
    phone: "",
    moveInTimeframe: "1-3 months",
    careNeeded: [],
    message: "",
    tourDate: "",
    tourTime: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCare = (care: string) => {
    setForm((prev) => {
      const exists = prev.careNeeded.includes(care);
      return {
        ...prev,
        careNeeded: exists
          ? prev.careNeeded.filter((c) => c !== care)
          : [...prev.careNeeded, care],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Placeholder: in a real app this would POST to an API to create the inquiry
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard/inquiries");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="New Inquiry">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800"
          >
            <FiChevronLeft className="mr-1 h-4 w-4" /> Back to Inquiries
          </button>
          <h1 className="text-2xl font-bold text-neutral-800">Start a New Inquiry</h1>
          <p className="text-neutral-600">Provide details to contact a care home and optionally schedule a tour.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Form fields */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center text-lg font-medium text-neutral-800">
                <FiHome className="mr-2" /> Care Home Details
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="homeName">
                    Care Home Name
                  </label>
                  <input
                    id="homeName"
                    name="homeName"
                    value={form.homeName}
                    onChange={handleChange}
                    placeholder="e.g., Sunshine Care Home"
                    required
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="homeAddress">
                    Address (optional)
                  </label>
                  <input
                    id="homeAddress"
                    name="homeAddress"
                    value={form.homeAddress}
                    onChange={handleChange}
                    placeholder="Street, City, State"
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center text-lg font-medium text-neutral-800">
                <FiUsers className="mr-2" /> Your Information
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="contactName">
                    Your Name
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    required
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="moveInTimeframe">
                    Move-in Timeframe
                  </label>
                  <select
                    id="moveInTimeframe"
                    name="moveInTimeframe"
                    value={form.moveInTimeframe}
                    onChange={handleChange}
                    className="form-select w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="Immediately">Immediately</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6+ months">6+ months</option>
                    <option value="Just researching">Just researching</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center text-lg font-medium text-neutral-800">
                <FiMessageSquare className="mr-2" /> Care Needs & Message
              </h2>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Care Services Needed
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CARE_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 rounded border-neutral-300 text-primary-500"
                        checked={form.careNeeded.includes(option)}
                        onChange={() => toggleCare(option)}
                      />
                      <span className="ml-2 text-sm text-neutral-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="message">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Any specific questions or care needs?"
                  className="form-textarea w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center text-lg font-medium text-neutral-800">
                <FiCalendar className="mr-2" /> Optional: Schedule a Tour
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tourDate">
                    Tour Date
                  </label>
                  <input
                    id="tourDate"
                    name="tourDate"
                    type="date"
                    value={form.tourDate}
                    onChange={handleChange}
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tourTime">
                    Tour Time
                  </label>
                  <input
                    id="tourTime"
                    name="tourTime"
                    type="time"
                    value={form.tourTime}
                    onChange={handleChange}
                    className="form-input w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">We'll include your preferred time in the inquiry to the care home.</p>
            </section>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/inquiries")}
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {submitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2 h-4 w-4" /> Submit Inquiry
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Tips */}
          <aside className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <h3 className="mb-2 text-base font-medium text-neutral-800">Tips for a great inquiry</h3>
              <ul className="list-disc pl-5 text-sm text-neutral-600">
                <li>Mention specific care needs and preferences</li>
                <li>Share your preferred move-in timeframe</li>
                <li>Provide best contact method and time</li>
              </ul>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <h3 className="mb-2 text-base font-medium text-neutral-800">What happens next?</h3>
              <p className="text-sm text-neutral-600">
                The care home will review your inquiry and contact you to answer questions and discuss next steps. If you scheduled a tour, they will confirm the date and time.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </DashboardLayout>
  );
}
