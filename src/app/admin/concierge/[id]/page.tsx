'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Send, CheckCircle, Star, MapPin, Bed, User, ClipboardList, Clock,
} from 'lucide-react';

type Match = {
  homeId: string;
  homeName: string;
  address?: string;
  score?: number;
  reasoning?: string;
  careTypes?: string[];
  availableBeds?: number;
  startingPrice?: number;
  contactEmail?: string;
  contactPhone?: string;
};

type PatientInfo = {
  patientName?: string;
  patientAge?: string;
  medicalNeeds?: string;
  timeline?: string;
  paymentType?: string;
  additionalNotes?: string;
  preferredHomeId?: string;
  preferredHomeName?: string;
};

type Detail = {
  id: string;
  queryText: string;
  parsedCriteria: any;
  searchResults: { matches?: Match[] } | null;
  patientInfo: PatientInfo | null;
  conciergeStatus: string | null;
  curatedHomes: { homeId: string; note?: string; confirmedAvailability?: string; tourStatus?: 'REQUESTED'; tourRequestedAt?: string }[] | null;
  conciergeNote: string | null;
  conciergeSubmittedAt: string | null;
  conciergeRespondedAt: string | null;
  user: {
    firstName: string | null; lastName: string | null; email: string | null; phone: string | null;
    dischargePlannerProfile: { organization: string | null; title: string | null } | null;
  } | null;
};

type Selection = { included: boolean; note: string; confirmedAvailability: string };

