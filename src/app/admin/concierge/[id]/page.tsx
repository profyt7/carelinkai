'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Send, CheckCircle, Star, MapPin, Bed, User, ClipboardList, Clock,
} from 'lucide-react';
import { PayerLaneRow } from '@/components/admin/PayerLaneBadge';
import ConciergeOrderPanel, { type ConciergeOrderRow } from '@/components/admin/ConciergeOrderPanel';

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
  availability?: { fresh?: boolean; label?: string };
};

type AvailabilityLabel = 'verified' | 'unconfirmed';
/** One shortlisted home, in the admin's order (fix/concierge-manual-shortlist). */
type Pick = { homeId: string; homeName: string; address: string; note: string; confirmedAvailability: string; availabilityLabel: AvailabilityLabel };
type SearchHit = { homeId: string; homeName: string; address: string; availability: string; defaultAvailabilityLabel: AvailabilityLabel };

type PatientInfo = {
  patientName?: string;
  patientAge?: string;
  medicalNeeds?: string;
  timeline?: string;
  paymentType?: string;
  additionalNotes?: string;
  preferredHomeId?: string;
  preferredHomeName?: string;
  // Family concierge page (W4 0a)
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
};

type Detail = {
  id: string;
  queryText: string;
  parsedCriteria: any;
  searchResults: { matches?: Match[]; suggestedNear?: string } | null;
  intakeZip?: string | null;
  patientInfo: PatientInfo | null;
  payerSource?: string | null;
  conciergeStatus: string | null;
  curatedHomes: { homeId: string; name?: string; address?: string; note?: string; confirmedAvailability?: string; availabilityLabel?: AvailabilityLabel; tourStatus?: 'REQUESTED'; tourRequestedAt?: string }[] | null;
  conciergeNote: string | null;
  conciergeSubmittedAt: string | null;
  conciergeRespondedAt: string | null;
  facilityResponses?: FacilityResponse[];
  source?: string | null;
  conciergeOrders?: ConciergeOrderRow[];
  user: {
    firstName: string | null; lastName: string | null; email: string | null; phone: string | null;
    dischargePlannerProfile: { organization: string | null; title: string | null } | null;
  } | null;
};

type FacilityResponse = {
  id: string;
  homeId: string;
  status: 'PENDING' | 'SENT' | 'OPENED' | 'ACCEPTED' | 'DECLINED' | 'ADMITTED';
  contactEmail: string | null;
  delivery: string | null;
  summary: { careLevel?: string; payerLane?: string; timeline?: string } | null;
  sentAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  admittedAt: string | null;
  declineReason: string | null;
  declineText: string | null;
};

