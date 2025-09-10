'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentUploadModal from '@/components/family/DocumentUploadModal';
import dynamic from 'next/dynamic';

export default function FamilyPage() {
  /* ------------------------------------------------------------------
     Local state
  ------------------------------------------------------------------*/
  type Doc = {
    id: string;
    title: string;
    type: string;
    fileSize: number;
    createdAt: string;
    tags: string[];
    uploader: {
      firstName?: string | null;
      lastName?: string | null;
    };
  };

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  /* ------------------------------------------------------------------
     Portal tabs
  ------------------------------------------------------------------*/
  type TabKey = 'documents' | 'timeline' | 'messages' | 'billing' | 'emergency';
  const [activeTab, setActiveTab] = useState<TabKey>('documents');

  /* ------------------------------------------------------------------
     Timeline state
  ------------------------------------------------------------------*/
  type Activity = {
    id: string;
    description: string;
    createdAt: string;
    actor?: { firstName?: string | null; lastName?: string | null };
  };
  const [activities, setActivities] = useState<Activity[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const FAMILY_ID = 'cmdhjmp2x0000765nc52usnp7';

  /* ------------------------------------------------------------------
     Billing state
  ------------------------------------------------------------------*/
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Load DepositModal dynamically so Stripe is only imported when needed
  const DepositModal = dynamic(
    () => import('@/components/billing/DepositModal'),
    { ssr: false },
  );

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------*/
  const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  /* ------------------------------------------------------------------
     Fetch documents
  ------------------------------------------------------------------*/
  useEffect(() => {
    const controller = new AbortController();
    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          familyId: FAMILY_ID,
          limit: '12',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (search) params.set('search', search);
        if (docType) params.append('type', docType);

        const res = await fetch(`/api/family/documents?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load documents');
        const json = await res.json();
        setDocs(json.documents ?? []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when Documents tab is active
    if (activeTab === 'documents') {
      fetchDocs();
      return () => controller.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => controller.abort();
  }, [search, docType]);

  /* ------------------------------------------------------------------
     Real-time updates via SSE
  ------------------------------------------------------------------*/
  useEffect(() => {
    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${FAMILY_ID}`)}`
    );

    const parseData = (e: MessageEvent<any>) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('document:created', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.document) {
        setDocs((prev) => [data.document, ...prev]);
      }
    });

    es.addEventListener('document:updated', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.document) {
        setDocs((prev) =>
          prev.map((d) => (d.id === data.document.id ? data.document : d))
        );
      }
    });

    es.addEventListener('document:deleted', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.documentId) {
        setDocs((prev) => prev.filter((d) => d.id !== data.documentId));
      }
    });

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
     Timeline fetch + SSE
  ------------------------------------------------------------------*/
  useEffect(() => {
    if (activeTab !== 'timeline') return;

    const controller = new AbortController();
    const load = async () => {
      try {
        setTimelineLoading(true);
        const res = await fetch(
          `/api/family/activity?familyId=${FAMILY_ID}&limit=50`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed to load activity');
        const json = await res.json();
        setActivities(json.items ?? []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setTimelineError(err.message ?? 'Error');
        }
      } finally {
        setTimelineLoading(false);
      }
    };
    load();

    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${FAMILY_ID}`)}`
    );
    es.addEventListener('activity:created', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data?.activity) {
          setActivities((prev) => [data.activity, ...prev]);
        }
      } catch {
        /* ignore */
      }
    });

    return () => {
      controller.abort();
      es.close();
    };
  }, [activeTab]);

  /* ------------------------------------------------------------------
     Fetch wallet & payments
  ------------------------------------------------------------------*/
  const loadBilling = async () => {
    try {
      setBillingLoading(true);
      const [walletRes, payRes] = await Promise.all([
        fetch(`/api/billing/wallet?familyId=${FAMILY_ID}`),
        fetch(`/api/billing/payments?familyId=${FAMILY_ID}`),
      ]);
      if (walletRes.ok) {
        const json = await walletRes.json();
        setWalletBalance(Number(json.wallet?.balance ?? 0));
      }
      if (payRes.ok) {
        const json = await payRes.json();
        setPayments(json.payments ?? []);
      }
    } catch {
      /* ignore for now */
    } finally {
      setBillingLoading(false);
    }
  };

  // Trigger load when billing tab active
  useEffect(() => {
    if (activeTab === 'billing') {
      loadBilling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ------------------------------------------------------------------
     Deposit flow
  ------------------------------------------------------------------*/
  const createDeposit = async () => {
    if (depositAmount <= 0) return;
    try {
      const res = await fetch('/api/billing/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(depositAmount * 100),
          familyId: FAMILY_ID,
        }),
      });
      if (!res.ok) throw new Error('Failed to initiate deposit');
      const json = await res.json();
      setClientSecret(json.clientSecret ?? null);
      setDepositOpen(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Unable to create deposit. Please try again.');
    }
  };

  /* ------------------------------------------------------------------
     Upload handler passed to modal
  ------------------------------------------------------------------*/
  interface UploadDocument {
    familyId: string;
    title: string;
    description?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    file: File;
    type: string;
    isEncrypted: boolean;
    tags: string[];
  }

  const handleUpload = async (items: UploadDocument[]) => {
    for (const item of items) {
      const form = new FormData();
      form.append('familyId', item.familyId);
      form.append('title', item.title);
      form.append('description', item.description ?? '');
      form.append('type', item.type);
      form.append('isEncrypted', item.isEncrypted ? 'true' : 'false');
      form.append('tags', JSON.stringify(item.tags));
      form.append('file', item.file);

      const res = await fetch('/api/family/documents', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const json = await res.json();
      if (json.document) {
        setDocs((prev) => [json.document, ...prev]);
      }
    }
  };

  /* ------------------------------------------------------------------
     Render
  ------------------------------------------------------------------*/
  return (
    <DashboardLayout title="Family Portal">
      <div className="space-y-6">
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Family Portal</h1>
              <p className="mt-1 text-primary-100">
                Stay connected with your loved one's care.
              </p>
            </div>
            {activeTab === 'documents' && (
              <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30"
            >
              Upload Documents
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-3">
          {(['documents', 'timeline', 'messages', 'billing', 'emergency'] as TabKey[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Filters */}
        {activeTab === 'documents' && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 md:max-w-xs"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 md:max-w-xs"
          >
            <option value="">All Types</option>
            {['CARE_PLAN','MEDICAL_RECORD','LEGAL_DOCUMENT','INSURANCE_DOCUMENT','PHOTO','VIDEO','PERSONAL_DOCUMENT','OTHER'].map(
              (t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              )
            )}
          </select>
        </div>
        )}

        {/* Content */}
        {activeTab === 'documents' && loading ? (
          <div className="py-20 text-center text-gray-500">Loading documents…</div>
        ) : activeTab === 'documents' && error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : activeTab === 'documents' && docs.length === 0 ? (
          <div className="py-20 text-center text-gray-500">No documents found</div>
        ) : activeTab === 'documents' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col rounded-md border bg-white p-4 shadow-sm"
              >
                {/* title */}
                <h3 className="mb-1 line-clamp-2 font-medium text-gray-900">
                  {doc.title}
                </h3>
                {/* type badge */}
                <span className="mb-2 inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                  {doc.type.replace(/_/g, ' ')}
                </span>
                {/* meta */}
                <div className="mb-2 text-xs text-gray-500">
                  {new Date(doc.createdAt).toLocaleDateString()} •{' '}
                  {formatBytes(doc.fileSize)}
                </div>
                {/* tags */}
                <div className="mb-3 flex flex-wrap gap-1">
                  {doc.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {/* uploader initials */}
                <div className="mt-auto flex items-center">
                  <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                    {`${doc.uploader.firstName?.[0] ?? ''}${doc.uploader.lastName?.[0] ?? ''}`}
                  </div>
                  <span className="text-xs text-gray-600">
                    {doc.uploader.firstName} {doc.uploader.lastName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            {timelineLoading ? (
              <div className="py-20 text-center text-gray-500">
                Loading timeline…
              </div>
            ) : timelineError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                {timelineError}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                No activity yet
              </div>
            ) : (
              <ul className="space-y-4">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border bg-white p-4 shadow-sm"
                  >
                    <div className="text-sm text-gray-800">{a.description}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {a.actor
                        ? `${a.actor.firstName ?? ''} ${a.actor.lastName ?? ''} • `
                        : ''}
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4 rounded-md border bg-white p-6 shadow-sm">
            <p className="text-gray-700">
              View and send secure messages with caregivers and operators.
            </p>
            <a
              href="/messages"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Open Messages
            </a>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6 rounded-md border bg-white p-6 shadow-sm">
            {billingLoading ? (
              <div className="text-center text-gray-500">Loading…</div>
            ) : (
              <>
                <div className="text-2xl font-semibold text-gray-800">
                  Balance:{' '}
                  {walletBalance !== null ? (
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(Number(walletBalance))
                  ) : (
                    <span className="animate-pulse text-gray-500">$—.—</span>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount (USD)
                    </label>
                    <input
                      id="amount"
                      type="number"
                      min={1}
                      step={1}
                      value={depositAmount}
                      onChange={(e) =>
                        setDepositAmount(Number(e.target.value))
                      }
                      className="mt-1 w-36 rounded-md border-gray-300 px-3 py-2"
                    />
                  </div>
                  <button
                    disabled={depositAmount <= 0}
                    onClick={createDeposit}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Deposit
                  </button>
                </div>

                {/* Payment history */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    Recent Payments
                  </h4>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-500">No payments yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {payments.map((p: any) => (
                        <li key={p.id} className="py-2 text-sm">
                          {new Intl.DateTimeFormat('en-US').format(
                            new Date(p.createdAt)
                          )}{' '}
                          —{' '}
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(Number(p.amount))}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Emergency Tab */}
        {activeTab === 'emergency' && (
          <div className="space-y-4 rounded-md border bg-white p-6 shadow-sm">
            <p className="text-gray-700">
              Configure who we contact in case of emergencies.
            </p>
            <div className="rounded-md border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              Escalation chain configuration coming soon.
            </div>
            <a
              href="/family/emergency"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Configure Preferences
            </a>
          </div>
        )}
      </div>
      {/* Upload modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        familyId={FAMILY_ID}
      />
      {/* Deposit modal */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        clientSecret={clientSecret}
        amountCents={Math.round(depositAmount * 100)}
        onSuccess={() => {
          setDepositOpen(false);
          setClientSecret(null);
          setDepositAmount(0);
          loadBilling();
        }}
      />
    </DashboardLayout>
  );
}