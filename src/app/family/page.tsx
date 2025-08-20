'use client';

/* ------------------------------------------------------------------
 * Family Collaboration – Documents
 * ------------------------------------------------------------------
 * Minimal but functional implementation that:
 *   • Resolves familyId (query param > API fallback)
 *   • Lists documents using existing useDocuments hook
 *   • Provides basic filters & upload via DocumentUploadModal
 *   • Allows download (open in new tab) & delete
 * ----------------------------------------------------------------- */

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'next/navigation';
import { useDocuments } from '@/hooks/useDocuments';
import dynamic from 'next/dynamic';
import { DOCUMENT_TYPE_LABELS, formatFileSize } from '@/lib/types/family';
import type { DocumentType } from '@/lib/types/family';
import { FiPlus, FiSearch, FiTrash2, FiDownload, FiTag, FiMessageCircle, FiSend, FiEye, FiEyeOff, FiUpload } from 'react-icons/fi';
import type { FamilyMember } from '@prisma/client';

// Lazy load modal to avoid big bundle
const DocumentUploadModal = dynamic(
  () => import('@/components/family/DocumentUploadModal'),
  { ssr: false }
);
const NoteCreateModal = dynamic(
  () => import('@/components/family/NoteCreateModal'),
  { ssr: false }
);
const NoteEditModal = dynamic(
  () => import('@/components/family/NoteEditModal'),
  { ssr: false }
);
const GalleryCreateModal = dynamic(
  () => import('@/components/family/GalleryCreateModal'),
  { ssr: false }
);
const InviteMemberModal = dynamic(
  () => import('@/components/family/InviteMemberModal'),
  { ssr: false }
);
const GalleryDetailModal = dynamic(
  () => import('@/components/family/GalleryDetailModal'),
  { ssr: false }
);

