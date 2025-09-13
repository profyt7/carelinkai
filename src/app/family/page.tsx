'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentUploadModal from '@/components/family/DocumentUploadModal';
import dynamic from 'next/dynamic';
import {
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiMessageSquare,
  FiImage,
  FiUsers,
  FiUserPlus,
  FiUserCheck,
  FiFolder,
} from 'react-icons/fi';
import Link from 'next/link';

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
  const [isDragging, setIsDragging] = useState(false);
  // Prefill dropped files into upload modal
  const [prefillFiles, setPrefillFiles] = useState<File[]>([]);
  const [role, setRole] = useState<string|undefined>();
  /* Unread messages */
  const [unreadCount, setUnreadCount] = useState<number>(0);
  /* Current user id for SSE subscriptions */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isGuest = role === 'GUEST';

  /* ------------------------------------------------------------------
     Router and URL state
  ------------------------------------------------------------------*/
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ------------------------------------------------------------------
     Portal tabs
  ------------------------------------------------------------------*/
  type TabKey = 'documents' | 'timeline' | 'messages' | 'billing' | 'emergency';
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam as TabKey) || 'documents';
  });

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/family?tab=${tab}`);
  };

  /* ------------------------------------------------------------------
     Timeline state
  ------------------------------------------------------------------*/
  type Activity = {
    id: string;
    description: string;
    type: string;
    resourceType?: string;
    createdAt: string;
    actor?: {
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: { thumbnail?: string } | null;
    };
  };
  const [activities, setActivities] = useState<Activity[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  /* ------------------------------------------------------------------
     Timeline filter helpers
  ------------------------------------------------------------------*/
  type ActivityFilter = 'ALL' | 'DOCUMENTS' | 'NOTES' | 'MEDIA' | 'MEMBERS';
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');

  const isTypeInFilter = (t: string, f: ActivityFilter) => {
    if (f === 'ALL') return true;
    const docTypes = [
      'DOCUMENT_UPLOADED',
      'DOCUMENT_UPDATED',
      'DOCUMENT_DELETED',
      'DOCUMENT_COMMENTED',
    ];
    const noteTypes = ['NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_COMMENTED'];
    const mediaTypes = ['GALLERY_CREATED', 'GALLERY_UPDATED', 'PHOTO_UPLOADED'];
    const memberTypes = ['MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_ROLE_CHANGED'];
    const maps: Record<ActivityFilter, string[]> = {
      DOCUMENTS: docTypes,
      NOTES: noteTypes,
      MEDIA: mediaTypes,
      MEMBERS: memberTypes,
      ALL: [],
    };
    return maps[f].includes(t);
  };

  const iconForType = (t: string) => {
    if (t.startsWith('DOCUMENT')) return <FiFileText />;
    if (t.startsWith('NOTE_') && !t.includes('COMMENT')) return <FiEdit2 />;
    if (t.endsWith('COMMENTED')) return <FiMessageSquare />;
    if (t.startsWith('GALLERY') || t === 'PHOTO_UPLOADED') return <FiImage />;
    if (t === 'MEMBER_INVITED') return <FiUserPlus />;
    if (t === 'MEMBER_JOINED') return <FiUserCheck />;
    if (t === 'MEMBER_ROLE_CHANGED') return <FiUsers />;
    return <FiFolder />;
  };

  // Memoised list of activities that match the current filter
  const filteredActivities = useMemo(
    () => activities.filter((a) => isTypeInFilter(a.type, activityFilter)),
    [activities, activityFilter]
  );

  const FAMILY_ID = 'cmdhjmp2x0000765nc52usnp7';

  /* ------------------------------------------------------------------
     Billing state
  ------------------------------------------------------------------*/
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Check if Stripe is configured
  const isStripeConfigured =
    typeof process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] === 'string' &&
    process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'].length > 0;

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

  // Helper to group activities by date
  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      // Ensure the split result is treated as a definite string for object indexing
      const date = new Date(activity.createdAt)
        .toISOString()
        .split('T')[0] as string;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  /* ------------------------------------------------------------------
     Fetch membership role
  ------------------------------------------------------------------*/
  useEffect(() => {
    const fetchMembership = async () => {
      try {
        const res = await fetch(`/api/family/membership?familyId=${FAMILY_ID}`);
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        }
      } catch (err) {
        console.error('Failed to fetch membership role:', err);
      }
    };
    fetchMembership();
  }, []);

  /* ------------------------------------------------------------------
     Fetch documents
  ------------------------------------------------------------------*/

  /* ------------------------------------------------------------------
     Unread messages polling
  ------------------------------------------------------------------*/

  /* ------------------------------------------------------------------
     Fetch current user id for SSE (once on mount)
  ------------------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const json = await res.json();
          const id = json?.data?.user?.id;
          if (id) setCurrentUserId(id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(Number(json.count || 0));
        }
      } catch {
        /* ignore */
      }
    };
    fetchUnread();
    timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  // Refresh unread count when switching to Messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      (async () => {
        try {
          const res = await fetch('/api/messages/unread');
          if (res.ok) {
            const json = await res.json();
            setUnreadCount(Number(json.count || 0));
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [activeTab]);

  /* ------------------------------------------------------------------
     Fetch documents
  ------------------------------------------------------------------*/

  /* ------------------------------------------------------------------
     SSE subscription for unread message updates
  ------------------------------------------------------------------*/
  useEffect(() => {
    if (!currentUserId) return;

    const refreshUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(Number(json.count || 0));
        }
      } catch {
        /* ignore */
      }
    };

    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`notifications:${currentUserId}`)}`
    );
    es.addEventListener('message:created', refreshUnread as EventListener);
    es.addEventListener('message:read', refreshUnread as EventListener);

    // initial refresh to ensure up-to-date
    refreshUnread();

    return () => {
      es.close();
    };
  }, [currentUserId]);
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
  }, [search, docType, activeTab]);

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
        setTransactions(json.transactions ?? []);
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
     Drag and drop handling
  ------------------------------------------------------------------*/

  // Validation constants reused from modal
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/zip',
    'application/x-zip-compressed',
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isGuest) {
      alert("Guests cannot upload documents. Please contact a family administrator.");
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      const invalids: string[] = [];
      const valid = files.filter((file) => {
        if (file.size > MAX_FILE_SIZE || !ALLOWED_FILE_TYPES.includes(file.type)) {
          invalids.push(file.name);
          return false;
        }
        return true;
      });

      if (invalids.length) {
        alert(
          `Some files were skipped due to size/type restrictions: ${invalids.join(', ')}`
        );
      }

      if (valid.length === 0) return;

      // Open modal with the valid files pre-selected for upload
      setPrefillFiles(valid);
      setIsUploadOpen(true);
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
                Stay connected with your loved one&apos;s care.
              </p>
            </div>
            {activeTab === 'documents' && !isGuest && (
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
        <div className="sticky top-0 bg-white/70 backdrop-blur z-10 pb-2 border-b" role="tablist">
          <div className="flex flex-wrap gap-3">
            {(['documents', 'timeline', 'messages', 'billing', 'emergency'] as TabKey[]).map(
              (tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => handleTabChange(tab)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    activeTab === tab
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'messages' && unreadCount > 0 && (
                      <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                </button>
              )
            )}
          </div>
        </div>

        {/* Timeline filters */}
        {activeTab === 'timeline' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {(['ALL', 'DOCUMENTS', 'NOTES', 'MEDIA', 'MEMBERS'] as ActivityFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  activityFilter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

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
        {activeTab === 'documents' && (
          <>
            {/* Dropzone area */}
            {!isGuest && (
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center mb-6 transition-colors ${
                  isDragging 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p className="text-gray-600">
                  Drag and drop files here to upload
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click the Upload Documents button above
                </p>
              </div>
            )}
            
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col rounded-md border bg-white p-4 shadow-sm animate-pulse">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-1/4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-2 w-1/2 bg-gray-200 rounded mb-1"></div>
                    <div className="h-2 w-1/3 bg-gray-200 rounded mb-3"></div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-2 w-10 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center">
                      <div className="mr-2 h-7 w-7 rounded-full bg-gray-200"></div>
                      <div className="h-2 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            ) : docs.length === 0 ? (
              <div className="py-20 text-center text-gray-500">No documents found</div>
            ) : (
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
            )}
          </>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            {timelineLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-md border bg-white p-4 shadow-sm animate-pulse">
                    <div className="h-3 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : timelineError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                {timelineError}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                No activity yet
              </div>
            ) : (
              <div className="space-y-6">
                {groupActivitiesByDate(filteredActivities).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      {new Date(date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <ul className="space-y-3">
                      {items.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                              {React.cloneElement(iconForType(a.type) as any, {
                                className: 'h-4 w-4',
                              })}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm text-gray-800">
                                {a.description}
                              </div>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
                                  {`${a.actor?.firstName?.[0] ?? ''}${
                                    a.actor?.lastName?.[0] ?? ''
                                  }`}
                                </span>
                                <span>
                                  {a.actor
                                    ? `${a.actor.firstName ?? ''} ${
                                        a.actor.lastName ?? ''
                                      }`
                                    : '—'}{' '}
                                  • {new Date(a.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-full max-w-md bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
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

                <div>
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
                      disabled={depositAmount <= 0 || isGuest}
                      onClick={createDeposit}
                      className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Deposit
                    </button>
                  </div>
                  
                  {/* Amount presets */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDepositAmount(amount)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          depositAmount === amount 
                            ? 'bg-primary-100 text-primary-800 border border-primary-300' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  
                  {/* Stripe configuration notice */}
                  {!isStripeConfigured && (
                    <div className="mt-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
                      Test mode - no real charges will be made.
                    </div>
                  )}
                  
                  {isGuest && (
                    <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600 border border-gray-200">
                      Guests cannot make deposits. Please contact a family administrator.
                    </div>
                  )}
                </div>

                {/* Wallet transactions */}
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    Recent Wallet Transactions
                  </h4>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500">No transactions yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {transactions.slice(0, 5).map((tx: any) => (
                        <li key={tx.id} className="py-2 text-sm flex justify-between">
                          <div>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              tx.type === 'DEPOSIT' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {tx.type}
                            </span>
                            <span className="ml-2 text-gray-600">
                              {new Intl.DateTimeFormat('en-US').format(new Date(tx.createdAt))}
                            </span>
                          </div>
                          <span className={tx.type === 'DEPOSIT' ? 'text-green-600' : ''}>
                            {tx.type === 'DEPOSIT' ? '+' : ''}
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: tx.currency || 'USD',
                            }).format(Number(tx.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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
              Set up your emergency contact list and notification preferences.
            </div>
            <Link
              href="/family/emergency"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Configure Preferences
            </Link>
            
            {isGuest && (
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600 border border-gray-200">
                Note: As a guest, you can view but not modify emergency preferences.
              </div>
            )}
          </div>
        )}
      </div>
      {/* Upload modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setPrefillFiles([]);
        }}
        onUpload={handleUpload}
        familyId={FAMILY_ID}
        initialFiles={prefillFiles}
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