export default function AdminConciergeCuratePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, Selection>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      const d: Detail = data.request;
      setDetail(d);
      setNote(d.conciergeNote ?? '');
      // Seed selections from a prior shortlist if present.
      const prior = new Map((d.curatedHomes ?? []).map((c) => [c.homeId, c]));
      const seed: Record<string, Selection> = {};
      (d.searchResults?.matches ?? []).forEach((m) => {
        const p = prior.get(m.homeId);
        seed[m.homeId] = {
          included: !!p,
          note: p?.note ?? '',
          confirmedAvailability: p?.confirmedAvailability ?? '',
        };
      });
      setSel(seed);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const update = (homeId: string, patch: Partial<Selection>) =>
    setSel((prev) => ({ ...prev, [homeId]: { ...prev[homeId], ...patch } }));

  const markMatching = async () => {
    setSaving('matching');
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'matching' }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
      toast.success('Marked as Matching');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const sendShortlist = async () => {
    const curatedHomes = Object.entries(sel)
      .filter(([, s]) => s.included)
      .map(([homeId, s]) => ({ homeId, note: s.note, confirmedAvailability: s.confirmedAvailability }));
    if (curatedHomes.length === 0) {
      toast.error('Select at least one home for the shortlist');
      return;
    }
    setSaving('respond');
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', curatedHomes, conciergeNote: note }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
      toast.success('Shortlist sent to the discharge planner');
      router.push('/admin/concierge');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>;
  }
  if (error || !detail) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error || 'Not found'}</div>
        <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-primary-600 mt-4 text-sm"><ArrowLeft className="h-4 w-4" /> Back to queue</Link>
      </div>
    );
  }

  const p = detail.patientInfo ?? {};
  const matches = detail.searchResults?.matches ?? [];
  const tourRequestedHomeIds = new Set((detail.curatedHomes ?? []).filter((h) => h.tourStatus === 'REQUESTED').map((h) => h.homeId));
  const dpName = [detail.user?.firstName, detail.user?.lastName].filter(Boolean).join(' ') || detail.user?.email || 'Discharge planner';
  const selectedCount = Object.values(sel).filter((s) => s.included).length;
  const isReady = detail.conciergeStatus === 'SHORTLIST_READY';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium"><ArrowLeft className="h-4 w-4" /> Back to queue</Link>
        <span className="text-xs text-neutral-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Submitted {detail.conciergeSubmittedAt ? new Date(detail.conciergeSubmittedAt).toLocaleString() : '—'}
          {isReady && detail.conciergeRespondedAt ? ` · Sent ${new Date(detail.conciergeRespondedAt).toLocaleString()}` : ''}
        </span>
      </div>

      {/* DP + patient intake */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2"><User className="h-4 w-4 text-primary-600" /> Discharge planner</h2>
          <p className="font-semibold text-neutral-900">{dpName}</p>
          {detail.user?.dischargePlannerProfile?.organization && <p className="text-sm text-neutral-600">{detail.user.dischargePlannerProfile.organization}</p>}
          <p className="text-sm text-neutral-500 mt-1">{detail.user?.email}{detail.user?.phone ? ` · ${detail.user.phone}` : ''}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary-600" /> Patient intake <span className="text-xs font-normal text-neutral-400">(in-app only)</span></h2>
          <dl className="text-sm text-neutral-700 space-y-1">
            {(p.patientName || p.patientAge) && <div><span className="font-medium">Patient:</span> {p.patientName || '—'}{p.patientAge ? `, age ${p.patientAge}` : ''}</div>}
            {p.timeline && <div><span className="font-medium">Timeline:</span> {p.timeline}</div>}
            {p.paymentType && <div><span className="font-medium">Payment:</span> {p.paymentType}</div>}
            {p.preferredHomeName && <div><span className="font-medium">DP preferred:</span> {p.preferredHomeName}</div>}
            {p.medicalNeeds && <div className="pt-1"><span className="font-medium">Care needs:</span> {p.medicalNeeds}</div>}
            {p.additionalNotes && <div className="pt-1"><span className="font-medium">Notes:</span> {p.additionalNotes}</div>}
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-sm font-semibold text-neutral-700 mb-1">Original request</h2>
        <p className="text-sm text-neutral-700">{detail.queryText}</p>
      </div>

      {/* Curate */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Curate the shortlist</h2>
          <span className="text-sm text-neutral-500">{selectedCount} selected</span>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-neutral-500">No AI candidate matches were stored for this search.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const s = sel[m.homeId] ?? { included: false, note: '', confirmedAvailability: '' };
              return (
                <div key={m.homeId} className={`border rounded-xl p-4 transition-colors ${s.included ? 'border-primary-300 bg-primary-50/40' : 'border-neutral-200'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox" checked={s.included}
                      onChange={(e) => update(m.homeId, { included: e.target.checked })}
                      className="mt-1.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-900">{m.homeName}</span>
                        {typeof m.score === 'number' && (
                          <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium"><Star className="h-3 w-3 fill-current" /> {m.score}</span>
                        )}
                        {tourRequestedHomeIds.has(m.homeId) && (
                          <span className="inline-flex items-center gap-1 bg-success-100 text-success-800 px-2 py-0.5 rounded-full text-xs font-medium">🗓️ Tour requested</span>
                        )}
                        <Link href={`/homes/${m.homeId}`} target="_blank" className="text-xs text-primary-600 underline">view</Link>
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-3 mt-0.5 flex-wrap">
                        {m.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.address}</span>}
                        {typeof m.availableBeds === 'number' && <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" /> {m.availableBeds} beds</span>}
                      </div>
                      {m.reasoning && <p className="text-sm text-neutral-600 mt-2">{m.reasoning}</p>}

                      {s.included && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <input
                            value={s.confirmedAvailability}
                            onChange={(e) => update(m.homeId, { confirmedAvailability: e.target.value })}
                            placeholder="Confirmed availability (e.g., 2 beds, ready now)"
                            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            value={s.note}
                            onChange={(e) => update(m.homeId, { note: e.target.value })}
                            placeholder="Note to the DP about this home"
                            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">Message to the discharge planner (optional)</label>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="e.g., Here are three strong options with confirmed availability. Two can do a tour this week…"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <button
            onClick={markMatching} disabled={!!saving}
            className="px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving === 'matching' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} Mark as Matching
          </button>
          <button
            onClick={sendShortlist} disabled={!!saving || selectedCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving === 'respond' ? <Loader2 className="h-4 w-4 animate-spin" /> : isReady ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isReady ? 'Re-send updated shortlist' : 'Send shortlist to DP'}
          </button>
        </div>
      </div>
    </div>
  );
}
