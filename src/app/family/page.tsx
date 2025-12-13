'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentUploadModal from '@/components/family/DocumentUploadModal';
import FamilyHeader from '@/components/family/FamilyHeader';
import TabNavigation from '@/components/family/TabNavigation';
import DocumentsTab from '@/components/family/DocumentsTab';
import TimelineTab from '@/components/family/TimelineTab';
import NotesTab from '@/components/family/NotesTab';
import MessagesTab from '@/components/family/MessagesTab';
import BillingTab from '@/components/family/BillingTab';
import EmergencyTab from '@/components/family/EmergencyTab';
import GalleryTab from '@/components/family/GalleryTab';
import MembersTab from '@/components/family/MembersTab';

type TabKey = 'documents' | 'timeline' | 'messages' | 'billing' | 'emergency' | 'notes' | 'gallery' | 'members';

export default function FamilyPage() {
  /* ------------------------------------------------------------------
     State Management
  ------------------------------------------------------------------*/
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [prefillFiles, setPrefillFiles] = useState<File[]>([]);
  const [role, setRole] = useState<string|undefined>();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const isGuest = role === 'GUEST';

  // Runtime mock toggle
  const [showMock, setShowMock] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/runtime/mocks', { cache: 'no-store', credentials: 'include' as RequestCredentials });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setShowMock(!!j?.show);
      } catch {
        if (!cancelled) setShowMock(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ------------------------------------------------------------------
     Router and URL state
  ------------------------------------------------------------------*/
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ------------------------------------------------------------------
     Portal tabs
  ------------------------------------------------------------------*/
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam as TabKey) || 'documents';
  });

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/family?tab=${tab}`);
  };

  /* ------------------------------------------------------------------
     Fetch membership role & familyId
  ------------------------------------------------------------------*/
  useEffect(() => {
    const fetchMembership = async () => {
      try {
        if (showMock) {
          setRole('ADMIN');
          setFamilyId('demo-family');
          return;
        }
        const res = await fetch(`/api/family/membership`);
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
          setFamilyId(data.familyId);
        }
      } catch (err) {
        console.error('Failed to fetch membership:', err);
      }
    };
    fetchMembership();
  }, [showMock]);

  /* ------------------------------------------------------------------
     Fetch current user id for SSE (once on mount)
  ------------------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      try {
        if (showMock) {
          setCurrentUserId('demo-user');
          setUnreadCount(3);
          return;
        }
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
  }, [showMock]);

  /* ------------------------------------------------------------------
     Unread messages polling
  ------------------------------------------------------------------*/
  useEffect(() => {
    if (showMock) return; // fixed demo count in mock mode
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
  }, [showMock]);

  // Refresh unread count when switching to Messages tab
  useEffect(() => {
    if (showMock) return;
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
  }, [activeTab, showMock]);

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
    }
  };

  /* ------------------------------------------------------------------
     Render
  ------------------------------------------------------------------*/
  return (
    <DashboardLayout title="Family Portal">
      <div className="space-y-6">
        {/* Header with gradient */}
        <FamilyHeader
          onUploadClick={!isGuest ? () => setIsUploadOpen(true) : undefined}
          onAddNoteClick={() => {
            setActiveTab('notes');
            // TODO: Open note editor modal in Phase 3
          }}
        />

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCount={unreadCount}
        />

        {/* Tab Content */}
        {activeTab === 'documents' && (
          <DocumentsTab
            familyId={familyId}
            showMock={showMock}
            onUploadClick={!isGuest ? () => setIsUploadOpen(true) : undefined}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab familyId={familyId} showMock={showMock} />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            familyId={familyId}
            onAddNoteClick={() => {
              // TODO: Open note editor modal in Phase 3
              alert('Note editor coming soon!');
            }}
          />
        )}

        {activeTab === 'messages' && <MessagesTab familyId={familyId} />}

        {activeTab === 'billing' && (
          <BillingTab familyId={familyId} showMock={showMock} isGuest={isGuest} />
        )}

        {activeTab === 'emergency' && (
          <EmergencyTab familyId={familyId} isGuest={isGuest} />
        )}

        {activeTab === 'gallery' && (
          <GalleryTab familyId={familyId} showMock={showMock} isGuest={isGuest} />
        )}

        {activeTab === 'members' && (
          <MembersTab familyId={familyId} showMock={showMock} isGuest={isGuest} currentUserRole={role} />
        )}

        {/* Upload modal */}
        <DocumentUploadModal
          isOpen={isUploadOpen}
          onClose={() => {
            setIsUploadOpen(false);
            setPrefillFiles([]);
          }}
          onUpload={handleUpload}
          familyId={familyId ?? ''}
          initialFiles={prefillFiles}
        />
      </div>
    </DashboardLayout>
  );
}