const RESPONSE_CLS: Record<FacilityResponse['status'], string> = {
  PENDING: 'bg-neutral-100 text-neutral-600',
  SENT: 'bg-primary-50 text-primary-700',
  OPENED: 'bg-primary-50 text-primary-700',
  ACCEPTED: 'bg-success-100 text-success-800',
  DECLINED: 'bg-error-50 text-error-700',
  ADMITTED: 'bg-success-600 text-white',
};
const DECLINE_LABEL: Record<string, string> = {
  NO_BED: 'No bed available',
  ACUITY_TWO_PERSON_ASSIST: 'Acuity — two-person assist',
  ACUITY_WANDERING: 'Acuity — wandering',
  ACUITY_OXYGEN: 'Acuity — oxygen',
  ACUITY_INSULIN: 'Acuity — insulin',
  ACUITY_BARIATRIC: 'Acuity — bariatric',
  ACUITY_BEHAVIORAL: 'Acuity — behavioral',
  ACUITY_HOSPICE: 'Acuity — hospice',
  PAYER_NOT_ACCEPTED: 'Payer not accepted',
  MEDICAID_PENDING_NOT_ACCEPTED: 'Medicaid-pending not accepted',
  OUTSIDE_AREA: 'Outside service area',
  OTHER: 'Other',
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');


export default function AdminConciergeCuratePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [paymentLinkConfigured, setPaymentLinkConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      const d: Detail = data.request;
      setDetail(d);
      setPaymentLinkConfigured(data.paymentLinkConfigured === true);
      setNote(d.conciergeNote ?? '');
      // Seed the shortlist from a prior save, in its saved order (homes added by hand included).
      const byId = new Map((d.searchResults?.matches ?? []).map((m) => [m.homeId, m]));
      setPicks((d.curatedHomes ?? []).map((c) => ({
        homeId: c.homeId,
        homeName: c.name ?? byId.get(c.homeId)?.homeName ?? c.homeId,
        address: c.address ?? byId.get(c.homeId)?.address ?? '',
        note: c.note ?? '',
        confirmedAvailability: c.confirmedAvailability ?? '',
        availabilityLabel: c.availabilityLabel ?? (c.confirmedAvailability ? 'verified' : 'unconfirmed'),
      })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const update = (homeId: string, patch: Partial<Pick>) =>
    setPicks((prev) => prev.map((p) => (p.homeId === homeId ? { ...p, ...patch } : p)));
  const addPick = (p: Omit<Pick, 'note' | 'confirmedAvailability'>) =>
    setPicks((prev) => (prev.some((x) => x.homeId === p.homeId) ? prev : [...prev, { ...p, note: '', confirmedAvailability: '' }]));
  const removePick = (homeId: string) => setPicks((prev) => prev.filter((p) => p.homeId !== homeId));
  const move = (homeId: string, dir: -1 | 1) =>
    setPicks((prev) => {
      const i = prev.findIndex((p) => p.homeId === homeId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  // "Add a home": public homes by name, city or ZIP (top 10).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/concierge/homes?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setHits(Array.isArray(data?.homes) ? data.homes : []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const suggest = async () => {
    setSaving('suggest');
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed');
      toast.success(data.count > 0 ? `${data.count} homes suggested near ${data.near}` : `No public homes found near ${data.near} — add one by hand`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSaving(null);
    }
  };

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

  // W4-2: admin confirms the move-in after a facility accepted.
  const markAdmitted = async (homeId: string) => {
    setSaving(`admitted:${homeId}`);
    try {
      const res = await fetch(`/api/admin/concierge/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admitted', homeId }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
      toast.success('Marked as admitted');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const sendShortlist = async () => {
    const curatedHomes = picks.map((p) => ({ homeId: p.homeId, note: p.note, confirmedAvailability: p.confirmedAvailability, availabilityLabel: p.availabilityLabel }));
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
      // A family request stays here: next step is the payment link (pay when ready). A DP request is done.
      if (detail?.source === 'concierge_page') {
        toast.success('Shortlist saved — now send the payment link');
        load();
      } else {
        toast.success('Shortlist sent to the discharge planner');
        router.push('/admin/concierge');
      }
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
  const selectedCount = picks.length;
  const picked = new Set(picks.map((x) => x.homeId));
  const near = detail.intakeZip || p.location || 'the request area';
  const matchLabel = (m: Match): AvailabilityLabel => (m.availability?.fresh ? 'verified' : 'unconfirmed');
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
            {/* Family concierge page (W4 0a): the family's contact lives here, not on a user. */}
            {p.contactName && <div><span className="font-medium">Family contact:</span> {p.contactName}{p.contactEmail ? ` · ${p.contactEmail}` : ''}{p.contactPhone ? ` · ${p.contactPhone}` : ''}</div>}
            {p.location && <div><span className="font-medium">Search near:</span> {p.location}</div>}
            {p.timeline && <div><span className="font-medium">Timeline:</span> {p.timeline}</div>}
            {p.paymentType && <div><span className="font-medium">Payment:</span> {p.paymentType}</div>}
            {/* Payer-source screener (OL-114) — read-only tag + derived fee lane. */}
            <PayerLaneRow payerSource={detail.payerSource} />
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

      {/* Pay when ready (10/31): the family's order — payment link, mark paid, release shortlist. */}
      {(detail.conciergeOrders ?? []).slice(0, 1).map((o) => (
        <ConciergeOrderPanel key={o.id} order={o} shortlistReady={isReady && (detail.curatedHomes?.length ?? 0) > 0} paymentLinkConfigured={paymentLinkConfigured} onChanged={load} />
      ))}

      {/* W4-2: facility accept / decline per shortlisted home */}
      {(detail.facilityResponses?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl shadow p-5" data-testid="facility-responses">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">Facility responses</h2>
          <p className="text-xs text-neutral-500 mb-3">
            Each shortlisted home got a one-tap accept / decline link (care level, payer lane and timeline only — no patient details). Decline reasons roll up to the home&apos;s observed acceptance criteria.
          </p>
          <ul className="divide-y divide-neutral-100">
            {(detail.facilityResponses ?? []).map((fr) => {
              const name = matches.find((m) => m.homeId === fr.homeId)?.homeName ?? detail.curatedHomes?.find((c) => c.homeId === fr.homeId)?.name ?? fr.homeId;
              return (
                <li key={fr.id} className="py-3 flex flex-wrap items-start justify-between gap-3" data-testid="facility-response-row" data-home-id={fr.homeId} data-status={fr.status}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900">{name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESPONSE_CLS[fr.status]}`}>{fr.status.toLowerCase()}</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {fr.contactEmail ?? 'no contact'} · {fr.delivery ?? ''} · sent {fmt(fr.sentAt)} · opened {fmt(fr.openedAt)} · responded {fmt(fr.respondedAt)}{fr.admittedAt ? ` · admitted ${fmt(fr.admittedAt)}` : ''}
                    </div>
                    {fr.status === 'DECLINED' && (
                      <div className="text-sm text-error-700 mt-1" data-testid="admin-decline-reason">
                        {fr.declineReason ? DECLINE_LABEL[fr.declineReason] ?? fr.declineReason : 'No reason'}{fr.declineText ? ` — “${fr.declineText}”` : ''}
                      </div>
                    )}
                  </div>
                  {fr.status === 'ACCEPTED' && (
                    <button
                      onClick={() => markAdmitted(fr.homeId)}
                      disabled={!!saving}
                      className="px-3 py-1.5 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 disabled:opacity-50"
                      data-testid="mark-admitted"
                    >
                      {saving === `admitted:${fr.homeId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm admitted'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Curate */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Curate the shortlist</h2>
          <span className="text-sm text-neutral-500">{selectedCount} selected</span>
        </div>

        {/* Shortlist, in the order the family will see it */}
        <div data-testid="curate-shortlist">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2">Shortlist {detail.source === 'concierge_page' ? '(hidden from the family until paid and released)' : ''}</h3>
          {picks.length === 0 ? (
            <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 p-3" data-testid="curate-shortlist-empty">No homes yet. Pick from the candidates below or add a home by name, city or ZIP.</p>
          ) : (
            <ol className="space-y-3">
              {picks.map((pk, i) => (
                <li key={pk.homeId} className="border border-primary-300 bg-primary-50/40 rounded-xl p-4" data-testid="curate-pick" data-home-id={pk.homeId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-900">{i + 1}. {pk.homeName}</span>
                        {tourRequestedHomeIds.has(pk.homeId) && <span className="inline-flex items-center gap-1 bg-success-100 text-success-800 px-2 py-0.5 rounded-full text-xs font-medium">🗓️ Tour requested</span>}
                        <Link href={`/homes/${pk.homeId}`} target="_blank" className="text-xs text-primary-600 underline">view</Link>
                      </div>
                      {pk.address && <div className="text-xs text-neutral-500 mt-0.5 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {pk.address}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => move(pk.homeId, -1)} disabled={i === 0} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40" aria-label={`Move ${pk.homeName} up`} data-testid="curate-pick-up">↑</button>
                      <button type="button" onClick={() => move(pk.homeId, 1)} disabled={i === picks.length - 1} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40" aria-label={`Move ${pk.homeName} down`} data-testid="curate-pick-down">↓</button>
                      <button type="button" onClick={() => removePick(pk.homeId)} className="rounded border border-error-300 px-2 py-1 text-xs text-error-700" aria-label={`Remove ${pk.homeName}`} data-testid="curate-pick-remove">Remove</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <label className="text-xs text-neutral-600">
                      Openings shown to the family
                      <select
                        value={pk.availabilityLabel}
                        onChange={(e) => update(pk.homeId, { availabilityLabel: e.target.value as AvailabilityLabel })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        data-testid="curate-pick-availability"
                      >
                        <option value="unconfirmed">Openings unconfirmed — ask the home</option>
                        <option value="verified">Openings verified by our team</option>
                      </select>
                    </label>
                    <input
                      value={pk.confirmedAvailability}
                      onChange={(e) => update(pk.homeId, { confirmedAvailability: e.target.value })}
                      placeholder="Openings details (e.g., 2 beds, ready now)"
                      className="sm:mt-5 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      value={pk.note}
                      onChange={(e) => update(pk.homeId, { note: e.target.value })}
                      placeholder={detail.source === 'concierge_page' ? 'Note to the family about this home' : 'Note to the DP about this home'}
                      className="sm:mt-5 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Add a home: any public listing, by name, city or ZIP */}
        <div className="mt-5" data-testid="curate-add-home">
          <label htmlFor="curate-search" className="block text-sm font-semibold text-neutral-700 mb-2">Add a home</label>
          <input
            id="curate-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search public homes by name, city or ZIP"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            data-testid="curate-search"
          />
          {searching && <p className="mt-1 text-xs text-neutral-500">Searching…</p>}
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200" data-testid="curate-search-results">
              {hits.map((h) => (
                <li key={h.homeId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{h.homeName}</p>
                    <p className="text-xs text-neutral-500">{h.address} · {h.availability}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPick({ homeId: h.homeId, homeName: h.homeName, address: h.address, availabilityLabel: h.defaultAvailabilityLabel })}
                    disabled={picked.has(h.homeId)}
                    className="shrink-0 rounded-lg border border-primary-600 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-40"
                    data-testid="curate-search-add"
                  >
                    {picked.has(h.homeId) ? 'Added' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && !searching && hits.length === 0 && <p className="mt-1 text-xs text-neutral-500">No public homes match.</p>}
        </div>

        {/* Candidates: stored matches, or run the matching on demand */}
        <div className="mt-6" data-testid="curate-candidates">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2">Candidates</h3>
          {matches.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-neutral-500">No candidate matches are stored for this request.</p>
              <button type="button" onClick={suggest} disabled={!!saving} className="px-3 py-2 rounded-lg border border-primary-600 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 inline-flex items-center gap-2" data-testid="curate-suggest">
                {saving === 'suggest' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />} Suggest homes near {near}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => {
                const on = picked.has(m.homeId);
                return (
                  <div key={m.homeId} className={`border rounded-xl p-4 transition-colors ${on ? 'border-primary-300 bg-primary-50/40' : 'border-neutral-200'}`} data-testid="curate-candidate">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox" checked={on}
                        onChange={(e) => (e.target.checked ? addPick({ homeId: m.homeId, homeName: m.homeName, address: m.address ?? '', availabilityLabel: matchLabel(m) }) : removePick(m.homeId))}
                        className="mt-1.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Shortlist ${m.homeName}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-900">{m.homeName}</span>
                          {typeof m.score === 'number' && (
                            <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium"><Star className="h-3 w-3 fill-current" /> {m.score}</span>
                          )}
                          <Link href={`/homes/${m.homeId}`} target="_blank" className="text-xs text-primary-600 underline">view</Link>
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-3 mt-0.5 flex-wrap">
                          {m.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.address}</span>}
                          {typeof m.availableBeds === 'number' && <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" /> {m.availableBeds} beds</span>}
                          {m.availability?.label && <span>{m.availability.label}</span>}
                        </div>
                        {m.reasoning && <p className="text-sm text-neutral-600 mt-2">{m.reasoning}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">{detail.source === 'concierge_page' ? 'Message to the family — shown with their shortlist once paid and released (optional)' : 'Message to the discharge planner (optional)'}</label>
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
            {detail.source === 'concierge_page' ? (isReady ? 'Update saved shortlist' : 'Save shortlist') : isReady ? 'Re-send updated shortlist' : 'Send shortlist to DP'}
          </button>
        </div>
      </div>
    </div>
  );
}
