/**
 * /lead/new?k=… — scoped, no-auth DP lead-capture form (feat/dp-lead-capture).
 *
 * The ONLY surface Anita (a Fiverr contractor with no app account) touches. The
 * `k` shared-secret token is verified server-side here; without it the page shows
 * an inert "invalid link" state and never renders the form. NO PHI is collected —
 * planner contact + interest only.
 */

export const dynamic = 'force-dynamic';

import { leadCaptureTokenValid } from '@/lib/dp-outreach/lead-capture-token';
import DPLeadForm from '@/components/lead/DPLeadForm';

export const metadata = {
  title: 'Log a discharge planner · CareLinkAI',
  robots: { index: false, follow: false },
};

export default function LeadNewPage({ searchParams }: { searchParams: { k?: string } }) {
  const token = searchParams.k ?? '';
  const valid = leadCaptureTokenValid(token);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-neutral-100">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary-600 mb-4">
          CareLinkAI · Discharge planner intake
        </p>
        {valid ? (
          <DPLeadForm token={token} />
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold text-neutral-900">This link isn’t valid</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Double-check the link you were given, or ask Chris for a fresh one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
