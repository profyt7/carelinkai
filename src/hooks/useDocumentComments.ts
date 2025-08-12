import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentCommentWithAuthor } from '@/lib/types/family';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface LoadingState {
  isFetching: boolean;
  isPosting: boolean;
}

interface ErrorState {
  fetchError: string | null;
  postError: string | null;
}

interface UseDocumentCommentsProps {
  documentId?: string;
  familyId?: string;
  initialPage?: number;
  limit?: number;
  autoFetch?: boolean;
}

export default function useDocumentComments({
  documentId,
  familyId,
  initialPage = 1,
  limit = 10,
  autoFetch = true
}: UseDocumentCommentsProps) {
  // State
  const [comments, setComments] = useState<DocumentCommentWithAuthor[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState<LoadingState>({
    isFetching: false,
    isPosting: false
  });
  const [error, setError] = useState<ErrorState>({
    fetchError: null,
    postError: null
  });

  // Refs
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  // SSE EventSource ref
  const esRef = useRef<EventSource | null>(null);

  // Reset state when documentId changes
  useEffect(() => {
    reset();
    
    // If autoFetch is enabled and documentId exists, fetch comments
    if (autoFetch && documentId) {
      fetchComments();
    }
    
    return () => {
      // Cleanup: abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [documentId]);

  // Make sure isMounted is set to true when the component mounts
  // This is important for React StrictMode which mounts components twice
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Cleanup EventSource on unmount
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  /* ------------------------------------------------------------------
   * Real-time subscription using Server-Sent Events (SSE)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    // Whenever the document ID changes, establish a fresh SSE connection
    if (!documentId) {
      // No document selected – close any previous connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // Close any existing connection first
    if (esRef.current) {
      esRef.current.close();
    }

    const url = `/api/sse?topics=${encodeURIComponent(`document:${documentId}`)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('comment:created', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);

        if (payload.documentId !== documentId) return;

        const newComment: DocumentCommentWithAuthor = payload.comment;

        setComments((prev) => {
          // Deduplicate top-level comments
          if (!newComment.parentCommentId) {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [newComment, ...prev];
          }

          // Handle replies – find parent and append if not present
          return prev.map((c) => {
            if (c.id !== newComment.parentCommentId) return c;

            const alreadyExists =
              c.replies?.some((r) => r.id === newComment.id) ?? false;
            if (alreadyExists) return c;

            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          });
        });
      } catch (err) {
        console.error('[useDocumentComments] Failed to process SSE event', err);
      }
    });

    es.onerror = (err) => {
      console.error('[useDocumentComments] SSE connection error', err);
    };

    return () => {
      es.close();
    };
  }, [documentId]);

  // Reset state
  const reset = useCallback(() => {
    setComments([]);
    setPagination({
      page: initialPage,
      limit,
      total: 0,
      hasMore: false
    });
    setLoading({
      isFetching: false,
      isPosting: false
    });
    setError({
      fetchError: null,
      postError: null
    });
  }, [initialPage, limit]);

  // Fetch comments
  const fetchComments = useCallback(async (pageArg?: number) => {
    if (!documentId) {
      console.log('[useDocumentComments] No documentId provided, skipping fetch');
      return;
    }

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Create a timeout that will abort the request after 15 seconds
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        console.log('[useDocumentComments] Request timed out after 15s');
        abortControllerRef.current.abort();
      }
    }, 15000);

    // Update state
    const page = pageArg || pagination.page;
    setLoading(prev => ({ ...prev, isFetching: true }));
    setError(prev => ({ ...prev, fetchError: null }));

    console.log(`[useDocumentComments] Fetching comments for document ${documentId}, page ${page}`);

    try {
      // Construct URL with query parameters
      const url = `/api/family/documents/${documentId}/comments?page=${page}&limit=${limit}${
        familyId ? `&familyId=${familyId}` : ''
      }`;

      // Fetch comments
      const response = await fetch(url, { signal });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch comments');
      }

      const data = await response.json();
      console.log('[useDocumentComments] Fetch successful', data);

      if (isMounted.current) {
        // Update state with fetched data
        setComments(data.items);
        setPagination({
          page,
          limit,
          total: data.total,
          hasMore: data.hasMore
        });
      }
    } catch (err) {
      console.error('[useDocumentComments] Error fetching comments:', err);
      if (isMounted.current && err instanceof Error && err.name !== 'AbortError') {
        setError(prev => ({ ...prev, fetchError: err instanceof Error ? err.message : 'Unknown error' }));
      }
    } finally {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, isFetching: false }));
      }
      console.log('[useDocumentComments] Fetch completed');
    }
  }, [documentId, familyId, limit, pagination.page]);

  // Add a new top-level comment
  const addComment = useCallback(async (content: string) => {
    if (!documentId || !content.trim()) {
      console.log('[useDocumentComments] No documentId or content provided, skipping post');
      return;
    }

    setLoading(prev => ({ ...prev, isPosting: true }));
    setError(prev => ({ ...prev, postError: null }));

    try {
      // Post comment
      const response = await fetch(`/api/family/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const data = await response.json();
      console.log('[useDocumentComments] Comment added successfully', data);

      if (isMounted.current) {
        setComments(prev =>
          prev.some(c => c.id === data.comment.id)
            ? prev
            : [data.comment, ...prev]
        );
      }
    } catch (err) {
      console.error('[useDocumentComments] Error adding comment:', err);
      
      if (isMounted.current) {
        setError(prev => ({ 
          ...prev, 
          postError: err instanceof Error ? err.message : 'Failed to add comment' 
        }));
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, isPosting: false }));
      }
    }
  }, [documentId]);

  // Reply to an existing comment
  const replyToComment = useCallback(async (parentId: string, content: string) => {
    if (!documentId || !content.trim() || !parentId) {
      console.log('[useDocumentComments] Missing required data, skipping reply');
      return;
    }

    setLoading(prev => ({ ...prev, isPosting: true }));
    setError(prev => ({ ...prev, postError: null }));

    try {
      // Post reply
      const response = await fetch(`/api/family/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content,
          parentCommentId: parentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add reply');
      }

      const data = await response.json();
      console.log('[useDocumentComments] Reply added successfully', data);

      if (isMounted.current) {
        // Append the reply only if it's not already present
        setComments(prev =>
          prev.map(comment => {
            if (comment.id !== parentId) return comment;
            const exists =
              (comment.replies || []).some(r => r.id === data.comment.id);
            return exists
              ? comment
              : {
                  ...comment,
                  replies: [...(comment.replies || []), data.comment]
                };
          })
        );
      }
    } catch (err) {
      console.error('[useDocumentComments] Error adding reply:', err);
      
      if (isMounted.current) {
        setError(prev => ({ 
          ...prev, 
          postError: err instanceof Error ? err.message : 'Failed to add reply' 
        }));
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, isPosting: false }));
      }
    }
  }, [documentId]);

  return {
    comments,
    pagination,
    loading,
    error,
    fetchComments,
    addComment,
    replyToComment,
    reset
  };
}
