'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  ShieldCheck, Search, Clock, Loader2, CheckCircle, MapPin, CalendarCheck, ListChecks, Inbox,
} from 'lucide-react';

type CuratedHome = {
  homeId: string;
  name: string;
  address?: string;
  note?: string;
  confirmedAvailability?: string;
};

type ConciergeRequest = {
  id: string;
  queryText: string;
  conciergeStatus: 'SUBMITTED' | 'MATCHING' | 'SHORTLIST_READY' | null;
  curatedHomes: CuratedHome[] | null;
  conciergeNote: string | null;
  conciergeSubmittedAt: string | null;
  conciergeRespondedAt: string | null;
  createdAt: string;
};

const STEPS = ['SUBMITTED', 'MATCHING', 'SHORTLIST_READY'] as const;
const STEP_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted',
  MATCHING: 'Matching',
  SHORTLIST_READY: 'Shortlist ready',
};

function StatusTimeline({ status }: { status: ConciergeRequest['conciergeStatus'] }) {
  const activeIdx = Math.max(0, STEPS.indexOf((status ?? 'SUBMITTED') as any));
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i <= activeIdx;
        const isReady = step === 'SHORTLIST_READY' && status === 'SHORTLIST_READY';
        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isReady
                  ? 'bg-success-100 text-success-800'
                  : done
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {step === 'SUBMITTED' && <Inbox className="h-3 w-3" />}
              {step === 'MATCHING' && (done && !isReady && status === 'MATCHING' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />)}
              {step === 'SHORTLIST_READY' && <CheckCircle className="h-3 w-3" />}
              {STEP_LABEL[step]}
            </span>
            {i < STEPS.length - 1 && <span className={`h-0.5 w-5 ${i < activeIdx ? 'bg-primary-300' : 'bg-neutral-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function DischargePlannerConciergePage() {
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/discharge-planner/concierge', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load your concierge requests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout title="Concierge">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-3 py-1 mb-2">
            <ShieldCheck className="h-4 w-4" /> AI-matched, care-team-verified
          </p>
          <h1 className="text-3xl font-bold mb-1">Concierge placements</h1>
          <p className="text-primary-100 max-w-2xl">
            Describe a patient&apos;s needs and our care team sends you a curated, availability-checked
            shortlist — right here in the app. Patient details stay private and are never emailed.
          </p>
          <Link
            href="/discharge-planner/search"
            className="mt-5 inline-flex items-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors shadow-md"
          >
            <Search className="h-5 w-5" /> Start a new placement
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your requests…
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <ListChecks className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="font-medium text-neutral-800">No concierge requests yet</p>
            <p className="text-sm text-neutral-500 mt-1">
              Run a placement search, then choose <span className="font-medium">Request a shortlist</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((r) => {
              const ready = r.conciergeStatus === 'SHORTLIST_READY';
              const homes = Array.isArray(r.curatedHomes) ? r.curatedHomes : [];
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-500 mb-1">
                          Submitted {r.conciergeSubmittedAt ? new Date(r.conciergeSubmittedAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-neutral-800 font-medium line-clamp-2">{r.queryText}</p>
                      </div>
                      <StatusTimeline status={r.conciergeStatus} />
                    </div>

                    {!ready ? (
                      <div className="mt-5 p-4 rounded-xl bg-primary-50 border border-primary-100 text-sm text-primary-800 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {r.conciergeStatus === 'MATCHING'
                          ? 'Our care team is reviewing availability and curating your shortlist.'
                          : 'Received — our care team will start curating your shortlist shortly.'}
                      </div>
                    ) : (
                      <div className="mt-5">
                        {r.conciergeNote && (
                          <div className="mb-4 p-4 rounded-xl bg-success-50 border border-success-100 text-sm text-success-900">
                            <span className="font-semibold">From your CareLinkAI care team: </span>{r.conciergeNote}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success-600" /> Your curated shortlist ({homes.length})
                        </h4>
                        <div className="space-y-3">
                          {homes.map((h) => (
                            <div key={h.homeId} className="border border-neutral-200 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                  <p className="font-semibold text-neutral-900">{h.name}</p>
                                  {h.address && (
                                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3.5 w-3.5" /> {h.address}
                                    </p>
                                  )}
                                  {h.confirmedAvailability && (
                                    <p className="text-sm text-success-700 mt-2 inline-flex items-center gap-1">
                                      <CheckCircle className="h-3.5 w-3.5" /> Availability: {h.confirmedAvailability}
                                    </p>
                                  )}
                                  {h.note && <p className="text-sm text-neutral-700 mt-2">{h.note}</p>}
                                </div>
                                <Link
                                  href={`/homes/${h.homeId}`}
                                  className="shrink-0 inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                >
                                  <CalendarCheck className="h-4 w-4" /> View &amp; request a tour
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