export default function FamilyPage() {
  const searchParams = useSearchParams();
  const queryFamilyId = searchParams?.get('familyId') || '';
  const [familyId, setFamilyId] = useState<string>(queryFamilyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  /* ------------------- gallery detail modal --------------- */
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<any | null>(null);
  /* ------------------- new UI state ------------------------- */
  const [activeTab, setActiveTab] = useState<
    'documents' | 'notes' | 'photos' | 'members' | 'activity'
  >('documents');

  /* ------------------- new data state ----------------------- */
  const [notes, setNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [galleries, setGalleries] = useState<any[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(false);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  /* ------------------- comments state ----------------------- */
  const [commentsState, setCommentsState] = useState<Record<string, { open: boolean; items: any[]; loading: boolean; newContent: string }>>({});

  /* ------------------- SSE refs ----------------------------- */
  const esRef = React.useRef<EventSource | null>(null);
  const seenRef = React.useRef<Set<string>>(new Set());

  /* ------------------- photo upload state ------------------ */
  const [uploadingGalleryIds, setUploadingGalleryIds] = useState<Record<string, boolean>>({});

  /* ------------------------------------------------------------------
   * New state/helpers for note expand / delete and DOC-comment handling
   * ------------------------------------------------------------------ */
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const toggleNoteView = (noteId: string) =>
    setExpandedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }));

  const deleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/family/notes?id=${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      /* eslint-disable no-console */
      console.error('[FamilyPage] delete note error', err);
    }
  };

  /* ---------------- Document-level comments ---------------- */
  const [docCommentsState, setDocCommentsState] = useState<
    Record<
      string,
      { open: boolean; items: any[]; loading: boolean; newContent: string }
    >
  >({});

  const toggleDocComments = async (docId: string) => {
    // init if missing
    if (!docCommentsState[docId]) {
      setDocCommentsState(prev => ({
        ...prev,
        [docId]: { open: false, items: [], loading: false, newContent: '' },
      }));
    }

    // toggle
    setDocCommentsState(prev => ({
      ...prev,
      [docId]: { ...prev[docId], open: !prev[docId]?.open },
    }));

    // fetch on first open
    if (
      !docCommentsState[docId]?.open &&
      (docCommentsState[docId]?.items.length || 0) === 0
    ) {
      setDocCommentsState(prev => ({
        ...prev,
        [docId]: { ...prev[docId], loading: true },
      }));
      try {
        const res = await fetch(
          `/api/family/documents/${docId}/comments?familyId=${familyId}`
        );
        if (res.ok) {
          const json = await res.json();
          setDocCommentsState(prev => ({
            ...prev,
            [docId]: { ...prev[docId], items: json.items || [], loading: false },
          }));
          setNotes((prev) => prev.map((n) => (n.id === docId ? { ...n, commentCount: (json.items || []).length } : n)));
        } else throw new Error();
      } catch (e) {
        console.error('Failed to fetch doc comments', e);
        setDocCommentsState(prev => ({
          ...prev,
          [docId]: { ...prev[docId], loading: false },
        }));
      }
    }
  };

  const addDocComment = async (docId: string) => {
    if (!docCommentsState[docId]?.newContent.trim()) return;
    setDocCommentsState(prev => ({
      ...prev,
      [docId]: { ...prev[docId], loading: true },
    }));
    try {
      const res = await fetch(
        `/api/family/documents/${docId}/comments?familyId=${familyId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: docCommentsState[docId].newContent }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        setDocCommentsState(prev => ({
          ...prev,
          [docId]: {
            ...prev[docId],
            items: [...prev[docId].items, json.comment],
            newContent: '',
            loading: false,
          },
        }));
      } else throw new Error();
    } catch (e) {
      console.error('Failed to add doc comment', e);
      setDocCommentsState(prev => ({
        ...prev,
        [docId]: { ...prev[docId], loading: false },
      }));
    }
  };

  const handleDocCommentChange = (docId: string, value: string) =>
    setDocCommentsState(prev => ({
      ...prev,
      [docId]: { ...prev[docId], newContent: value },
    }));

  /* ---------------- Gallery-level comments ---------------- */
  const [galleryCommentsState, setGalleryCommentsState] = useState<
    Record<
      string,
      { open: boolean; items: any[]; loading: boolean; posting: boolean; newContent: string }
    >
  >({});

  const toggleGalleryComments = async (galleryId: string) => {
    /* Initialise state slice if missing */
    if (!galleryCommentsState[galleryId]) {
      setGalleryCommentsState(prev => ({
        ...prev,
        [galleryId]: { open: false, items: [], loading: false, posting: false, newContent: '' },
      }));
    }

    /* Toggle – and capture whether panel will be open afterwards */
    let willOpen = false;
    setGalleryCommentsState(prev => {
      willOpen = !prev[galleryId]?.open;
      return {
        ...prev,
        [galleryId]: {
          ...prev[galleryId],
          open: willOpen,
          /* if we're opening, start loading immediately */
          loading: willOpen ? true : prev[galleryId]?.loading ?? false,
        },
      };
    });

    /* If panel is opening, always fetch fresh comments for consistency */
    if (willOpen) {
      try {
        console.log(`[GalleryComments] fetch start`, { galleryId, familyId });
        /* timeout-aware fetch (8s) */
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        const res = await fetch(`/api/family/galleries/${galleryId}/comments`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: ac.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          console.error(
            `Failed to fetch gallery comments – status ${res.status}`
          );
          throw new Error('Non-200 response');
        }
        const json = await res.json();

        console.log(`[GalleryComments] fetch ok`, {
          galleryId,
          count: (json.comments || []).length,
        });

        setGalleryCommentsState(prev => ({
          ...prev,
          [galleryId]: {
            ...prev[galleryId],
            items: json.comments || [],
            loading: false,
          },
        }));

        /* Sync commentCount with latest list length */
        setGalleries(prev =>
          prev.map(g =>
            g.id === galleryId
              ? { ...g, commentCount: (json.comments || []).length }
              : g
          )
        );
      } catch (e) {
        console.error('[GalleryComments] fetch error', e);
        setGalleryCommentsState(prev => ({
          ...prev,
          [galleryId]: { ...prev[galleryId], loading: false },
        }));
      }
    }
  };

  const addGalleryComment = async (galleryId: string) => {
    const val = galleryCommentsState[galleryId]?.newContent?.trim();
    if (!val) return;

    setGalleryCommentsState(prev => ({
      ...prev,
      [galleryId]: { ...prev[galleryId], posting: true },
    }));

    try {
      const res = await fetch(`/api/family/galleries/${galleryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val }),
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (res.ok) {
        const payload = await res.json();
        const created = payload?.comment ?? payload;

        /* Optimistically bump gallery commentCount */
        setGalleries(prev =>
          prev.map(g =>
            g.id === galleryId
              ? { ...g, commentCount: (g.commentCount || 0) + 1 }
              : g
          )
        );

        /* Add comment to current open panel */
        setGalleryCommentsState(prev => ({
          ...prev,
          [galleryId]: {
            ...prev[galleryId],
            items: [...prev[galleryId].items, created],
            newContent: '',
            posting: false,
          },
        }));

        /* Mark as seen to avoid duplicate SSE handling */
        try {
          if (created.id) {
            seenRef.current?.add(`gal:cmt:${created.id}`);
          }
        } catch (_) {
          /* ignore */
        }
      } else throw new Error();
    } catch (e) {
      console.error('Failed to add gallery comment', e);
      setGalleryCommentsState(prev => ({
        ...prev,
        [galleryId]: { ...prev[galleryId], posting: false },
      }));
    }
  };

  const handleGalleryCommentChange = (galleryId: string, value: string) =>
    setGalleryCommentsState(prev => ({
      ...prev,
      [galleryId]: { ...prev[galleryId], newContent: value },
    }));

  /* ---------------- Photo upload function ---------------- */
  const uploadPhotos = async (galleryId: string, files: FileList) => {
    if (!files.length) return;
    
    // Set loading state
    setUploadingGalleryIds(prev => ({ ...prev, [galleryId]: true }));
    
    try {
      // Find the gallery
      const gallery = galleries.find(g => g.id === galleryId);
      if (!gallery) throw new Error('Gallery not found');
      
      // Create form data
      const formData = new FormData();
      formData.append('familyId', familyId);
      formData.append('setAsCover', gallery.coverPhotoUrl ? 'false' : 'true');
      
      // Append all files
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      
      // Send request
      const res = await fetch(`/api/family/galleries/${galleryId}/photos`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload photos');
      }
      
      const data = await res.json();
      
      // Update gallery in state
      setGalleries(prev => prev.map(g => {
        if (g.id === galleryId) {
          return {
            ...g,
            photoCount: g.photoCount + files.length,
            coverPhotoUrl: g.coverPhotoUrl || (data.photos?.[0]?.thumbnailUrl || data.photos?.[0]?.fileUrl)
          };
        }
        return g;
      }));
      
    } catch (error) {
      console.error('Failed to upload photos:', error);
    } finally {
      // Clear loading state
      setUploadingGalleryIds(prev => ({ ...prev, [galleryId]: false }));
    }
  };

  // Fetch fallback familyId if not provided
  useEffect(() => {
    if (familyId) return;
    (async () => {
      try {
        const res = await fetch('/api/user/family');
        if (res.ok) {
          const json = await res.json();
          if (json.familyId) setFamilyId(json.familyId as string);
        }
      } catch (_) {
        /* noop – handled in UI */
      }
    })();
  }, [familyId]);

  /* ------------------- Helpers / loaders -------------------- */
  const reloadNotes = async () => {
    if (!familyId) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/family/notes?familyId=${familyId}`);
      if (res.ok) {
        const json = await res.json();
        setNotes(json.items ?? []);
      }
    } catch (_) {
      /* noop */
    } finally {
      setNotesLoading(false);
    }
  };

  const reloadGalleries = async () => {
    if (!familyId) return;
    setGalleriesLoading(true);
    try {
      const res = await fetch(`/api/family/galleries?familyId=${familyId}`);
      if (res.ok) {
        const json = await res.json();
        setGalleries(json.items ?? []);
      }
    } catch (_) {
      /* noop */
    } finally {
      setGalleriesLoading(false);
    }
  };

  const reloadMembers = async () => {
    if (!familyId) return;
    setMembersLoading(true);
    try {
      const res = await fetch(
        `/api/family/members?familyId=${familyId}&status=ACTIVE`
      );
      if (res.ok) {
        const json = await res.json();
        setMembers(json.items ?? []);
      }
    } catch (_) {
      /* noop */
    } finally {
      setMembersLoading(false);
    }
  };

  const reloadActivity = async () => {
    if (!familyId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/family/activity?familyId=${familyId}`);
      if (res.ok) {
        const json = await res.json();
        setActivity(json.items ?? []);
      }
    } catch (_) {
      /* noop */
    } finally {
      setActivityLoading(false);
    }
  };
  
  /* ------------------- Comments functions ------------------- */
  const toggleComments = async (noteId: string) => {
    // Initialize state if not exists
    if (!commentsState[noteId]) {
      setCommentsState(prev => ({
        ...prev,
        [noteId]: { open: false, items: [], loading: false, newContent: '' }
      }));
    }
    
    // Toggle open state
    setCommentsState(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        open: !prev[noteId]?.open
      }
    }));
    
    // Fetch comments if opening and no items yet
    if (!commentsState[noteId]?.open && (!commentsState[noteId]?.items.length || commentsState[noteId]?.items.length === 0)) {
      setCommentsState(prev => ({
        ...prev,
        [noteId]: {
          ...prev[noteId],
          loading: true
        }
      }));
      
      try {
        const res = await fetch(`/api/family/notes/${noteId}/comments`);
        if (res.ok) {
          const json = await res.json();
          setCommentsState(prev => ({
            ...prev,
            [noteId]: {
              ...prev[noteId],
              items: json.items || [],
              loading: false
            }
          }));
          setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, commentCount: (json.items || []).length } : n)));
        } else {
          throw new Error('Failed to fetch comments');
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
        setCommentsState(prev => ({
          ...prev,
          [noteId]: {
            ...prev[noteId],
            loading: false
          }
        }));
      }
    }
  };
  
  const addComment = async (noteId: string) => {
    if (!familyId || !commentsState[noteId]?.newContent.trim()) return;
    
    // Set loading state
    setCommentsState(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        loading: true
      }
    }));
    
    try {
      const res = await fetch(`/api/family/notes/${noteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: commentsState[noteId].newContent
        })
      });
      
      if (res.ok) {
        const json = await res.json();
        
        // Add comment to list and clear input
        setCommentsState(prev => ({
          ...prev,
          [noteId]: {
            ...prev[noteId],
            items: [...prev[noteId].items, json.comment],
            newContent: '',
            loading: false
          }
        }));
        
        // Update note's comment count
        setNotes(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, commentCount: json.commentCount } 
            : note
        ));
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setCommentsState(prev => ({
        ...prev,
        [noteId]: {
          ...prev[noteId],
          loading: false
        }
      }));
    }
  };
  
  const handleCommentChange = (noteId: string, value: string) => {
    setCommentsState(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        newContent: value
      }
    }));
  };

  /* Fetch once familyId resolves */
  useEffect(() => {
    if (!familyId) return;
    reloadNotes();
    reloadGalleries();
  }, [familyId]);

  /* Load data when user switches tabs (lazy) */
  useEffect(() => {
    if (!familyId) return;
    if (activeTab === 'members' && members.length === 0 && !membersLoading) {
      reloadMembers();
    }
    if (activeTab === 'activity' && activity.length === 0 && !activityLoading) {
      reloadActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, familyId]);

  /* --------------------- Documents Hook ---------------------- */
  const {
    documents,
    uploadDocuments,
    deleteDocument,
    setFilters,
    filters,
    loading,
  } = useDocuments({
    familyId,
    autoFetch: !!familyId,
  });

  /* --------------------- Handlers ---------------------------- */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchQuery: e.target.value });
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as DocumentType | '';
    setFilters({ type: val || undefined });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ sortBy: e.target.value as any });
  };

  const onUpload = async (payload: any) => {
    await uploadDocuments(payload);
  };

  /* ------------------------------------------------------------------
   * Server-Sent Events – family real-time updates
   * ------------------------------------------------------------------ */
  useEffect(() => {
    // Close connection if familyId disappears
    if (!familyId) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // Re-establish new connection whenever familyId changes
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`
    );
    esRef.current = es;

    const seen = seenRef.current;
    const dedup = (key: string) => {
      if (seen.has(key)) return true;
      seen.add(key);
      // trim set occasionally to avoid unbounded growth
      if (seen.size > 5000) {
        const it = seen.values();
        for (let i = 0; i < 1000; i++) seen.delete(it.next().value);
      }
      return false;
    };

    /* ----------- NOTE EVENTS ----------- */
    es.addEventListener('note:created', (evt) => {
      try {
        const { note } = JSON.parse((evt as MessageEvent).data);
        if (!note || dedup(`note:created:${note.id}`)) return;
        setNotes((prev) =>
          prev.some((n) => n.id === note.id) ? prev : [note, ...prev]
        );
      } catch (e) {
        console.error('[SSE] note:created', e);
      }
    });

    es.addEventListener('note:updated', (evt) => {
      try {
        const { note } = JSON.parse((evt as MessageEvent).data);
        if (!note || dedup(`note:updated:${note.id}:${note.updatedAt}`)) return;
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      } catch (e) {
        console.error('[SSE] note:updated', e);
      }
    });

    es.addEventListener('note:deleted', (evt) => {
      try {
        const { noteId } = JSON.parse((evt as MessageEvent).data);
        if (!noteId || dedup(`note:deleted:${noteId}`)) return;
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch (e) {
        console.error('[SSE] note:deleted', e);
      }
    });

    es.addEventListener('note:commented', (evt) => {
      try {
        const { noteId, comment } = JSON.parse((evt as MessageEvent).data);
        if (!noteId || (comment?.id && dedup(`note:cmt:${comment.id}`))) return;
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, commentCount: (n.commentCount || 0) + 1 }
              : n
          )
        );
        setCommentsState((prev) => {
          const cur = prev[noteId];
          if (!cur?.open) return prev;
          return {
            ...prev,
            [noteId]: { ...cur, items: [...cur.items, comment] },
          };
        });
      } catch (e) {
        console.error('[SSE] note:commented', e);
      }
    });

    /* ----------- GALLERY & PHOTO EVENTS ----------- */
    es.addEventListener('gallery:created', (evt) => {
      try {
        const { gallery } = JSON.parse((evt as MessageEvent).data);
        if (!gallery || dedup(`gal:created:${gallery.id}`)) return;
        setGalleries((prev) =>
          prev.some((g) => g.id === gallery.id) ? prev : [gallery, ...prev]
        );
      } catch (e) {
        console.error('[SSE] gallery:created', e);
      }
    });

    es.addEventListener('photo:uploaded', (evt) => {
      try {
        const { galleryId, photos } = JSON.parse((evt as MessageEvent).data);
        if (!galleryId || !photos?.length) return;
        if (dedup(`photo:up:${galleryId}:${photos[0].id}`)) return;
        setGalleries((prev) =>
          prev.map((g) =>
            g.id === galleryId
              ? {
                  ...g,
                  photoCount: (g.photoCount || 0) + photos.length,
                  coverPhotoUrl:
                    g.coverPhotoUrl ||
                    photos[0].thumbnailUrl ||
                    photos[0].fileUrl,
                }
              : g
          )
        );
      } catch (e) {
        console.error('[SSE] photo:uploaded', e);
      }
    });

    es.addEventListener('photo:deleted', (evt) => {
      try {
        const { galleryId, photoId, coverPhotoUpdated, newCoverPhotoUrl } =
          JSON.parse((evt as MessageEvent).data);
        if (!galleryId || !photoId || dedup(`photo:del:${photoId}`)) return;
        setGalleries((prev) =>
          prev.map((g) =>
            g.id === galleryId
              ? {
                  ...g,
                  photoCount: Math.max(0, (g.photoCount || 0) - 1),
                  coverPhotoUrl: coverPhotoUpdated
                    ? newCoverPhotoUrl
                    : g.coverPhotoUrl,
                }
              : g
          )
        );
      } catch (e) {
        console.error('[SSE] photo:deleted', e);
      }
    });

    /* ----------- ACTIVITY EVENTS ----------- */
    es.addEventListener('activity:created', (evt) => {
      try {
        const { activity: act } = JSON.parse((evt as MessageEvent).data);
        if (!act?.id || dedup(`act:${act.id}`)) return;
        setActivity((prev) => [act, ...prev]);

        /* -- When activity represents photo uploads, increment gallery photoCount -- */
        if (
          act?.type === 'PHOTO_UPLOADED' &&
          act?.resourceType === 'gallery' &&
          act?.resourceId
        ) {
          const added = act?.metadata?.photoCount ?? 1;
          setGalleries((prev) =>
            prev.map((g) =>
              g.id === act.resourceId
                ? { ...g, photoCount: (g.photoCount || 0) + added }
                : g
            )
          );
        }
      } catch (e) {
        console.error('[SSE] activity:created', e);
      }
    });

    /* ----------- GALLERY COMMENT EVENTS ----------- */
    es.addEventListener('comment:created', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        if (payload.resourceType !== 'gallery') return;
        const { resourceId: galleryId, comment } = payload;
        if (!galleryId || (comment?.id && dedup(`gal:cmt:${comment.id}`))) return;
        setGalleries((prev) =>
          prev.map((g) =>
            g.id === galleryId
              ? { ...g, commentCount: (g.commentCount || 0) + 1 }
              : g
          )
        );
        setGalleryCommentsState((prev) => {
          const cur = prev[galleryId];
          if (!cur?.open) return prev;
          return {
            ...prev,
            [galleryId]: { ...cur, items: [...cur.items, comment] },
          };
        });
      } catch (e) {
        console.error('[SSE] gallery comment', e);
      }
    });

    /* ----------- GALLERY COMMENT ALIAS EVENTS ----------- */
    es.addEventListener('gallery:commented', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const galleryId: string | undefined = payload?.galleryId || payload?.resourceId;
        const comment = payload?.comment;
        if (!galleryId) return;
        if (comment?.id && dedup(`gal:cmt:${comment.id}`)) return;

        setGalleries((prev) =>
          prev.map((g) =>
            g.id === galleryId
              ? { ...g, commentCount: (g.commentCount || 0) + 1 }
              : g
          )
        );
        setGalleryCommentsState((prev) => {
          const existing = prev[galleryId];
          if (!existing?.open) return prev;
          return {
            ...prev,
            [galleryId]: { ...existing, items: [...existing.items, comment] },
          };
        });
      } catch (e) {
        console.error('[SSE] gallery:commented', e);
      }
    });

    es.onerror = (err) => {
      console.error('[SSE] connection error', err);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [familyId]);

  /* --------------------- Memo helpers ------------------------ */
  const docTypes = useMemo(() => Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[], []);

  /* --------------------- Stats helpers ----------------------- */
  const { totalDocs, totalSize, uploads30d } = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const uploads30d = documents.filter(
      (d) => now - new Date(d.createdAt).getTime() <= THIRTY_DAYS
    ).length;

    return { totalDocs, totalSize, uploads30d };
  }, [documents]);

  return (
    <DashboardLayout title="Family Collaboration">
      <div className="space-y-6">
        {/* Hero */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Family Portal</h1>
              <p className="mt-1 text-primary-100">
                Securely share and collaborate with your family.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Upload Document
              </button>
              <button
                onClick={() => setNoteModalOpen(true)}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Create Note
              </button>
              <button
                onClick={() => setGalleryModalOpen(true)}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Add Photos
              </button>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-primary-700 shadow hover:bg-white"
              >
                <FiPlus className="mr-2" /> Invite Member
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-6 text-sm font-medium">
            {(['documents', 'notes', 'photos', 'members', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Missing family notice */}
        {!familyId && (
          <p className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            Unable to determine family. Provide <code>?familyId=&lt;cuid&gt;</code> in the URL
            or ensure you belong to a family.
          </p>
        )}

        {familyId && (
          <div className="rounded-md border bg-white p-4 shadow-sm">
            {/* ---------------------- DOCUMENTS TAB -------------------- */}
            {activeTab === 'documents' && (
            <>
            {/* Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full md:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents…"
                    className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    onChange={handleSearchChange}
                  />
                </div>

                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onChange={handleTypeFilter}
                  value={filters.type ?? ''}
                >
                  <option value="">All Types</option>
                  {docTypes.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>

                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onChange={handleSortChange}
                  value={filters.sortBy}
                >
                  <option value="createdAt">Newest</option>
                  <option value="title">Title</option>
                  <option value="fileSize">Size</option>
                </select>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <FiPlus className="h-4 w-4" />
                Upload
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{totalDocs}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {formatFileSize(totalSize)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                <p className="text-sm text-gray-500">Uploaded (30&nbsp;days)</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800">{uploads30d}</p>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="mt-8">
              {loading.isFetching ? (
                <p className="text-center text-sm text-gray-600">Loading…</p>
              ) : documents.length === 0 ? (
                <p className="text-center text-sm text-gray-500">No documents found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex h-full flex-col justify-between rounded-lg border bg-white p-4 shadow-sm"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">{doc.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.type]}</p>

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                              >
                                <FiTag className="mr-1 h-3 w-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-xs text-gray-500">
                        <div>{formatFileSize(doc.fileSize)}</div>
                        <div>
                          {new Date(doc.createdAt).toLocaleDateString()} · {doc.uploader.firstName}{' '}
                          {doc.uploader.lastName}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        {/* Comments toggle button */}
                        <button
                          onClick={() => toggleDocComments(doc.id)}
                          className="flex items-center text-xs text-primary-600 hover:text-primary-700"
                        >
                          <FiMessageCircle className="mr-1" />
                          {doc.commentCount || 0} comments
                          {docCommentsState[doc.id]?.open ? ' (hide)' : ' (show)'}
                        </button>

                        {/* Document comments section */}
                        {docCommentsState[doc.id]?.open && (
                          <div className="mt-2">
                            {docCommentsState[doc.id]?.loading ? (
                              <p className="text-xs text-gray-500">Loading comments...</p>
                            ) : docCommentsState[doc.id]?.items.length === 0 ? (
                              <p className="text-xs text-gray-500">No comments yet</p>
                            ) : (
                              <ul className="space-y-2">
                                {docCommentsState[doc.id]?.items.map((comment: any) => (
                                  <li key={comment.id} className="rounded bg-gray-50 p-2 text-xs">
                                    <div className="font-medium">
                                      {comment.author.firstName} {comment.author.lastName}
                                    </div>
                                    <div className="mt-1">{comment.content}</div>
                                    <div className="mt-1 text-gray-400">
                                      {new Date(comment.createdAt).toLocaleString()}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                            
                            {/* Add document comment form */}
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="text"
                                value={docCommentsState[doc.id]?.newContent || ''}
                                onChange={(e) => handleDocCommentChange(doc.id, e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                              <button
                                onClick={() => addDocComment(doc.id)}
                                disabled={!docCommentsState[doc.id]?.newContent?.trim() || docCommentsState[doc.id]?.loading}
                                className="inline-flex items-center rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                              >
                                <FiSend className="mr-1 h-3 w-3" />
                                Send
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Document actions */}
                        <div className="flex justify-end gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary-600 hover:underline"
                          >
                            <FiDownload className="mr-1" />
                            View
                          </a>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="inline-flex items-center text-red-600 hover:underline"
                            title="Delete"
                          >
                            <FiTrash2 className="mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}

            {/* --------------------- PLACEHOLDERS ---------------------- */}
            {activeTab !== 'documents' && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                {activeTab === 'notes' && (
                  <>
                    {notesLoading ? (
                      <p className="text-gray-500">Loading notes…</p>
                    ) : notes.length === 0 ? (
                      <p className="text-gray-500">No notes yet. Click "Create Note" to add one.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {notes.map((note) => (
                          <div key={note.id} className="rounded-lg border bg-white p-4 shadow-sm">
                            <h3 className="text-base font-semibold text-gray-800">{note.title}</h3>
                            {note.tags?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {note.tags.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                  >
                                    <FiTag className="mr-1 h-3 w-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              {new Date(note.createdAt).toLocaleDateString()} ·{' '}
                              {note.author.firstName} {note.author.lastName}
                            </p>
                            
                            {/* Note actions row */}
                            <div className="mt-3 flex items-center space-x-2 border-t pt-2">
                              <button
                                onClick={() => toggleNoteView(note.id)}
                                className="flex items-center text-xs text-primary-600 hover:text-primary-700"
                              >
                                {expandedNotes[note.id] ? (
                                  <>
                                    <FiEyeOff className="mr-1" /> Hide
                                  </>
                                ) : (
                                  <>
                                    <FiEye className="mr-1" /> View
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => { setEditingNote(note); setEditModalOpen(true); }} 
                                className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="flex items-center text-xs text-red-600 hover:text-red-700"
                              >
                                <FiTrash2 className="mr-1" /> Delete
                              </button>
                            </div>

                            {/* Note content when expanded */}
                            {expandedNotes[note.id] && (
                              <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-700">
                                {note.content.plainText || note.content.content}
                              </div>
                            )}
                            
                            {/* Comments section */}
                            <div className="mt-3 border-t pt-2">
                              <button 
                                onClick={() => toggleComments(note.id)}
                                className="flex items-center text-xs text-primary-600 hover:text-primary-700"
                              >
                                <FiMessageCircle className="mr-1" />
                                {note.commentCount || 0} comments
                                {commentsState[note.id]?.open ? ' (hide)' : ' (show)'}
                              </button>
                              
                              {/* Comments list */}
                              {commentsState[note.id]?.open && (
                                <div className="mt-2">
                                  {commentsState[note.id]?.loading ? (
                                    <p className="text-xs text-gray-500">Loading comments...</p>
                                  ) : commentsState[note.id]?.items.length === 0 ? (
                                    <p className="text-xs text-gray-500">No comments yet</p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {commentsState[note.id]?.items.map((comment: any) => (
                                        <li key={comment.id} className="rounded bg-gray-50 p-2 text-xs">
                                          <div className="font-medium">{comment.author.firstName} {comment.author.lastName}</div>
                                          <div className="mt-1">{comment.content}</div>
                                          <div className="mt-1 text-gray-400">{new Date(comment.createdAt).toLocaleString()}</div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {/* Add comment form */}
                                  <div className="mt-3 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={commentsState[note.id]?.newContent || ''}
                                      onChange={(e) => handleCommentChange(note.id, e.target.value)}
                                      placeholder="Add a comment..."
                                      className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                    <button
                                      onClick={() => addComment(note.id)}
                                      disabled={!commentsState[note.id]?.newContent?.trim() || commentsState[note.id]?.loading}
                                      className="inline-flex items-center rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                                    >
                                      <FiSend className="mr-1 h-3 w-3" />
                                      Send
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'photos' && (
                  <>
                    {galleriesLoading ? (
                      <p className="text-gray-500">Loading galleries…</p>
                    ) : galleries.length === 0 ? (
                      <p className="text-gray-500">
                        No photo galleries yet. Click "Add Photos" to create one.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {galleries.map((g) => (
                          <div key={g.id} className="rounded-lg border bg-white shadow-sm">
                            <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={g.coverPhotoUrl || '/placeholder.png'}
                                alt={g.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="font-medium text-gray-800">{g.title}</h3>
                              <p className="mt-1 text-xs text-gray-500">{g.photoCount} photos</p>

                              {/* Gallery tags */}
                              {g.tags && g.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {g.tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                    >
                                      <FiTag className="mr-1 h-3 w-3" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Photo viewer toggle */}
                              <button
                                onClick={() => { setSelectedGallery(g); setDetailModalOpen(true); }}
                                className="mt-2 flex items-center text-xs text-primary-600 hover:text-primary-700"
                              >
                                <FiEye className="mr-1" />
                                Open Gallery
                                {` (${g.photoCount})`}
                              </button>

                              {/* Photo upload section */}
                              <div className="mt-3 border-t pt-3">
                                <input
                                  type="file"
                                  id={`file-input-${g.id}`}
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      uploadPhotos(g.id, e.target.files);
                                      e.target.value = ''; // Reset input
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => document.getElementById(`file-input-${g.id}`)?.click()}
                                  disabled={uploadingGalleryIds[g.id]}
                                  className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                                >
                                  <FiUpload className="mr-1.5 h-3 w-3" />
                                  {uploadingGalleryIds[g.id] ? 'Uploading...' : 'Upload Photos'}
                                </button>
                              </div>

                              {/* Comments toggle */}
                              <button
                                onClick={() => toggleGalleryComments(g.id)}
                                className="mt-2 flex items-center text-xs text-primary-600 hover:text-primary-700"
                              >
                                <FiMessageCircle className="mr-1" />
                                {g.commentCount || 0} comments
                                {galleryCommentsState[g.id]?.open ? ' (hide)' : ' (show)'}
                              </button>

                              {/* Comments section */}
                              {galleryCommentsState[g.id]?.open && (
                                <div className="mt-2">
                                  {galleryCommentsState[g.id]?.loading ? (
                                    <p className="text-xs text-gray-500">Loading comments...</p>
                                  ) : galleryCommentsState[g.id]?.items.length === 0 ? (
                                    <p className="text-xs text-gray-500">No comments yet</p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {galleryCommentsState[g.id]?.items.map((comment: any) => (
                                        <li
                                          key={comment.id}
                                          className="rounded bg-gray-50 p-2 text-xs"
                                        >
                                          <div className="font-medium">
                                            {comment.author.firstName} {comment.author.lastName}
                                          </div>
                                          <div className="mt-1">{comment.content}</div>
                                          <div className="mt-1 text-gray-400">
                                            {new Date(comment.createdAt).toLocaleString()}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {/* Add comment form */}
                                  <div className="mt-3 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={galleryCommentsState[g.id]?.newContent || ''}
                                      onChange={(e) =>
                                        handleGalleryCommentChange(g.id, e.target.value)
                                      }
                                      placeholder="Add a comment..."
                                      className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                    <button
                                      onClick={() => addGalleryComment(g.id)}
                                      disabled={
                                        !galleryCommentsState[g.id]?.newContent?.trim() ||
                                        galleryCommentsState[g.id]?.posting
                                      }
                                      className="inline-flex items-center rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                                    >
                                      <FiSend className="mr-1 h-3 w-3" />
                                      Send
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'members' && (
                  <>
                    {membersLoading ? (
                      <p className="text-gray-500">Loading members…</p>
                    ) : members.length === 0 ? (
                      <p className="text-gray-500">
                        No members found. Use "Invite Member" to add one.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {members.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between rounded-md border bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              {/* avatar */}
                              {(() => {
                                // Determine avatar URL (string or JSON object with thumbnail)
                                const rawImg = (m.user as any).profileImageUrl;
                                const avatarUrl =
                                  typeof rawImg === 'string'
                                    ? rawImg
                                    : rawImg?.thumbnail;

                                return avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatarUrl}
                                  alt={`${m.user.firstName} ${m.user.lastName}`}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                                ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
                                  {m.user.firstName.charAt(0)}
                                  {m.user.lastName.charAt(0)}
                                </div>
                                );
                              })()}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {m.user.firstName} {m.user.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{m.user.email}</p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-semibold text-gray-700">{m.role}</p>
                              <p
                                className={
                                  m.status === 'ACTIVE'
                                    ? 'text-green-600'
                                    : m.status === 'PENDING'
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }
                              >
                                {m.status}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {activeTab === 'activity' && (
                  <>
                    {activityLoading ? (
                      <p className="text-gray-500">Loading activity…</p>
                    ) : activity.length === 0 ? (
                      <p className="text-gray-500">No recent activity.</p>
                    ) : (
                      <ul className="space-y-4">
                        {activity.map((a) => (
                          <li
                            key={a.id}
                            className="rounded-md border bg-white p-4 shadow-sm"
                          >
                            <p className="text-sm text-gray-800">{a.description}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(a.createdAt).toLocaleString()} · {a.actor.firstName}{' '}
                              {a.actor.lastName}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {familyId && (
        <DocumentUploadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onUpload={onUpload}
          familyId={familyId}
        />
      )}

      {/* Note modal */}
      {familyId && (
        <NoteCreateModal
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          familyId={familyId}
          onCreated={(n) => setNotes((prev) => [n, ...prev])}
        />
      )}

      {/* Note Edit Modal */}
      {familyId && editingNote && (
        <NoteEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          familyId={familyId}
          note={editingNote}
          onUpdated={(updated) => {
            setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
            setEditingNote(updated);
            setEditModalOpen(false);
          }}
        />
      )}

      {/* Gallery modal */}
      {familyId && (
        <GalleryCreateModal
          isOpen={galleryModalOpen}
          onClose={() => setGalleryModalOpen(false)}
          familyId={familyId}
          onCreated={(g) => setGalleries((prev) => [g, ...prev])}
        />
      )}

      {/* Invite modal */}
      {familyId && (
        <InviteMemberModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          familyId={familyId}
        />
      )}

      {/* Gallery Detail Modal */}
      {familyId && selectedGallery && (
        <GalleryDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          familyId={familyId}
          gallery={{
            id: selectedGallery.id,
            title: selectedGallery.title,
            coverPhotoUrl: selectedGallery.coverPhotoUrl,
            photoCount: selectedGallery.photoCount,
          }}
          onPhotosAdded={(added, firstThumbUrl) => {
            setGalleries(prev => prev.map(g => g.id === selectedGallery.id ? { ...g, photoCount: (g.photoCount || 0) + added, coverPhotoUrl: g.coverPhotoUrl || firstThumbUrl || g.coverPhotoUrl } : g));
          }}
          onPhotoDeleted={() => {
            setGalleries(prev => prev.map(g => g.id === selectedGallery.id ? { ...g, photoCount: Math.max(0, (g.photoCount || 0) - 1), coverPhotoUrl: ((g.photoCount || 0) - 1) <= 0 ? null : g.coverPhotoUrl } : g));
          }}
        />
      )}
    </DashboardLayout>
  );
}
