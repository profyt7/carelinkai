/**
 * /facility/respond?token=… — a shortlisted facility accepts or declines a
 * concierge placement (sprint W4-2). Public (no login); the signed token is
 * the authorization. PHI-MINIMAL: only care level, payer lane and timeline
 * are shown — never the patient's name, DOB, diagnosis or notes.
 *
 * The GET only READS the row (and stamps openedAt once). The response itself
 * is a client POST, so a link-scanning mail gateway can never accept/decline.
 */

export const dynamic = 'force-dynamic';

import { openFacilityResponse } from '@/lib/concierge/facility-response-engine';
import { DECLINE_REASON_LABELS } from '@/lib/concierge/facility-response';
import FacilityRespondClient from './FacilityRespondClient';

type SearchParams = Promise<{ token?: string }>;

export default async function FacilityRespondPage({ searchParams }: { searchParams: SearchParams }) {
  const { token = '' } = await searchParams;
  const view = token ? await openFacilityResponse(token) : null;

  let content: React.ReactNode;
  if (!view) {
    content = (
      <div className="text-center" data-testid="facility-invalid">
        <h2 className="text-lg font-semibold text-neutral-900">This link is invalid or has expired</h2>
        <p className="mt-2 text-sm text-neutral-600">Response links are single-use and expire after 30 days. Reply to the email and we will send a fresh one.</p>
      </div>
    );
  } else if (!['PENDING', 'SENT', 'OPENED'].includes(view.status)) {
    content = (
      <div className="text-center" data-testid="facility-closed" data-status={view.status}>
        <h2 className="text-lg font-semibold text-neutral-900">
          {view.status === 'DECLINED'
            ? `Declined — ${view.declineReason ? DECLINE_REASON_LABELS[view.declineReason] : 'recorded'}`
            : view.status === 'ADMITTED'
              ? 'Admitted — thank you'
              : 'Accepted — thank you'}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {view.status === 'DECLINED'
            ? `Your response for ${view.facilityName} is recorded. We will not send this placement again.`
            : `CareLinkAI will coordinate the next step for ${view.facilityName} with the discharge planner.`}
        </p>
      </div>
    );
  } else {
    content = <FacilityRespondClient token={token} facilityName={view.facilityName} summary={view.summary} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm border border-neutral-100" data-testid="facility-page">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary-600 mb-4">CareLinkAI · Placement inquiry</p>
        {content}
        <p className="mt-8 text-center text-xs text-neutral-400">No resident details are shown here. They are shared in the app only after you accept.</p>
      </div>
    </div>
  );
}
