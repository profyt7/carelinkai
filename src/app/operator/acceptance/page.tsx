'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiShield, FiCheckSquare, FiSquare, FiAlertTriangle } from 'react-icons/fi';
import { BAA_CURRENT_VERSION, DPA_CURRENT_VERSION } from '@/lib/legal';

const BAA_SUMMARY = `
BUSINESS ASSOCIATE AGREEMENT (BAA) — ${BAA_CURRENT_VERSION}

> DRAFT — NOT LEGAL TEXT. Pending attorney review.

This BAA governs CareLinkAI's use of Protected Health Information (PHI) as your Business Associate under HIPAA.

Key obligations CareLinkAI accepts:
• Not use or disclose PHI other than as permitted by this BAA or required by law
• Implement appropriate technical safeguards (encryption, access controls, audit logging)
• Report any PHI breaches to you as required by 45 C.F.R. § 164.410
• Ensure subcontractors agree to equivalent restrictions
• Support your obligations for individual rights (access, amendment, accounting of disclosures)
• Return or destroy PHI upon termination, where feasible

Your obligations as Covered Entity:
• Notify CareLinkAI of limitations on PHI use that may affect service delivery
• Not request CareLinkAI to use or disclose PHI in violation of HIPAA
• Obtain all necessary individual authorizations

This BAA is effective upon your electronic acceptance and governed by federal law and Ohio law.
`.trim();

const DPA_SUMMARY = `
DATA PROCESSING AGREEMENT (DPA) — ${DPA_CURRENT_VERSION}

> DRAFT — NOT LEGAL TEXT. Pending attorney review.

This DPA governs CareLinkAI's processing of personal data on your behalf.

CareLinkAI as Processor agrees to:
• Process personal data only on your documented instructions
• Ensure authorized personnel are committed to confidentiality
• Implement appropriate technical and organizational security measures
• Notify you of personal data breaches promptly
• Delete or return all personal data upon termination at your election
• Provide information demonstrating compliance

Sub-processors used (United States only):
• Render.com — hosting and infrastructure
• Amazon Web Services — encrypted file storage
• Resend — transactional email
• Stripe — payment processing
• Sentry — error monitoring (no PHI sent)

All personal data is processed and stored within the United States.
`.trim();

export default function OperatorAcceptancePage() {
  const router = useRouter();
  const [acceptedBaa, setAcceptedBaa] = useState(false);
  const [acceptedDpa, setAcceptedDpa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!acceptedBaa || !acceptedDpa) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/operator/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedBaa, acceptedDpa }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to record acceptance. Please try again.');
        return;
      }

      router.push('/operator');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-start justify-center pt-8 px-4 pb-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Legal Agreements Required</h1>
          <p className="text-neutral-600 mt-2 text-sm">
            Before accessing the operator platform, you must review and accept our Business Associate Agreement and Data Processing Agreement as required by HIPAA.
          </p>
        </div>

        {/* DRAFT NOTICE */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Notice:</strong> These agreements are draft templates pending attorney review. They establish important HIPAA obligations. Contact us at{' '}
            <a href="mailto:legal@carelinkai.com" className="underline">legal@carelinkai.com</a> with questions.
          </div>
        </div>

        {/* BAA */}
        <div className="bg-white border border-neutral-200 rounded-lg mb-6">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-semibold text-neutral-900">Business Associate Agreement (BAA)</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Version: {BAA_CURRENT_VERSION}</p>
          </div>
          <pre className="p-4 text-xs text-neutral-700 whitespace-pre-wrap font-sans overflow-y-auto max-h-48 leading-relaxed bg-neutral-50">
            {BAA_SUMMARY}
          </pre>
          <div
            className="p-4 border-t border-neutral-100 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 rounded-b-lg"
            onClick={() => setAcceptedBaa((v) => !v)}
          >
            {acceptedBaa ? (
              <FiCheckSquare className="w-5 h-5 text-primary-600 flex-shrink-0" />
            ) : (
              <FiSquare className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            )}
            <span className="text-sm text-neutral-800">
              I have read and agree to the Business Associate Agreement on behalf of my organization
            </span>
          </div>
        </div>

        {/* DPA */}
        <div className="bg-white border border-neutral-200 rounded-lg mb-6">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-semibold text-neutral-900">Data Processing Agreement (DPA)</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Version: {DPA_CURRENT_VERSION}</p>
          </div>
          <pre className="p-4 text-xs text-neutral-700 whitespace-pre-wrap font-sans overflow-y-auto max-h-48 leading-relaxed bg-neutral-50">
            {DPA_SUMMARY}
          </pre>
          <div
            className="p-4 border-t border-neutral-100 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 rounded-b-lg"
            onClick={() => setAcceptedDpa((v) => !v)}
          >
            {acceptedDpa ? (
              <FiCheckSquare className="w-5 h-5 text-primary-600 flex-shrink-0" />
            ) : (
              <FiSquare className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            )}
            <span className="text-sm text-neutral-800">
              I have read and agree to the Data Processing Agreement on behalf of my organization
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!acceptedBaa || !acceptedDpa || submitting}
          className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Recording acceptance…' : 'Accept Both Agreements & Continue'}
        </button>

        <p className="text-xs text-neutral-500 text-center mt-4">
          By clicking above, your agreement is recorded with your IP address, timestamp, and document version for compliance purposes.
        </p>
      </div>
    </div>
  );
}
