"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";

type Credential = {
  id: string;
  type: string;
  documentUrl: string | null;
  issueDate: string;
  expirationDate: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type Detail = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  location: { city: string | null; state: string | null; zipCode: string | null };
  createdAt: string;
  bio: string | null;
  yearsExperience: number | null;
  hourlyRate: string | null;
  specialties: string[];
  settings: string[];
  careTypes: string[];
  isVisibleInMarketplace: null | boolean;
  credentials: Credential[];
  credentialSummary: { credentialCount: number; verifiedCredentialCount: number };
  availabilitySummary: { upcomingSlots7d: number } | null;
};

export default function AdminAideDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const caregiverId = params?.id;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    const role = session?.user?.role as UserRole | undefined;
    const ok = role === UserRole.ADMIN || role === UserRole.STAFF;
    setIsAuthorized(ok);
    if (!ok) router.push("/dashboard");
  }, [session, status, router]);

  // Load detail
  useEffect(() => {
    if (!caregiverId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/caregivers/${caregiverId}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
        const json = (await res.json()) as Detail;
        if (!cancelled) setDetail(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [caregiverId]);

  const toggleVerify = async (cred: Credential, flag: boolean) => {
    try {
      setSaving(cred.id);
      const res = await fetch(`/api/admin/credentials/${cred.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: flag }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to update');
      const j = await res.json();
      const updated = j?.credential as Credential | undefined;
      if (updated && detail) {
        setDetail({
          ...detail,
          credentials: detail.credentials.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          credentialSummary: {
            credentialCount: detail.credentialSummary.credentialCount,
            verifiedCredentialCount: detail.credentials.filter((c) => (c.id === updated.id ? updated.isVerified : c.isVerified)).length,
          },
        });
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="px-4 py-6">
        {loading && <div className="text-neutral-600">Loading…</div>}
        {error && !loading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">{error}</div>
        )}
        {detail && !loading && (
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{detail.name || '—'}</h2>
                  <div className="text-neutral-600">{detail.email}</div>
                  <div className="text-neutral-600">{[detail.location.city, detail.location.state, detail.location.zipCode].filter(Boolean).join(', ') || '—'}</div>
                </div>
                <div className="text-sm text-neutral-600">Created {new Date(detail.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-3 text-neutral-700 whitespace-pre-wrap">{detail.bio || 'No bio provided.'}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2">
                <h3 className="text-lg font-medium mb-3">Credentials</h3>
                <div className="text-sm text-neutral-600 mb-3">Verified {detail.credentialSummary.verifiedCredentialCount}/{detail.credentialSummary.credentialCount}</div>
                <div className="divide-y divide-neutral-200">
                  {detail.credentials.map((cred) => (
                    <div key={cred.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{cred.type}</div>
                        <div className="text-sm text-neutral-600">Issued {new Date(cred.issueDate).toLocaleDateString()} • Expires {new Date(cred.expirationDate).toLocaleDateString()}</div>
                        {cred.documentUrl && (
                          <a href={cred.documentUrl} target="_blank" className="text-sm text-primary-600 hover:text-primary-700">View document</a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${cred.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-700'}`}>
                          {cred.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                        {cred.isVerified ? (
                          <button disabled={saving === cred.id} onClick={() => toggleVerify(cred, false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50">Unverify</button>
                        ) : (
                          <button disabled={saving === cred.id} onClick={() => toggleVerify(cred, true)} className="rounded-md bg-primary-600 text-white px-3 py-1.5 text-sm hover:bg-primary-700 disabled:opacity-50">Verify</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {detail.credentials.length === 0 && (
                    <div className="text-sm text-neutral-600">No credentials uploaded.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h3 className="text-lg font-medium mb-3">Profile</h3>
                <div className="space-y-2 text-sm text-neutral-700">
                  <div><span className="text-neutral-500">Years experience:</span> {detail.yearsExperience ?? '—'}</div>
                  <div><span className="text-neutral-500">Hourly rate:</span> {detail.hourlyRate ?? '—'}</div>
                  <div><span className="text-neutral-500">Specialties:</span> {detail.specialties?.length ? detail.specialties.join(', ') : '—'}</div>
                  <div><span className="text-neutral-500">Settings:</span> {detail.settings?.length ? detail.settings.join(', ') : '—'}</div>
                  <div><span className="text-neutral-500">Care Types:</span> {detail.careTypes?.length ? detail.careTypes.join(', ') : '—'}</div>
                  {detail.availabilitySummary && (
                    <div><span className="text-neutral-500">Upcoming availability (7d):</span> {detail.availabilitySummary.upcomingSlots7d}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
