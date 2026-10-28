'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PAYER_SOURCE_OPTIONS, PAYER_SOURCE_LABELS, isPayerSource } from '@/lib/payer/payer-source';

interface PlacementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional "preferred" home the DP clicked from results (concierge hint only). */
  home?: {
    homeId: string;
    homeName: string;
    address?: string;
  } | null;
  searchId: string;
  /** 'concierge' (default) routes to CareLinkAI; 'direct' is the legacy operator email. */
  mode?: 'concierge' | 'direct';
  onSubmitted?: () => void;
}

export default function PlacementRequestModal({
  isOpen,
  onClose,
  home,
  searchId,
  mode = 'concierge',
  onSubmitted,
}: PlacementRequestModalProps) {
  const concierge = mode !== 'direct';

  // Payer-source screener (OL-114): structured + OPTIONAL ('' = unanswered) —
  // replaces the old paymentType select that silently defaulted to 'private'.
  const emptyForm = {
    patientName: '',
    patientAge: '',
    medicalNeeds: '',
    timeline: 'immediate',
    payerSource: '',
    additionalNotes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!e?.target) return;
    const { name, value } = e.target;
    if (!name) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Minimum-necessary: care needs are required; patient name is optional
    // (initials are fine). Direct mode keeps the stricter legacy validation.
    if (!formData.medicalNeeds || (!concierge && (!formData.patientName || !formData.patientAge))) {
      setError(concierge ? 'Please describe the care needs.' : 'Please fill in all required fields.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const url = concierge
        ? '/api/discharge-planner/concierge'
        : '/api/discharge-planner/placement-request';
      // Structured payerSource travels top-level (OL-114); patientInfo keeps a
      // human-readable paymentType label for the existing admin/email displays.
      const { payerSource, ...patientFields } = formData;
      const payerLabel = isPayerSource(payerSource) ? PAYER_SOURCE_LABELS[payerSource] : '';
      const body = concierge
        ? {
            searchId,
            payerSource: payerSource || undefined,
            patientInfo: {
              ...patientFields,
              ...(payerLabel ? { paymentType: payerLabel } : {}),
              ...(home?.homeId ? { preferredHomeId: home.homeId, preferredHomeName: home.homeName } : {}),
            },
          }
        : {
            searchId,
            homeId: home?.homeId,
            payerSource: payerSource || undefined,
            patientInfo: { ...patientFields, paymentType: payerLabel || 'Not specified' },
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to submit request');
      }

      setSuccess(true);
      toast.success(concierge ? 'Sent to the CareLinkAI care team' : 'Placement request sent');
      onSubmitted?.();

      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData(emptyForm);
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request');
      toast.error(err?.message || 'Failed to submit request');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {success ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-10 w-10 text-success-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                      {concierge ? 'Request submitted' : 'Request Sent Successfully!'}
                    </h3>
                    <p className="text-neutral-600">
                      {concierge
                        ? 'Our care team is building your shortlist. Track it under Concierge.'
                        : 'The facility will receive your placement request shortly.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Dialog.Title as="h3" className="text-2xl font-bold text-neutral-900 mb-1">
                      {concierge ? 'Request a CareLinkAI shortlist' : 'Send Placement Request'}
                    </Dialog.Title>
                    {concierge ? (
                      <div className="mb-5">
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-3 py-1">
                          <ShieldCheck className="h-4 w-4" /> AI-matched, care-team-verified
                        </p>
                        <p className="text-neutral-600 text-sm mt-2">
                          Share the patient&apos;s needs. Our care team reviews real-time availability and
                          sends you a curated shortlist in the app — patient details stay private and are
                          never emailed.
                          {home?.homeName ? (
                            <> We&apos;ll note your interest in <span className="font-semibold">{home.homeName}</span>.</>
                          ) : null}
                        </p>
                      </div>
                    ) : (
                      <p className="text-neutral-600 mb-6">
                        To: <span className="font-semibold">{home?.homeName || 'Unknown Home'}</span>
                      </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label htmlFor="patientName" className="block text-sm font-semibold text-neutral-700 mb-2">
                          Patient Name or Initials {concierge ? '(optional)' : '*'}
                        </label>
                        <input
                          type="text" id="patientName" name="patientName"
                          value={formData.patientName} onChange={handleChange}
                          required={!concierge}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder={concierge ? 'e.g., J.D.' : 'John Doe'}
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <label htmlFor="patientAge" className="block text-sm font-semibold text-neutral-700 mb-2">
                          Patient Age {concierge ? '(optional)' : '*'}
                        </label>
                        <input
                          type="number" id="patientAge" name="patientAge"
                          value={formData.patientAge} onChange={handleChange}
                          required={!concierge} min="0" max="150"
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="78" autoComplete="off"
                        />
                      </div>

                      <div>
                        <label htmlFor="medicalNeeds" className="block text-sm font-semibold text-neutral-700 mb-2">
                          Care Needs &amp; Requirements *
                        </label>
                        <textarea
                          id="medicalNeeds" name="medicalNeeds"
                          value={formData.medicalNeeds} onChange={handleChange}
                          required rows={4}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          placeholder="E.g., Moderate Alzheimer's, requires 24/7 supervision, physical therapy 3x/week..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="timeline" className="block text-sm font-semibold text-neutral-700 mb-2">
                            Timeline
                          </label>
                          <select
                            id="timeline" name="timeline" value={formData.timeline} onChange={handleChange}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="immediate">Immediate (within 1 week)</option>
                            <option value="urgent">Urgent (1-2 weeks)</option>
                            <option value="planned">Planned (2-4 weeks)</option>
                            <option value="flexible">Flexible (1+ months)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="payerSource" className="block text-sm font-semibold text-neutral-700 mb-2">
                            How will care most likely be paid for? <span className="font-normal text-neutral-400">(optional)</span>
                          </label>
                          <select
                            id="payerSource" name="payerSource" value={formData.payerSource} onChange={handleChange}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Select if known</option>
                            {PAYER_SOURCE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-neutral-500">No wrong answers — "Not sure yet" is fine.</p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="additionalNotes" className="block text-sm font-semibold text-neutral-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          id="additionalNotes" name="additionalNotes"
                          value={formData.additionalNotes} onChange={handleChange} rows={3}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          placeholder="Location preferences, room type, special requirements..."
                        />
                      </div>

                      {error && (
                        <div className="p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-error-600">{error}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button" onClick={onClose} disabled={isSending}
                          className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit" disabled={isSending}
                          className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {isSending ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>{concierge ? 'Submit to CareLinkAI' : 'Send Request'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
