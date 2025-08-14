import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import type {
  DocumentFilterParams,
  FamilyDocumentWithDetails,
  FamilyDocumentUpload,
  PaginationData,
  DocumentType
} from "@/lib/types/family";

interface DocumentsState {
  documents: FamilyDocumentWithDetails[];
  pagination: PaginationData;
  selectedDocument: FamilyDocumentWithDetails | null;
}

interface DocumentsLoading {
  isFetching: boolean;
  isUploading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

interface DocumentsError {
  fetchError: string | null;
  uploadError: string | null;
  updateError: string | null;
  deleteError: string | null;
}

interface UploadProgress {
  [key: string]: number; // Map of file IDs to progress percentages
  overall: number;
}

interface UseDocumentsOptions {
  familyId: string;
  initialFilters?: Partial<DocumentFilterParams>;
  autoFetch?: boolean;
}

interface UseDocumentsReturn {
  // Data
  documents: FamilyDocumentWithDetails[];
  pagination: PaginationData;
  selectedDocument: FamilyDocumentWithDetails | null;
  
  // Loading states
  loading: DocumentsLoading;
  
  // Error states
  errors: DocumentsError;
  
  // Upload progress
  uploadProgress: UploadProgress;
  
  // Actions
  fetchDocuments: (filters?: Partial<DocumentFilterParams>) => Promise<void>;
  uploadDocuments: (documents: FamilyDocumentUpload[]) => Promise<void>;
  updateDocument: (id: string, updates: Partial<FamilyDocumentWithDetails>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocumentById: (id: string) => FamilyDocumentWithDetails | null;
  selectDocument: (document: FamilyDocumentWithDetails | null) => void;
  
  // Filters
  filters: DocumentFilterParams;
  setFilters: (filters: Partial<DocumentFilterParams>) => void;
  resetFilters: () => void;
  
  // Pagination
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}

const defaultPagination: PaginationData = {
  page: 1,
  limit: 20,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
};

/**
 * Hook for managing family documents with comprehensive CRUD operations
 */
export function useDocuments({
  familyId,
  initialFilters = {},
  autoFetch = true
}: UseDocumentsOptions): UseDocumentsReturn {
  // Session for authentication
  const { data: session } = useSession();
  
  // Document state
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    pagination: { ...defaultPagination },
    selectedDocument: null
  });
  
  // Loading states
  const [loading, setLoading] = useState<DocumentsLoading>({
    isFetching: false,
    isUploading: false,
    isUpdating: false,
    isDeleting: false
  });
  
  // Error states
  const [errors, setErrors] = useState<DocumentsError>({
    fetchError: null,
    uploadError: null,
    updateError: null,
    deleteError: null
  });
  
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    overall: 0
  });
  
  // Filters state
  const [filters, setFiltersState] = useState<DocumentFilterParams>({
    familyId,
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialFilters
  });
  
  // ------------------------------------------------------------------
  // Keep `filters.familyId` in sync with the latest `familyId` prop.
  // Without this, the hook keeps the empty string from first render and
  // continues to fire API calls with `familyId=` which returns 400.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (familyId && filters.familyId !== familyId) {
      // eslint-disable-next-line no-console
      console.log(
        "[useDocuments] familyId changed, updating filters from:",
        filters.familyId,
        "to:",
        familyId
      );
      setFiltersState(prev => ({
        ...prev,
        familyId
      }));
    }
    // We intentionally depend on `filters.familyId` here to avoid
    // unnecessary state updates once they match.
  }, [familyId, filters.familyId]);

  /* ------------------------------------------------------------------
   * Auto-fetch whenever **filter values** (other than pagination) change.
   * This replaces the old queueMicrotask approach that lived in setFilters.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    // Only run if:
    //   1. autoFetch enabled
    //   2. we have a valid familyId
    //   3. the filters object we hold already contains that familyId
    // (prevents firing while familyId sync is still in progress)
    if (
      autoFetch &&
      familyId &&
      filters.familyId === familyId
    ) {
      /* eslint-disable no-console */
      console.log(
        "[useDocuments] Filters changed, triggering fetch. Filters:",
        filters
      );
      /* eslint-enable no-console */

      // Trigger fetch; since we did NOT include filters.page in the
      // dependency list, pagination changes (handled by goToPage) will
      // call fetchDocuments manually and won't double-fetch.
      fetchDocuments();
    }
    // We *intentionally* exclude `filters.page` so pagination controls
    // don't trigger duplicate fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.sortBy,
    filters.sortOrder,
    filters.type,
    filters.status,
    filters.searchQuery,
    filters.tags,
    autoFetch,
    familyId,
    filters.familyId
  ]);

  // Refs for tracking mounted state and abort controllers
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  // SSE connection & deduplication
  const esRef = useRef<EventSource | null>(null);
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  // Deduplication for document lifecycle events
  const seenDocEventIdsRef = useRef<Set<string>>(new Set());
  
  // --------------------------------------------------
  // Ensure isMounted is explicitly set to true on mount.
  // This is critical in React StrictMode where a dummy
  // unmount/mount cycle occurs and the ref may remain
  // false after the first unmount.
  // --------------------------------------------------
  useEffect(() => {
    isMounted.current = true;
  }, []);

  // Reset mounted ref on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Close SSE connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);
  
  /* ------------------------------------------------------------------
   * Real-time updates – listen for family-wide comment events
   * ------------------------------------------------------------------ */
  useEffect(() => {
    // If no valid family, close any existing stream and exit
    if (!familyId) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // Close prior connection (if any) before opening a new one
    if (esRef.current) {
      esRef.current.close();
    }

    const url = `/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("comment:created", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const { documentId, commentId } = payload || {};

        // Deduplicate events
        if (!commentId || seenCommentIdsRef.current.has(commentId)) return;
        seenCommentIdsRef.current.add(commentId);

        // Increment comment counts
        setState((prev) => {
          const updatedDocs = prev.documents.map((doc) =>
            doc.id === documentId
              ? { ...doc, commentCount: (doc.commentCount ?? 0) + 1 }
              : doc
          );

          const updatedSelected =
            prev.selectedDocument?.id === documentId
              ? {
                  ...prev.selectedDocument,
                  commentCount: (prev.selectedDocument.commentCount ?? 0) + 1,
                }
              : prev.selectedDocument;

          return {
            ...prev,
            documents: updatedDocs,
            selectedDocument: updatedSelected,
          };
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[useDocuments] Failed to process SSE event:", error);
      }
    });

    /* --------------------------------------------------------------
     * DOCUMENT LIFECYCLE EVENTS
     * -------------------------------------------------------------- */

    // Document Created
    es.addEventListener("document:created", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const doc: FamilyDocumentWithDetails | undefined = payload?.document;
        if (!doc) return;

        const key = `created:${doc.id}`;
        if (seenDocEventIdsRef.current.has(key)) return;
        seenDocEventIdsRef.current.add(key);

        setState((prev) => {
          // Skip if document already present (e.g., optimistic insert)
          if (prev.documents.some((d) => d.id === doc.id)) {
            return prev;
          }

          const newDocs =
            filters.sortBy === "createdAt" && filters.sortOrder === "desc"
              ? [doc, ...prev.documents]
              : [...prev.documents, doc];

          return {
            ...prev,
            documents: newDocs,
            pagination: {
              ...prev.pagination,
              totalCount: prev.pagination.totalCount + 1,
            },
          };
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[useDocuments] Failed to process document:created:", error);
      }
    });

    // Document Updated
    es.addEventListener("document:updated", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const doc: FamilyDocumentWithDetails | undefined = payload?.document;
        if (!doc) return;

        const key = `updated:${doc.id}:${(doc as any)?.updatedAt || ""}`;
        if (seenDocEventIdsRef.current.has(key)) return;
        seenDocEventIdsRef.current.add(key);

        setState((prev) => {
          const exists = prev.documents.some((d) => d.id === doc.id);
          if (!exists) return prev;

          const updatedDocs = prev.documents.map((d) =>
            d.id === doc.id ? doc : d
          );

          const updatedSelected =
            prev.selectedDocument?.id === doc.id
              ? { ...prev.selectedDocument, ...doc }
              : prev.selectedDocument;

          return { ...prev, documents: updatedDocs, selectedDocument: updatedSelected };
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[useDocuments] Failed to process document:updated:", error);
      }
    });

    // Document Deleted
    es.addEventListener("document:deleted", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const documentId: string | undefined = payload?.documentId;
        if (!documentId) return;

        const key = `deleted:${documentId}`;
        if (seenDocEventIdsRef.current.has(key)) return;
        seenDocEventIdsRef.current.add(key);

        setState((prev) => {
          if (!prev.documents.some((d) => d.id === documentId)) return prev;

          const remainingDocs = prev.documents.filter((d) => d.id !== documentId);
          const newTotal = Math.max(0, prev.pagination.totalCount - 1);

          return {
            ...prev,
            documents: remainingDocs,
            selectedDocument:
              prev.selectedDocument?.id === documentId
                ? null
                : prev.selectedDocument,
            pagination: {
              ...prev.pagination,
              totalCount: newTotal,
            },
          };
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[useDocuments] Failed to process document:deleted:", error);
      }
    });

    es.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.error("[useDocuments] SSE connection error:", err);
    };

    // Cleanup when familyId changes or component unmounts
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [familyId]);

  /**
   * Set filters and optionally fetch documents
   */
  const setFilters = useCallback((newFilters: Partial<DocumentFilterParams>) => {
    // eslint-disable-next-line no-console
    console.log("[useDocuments] setFilters called with:", newFilters);

    // IMPORTANT:
    // ---------
    // 1. We MUST build the **next** filters object inside the updater
    //    function so we are guaranteed to have the *latest* state, not the
    //    closure-captured `filters` value from the first render.
    // 2. We explicitly inject `familyId` coming from props so it can never
    //    fall back to an empty string.
    // 3. We trigger `fetchDocuments` *after* state is updated to avoid
    //    making a request with stale filters.
    setFiltersState(prev => {
      const merged: DocumentFilterParams = {
        ...prev,
        ...newFilters,
        familyId: familyId || prev.familyId, // always prefer current prop
        // Reset to page 1 unless the caller is specifically changing page
        page: "page" in newFilters ? newFilters.page || 1 : 1
      };

      // eslint-disable-next-line no-console
      console.log("[useDocuments] filters will be set to:", merged);

      return merged;
    });
  }, [familyId]);
  
  /**
   * Reset filters to initial state
   */
  const resetFilters = useCallback(() => {
    const resetFilters = {
      familyId,
      page: 1,
      limit: 20,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const
    };
    
    setFiltersState(resetFilters);
    fetchDocuments(resetFilters);
  }, [familyId]);
  
  /**
   * Fetch documents with optional filter overrides
   */
  const fetchDocuments = useCallback(async (filterOverrides?: Partial<DocumentFilterParams>) => {
    // --------------------------------------------------
    // Guard clause: skip if no valid familyId
    // --------------------------------------------------
    if (!familyId) {
      // eslint-disable-next-line no-console
      console.warn("[useDocuments] No familyId provided, skipping fetch");
      return;
    }
    // Debug: starting a new fetch
    // eslint-disable-next-line no-console
    console.log("[useDocuments] fetchDocuments starting, familyId:", familyId);

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    // eslint-disable-next-line no-console
    console.log("[useDocuments] Created new AbortController with signal:", abortControllerRef.current.signal);
    
    // Set up timeout to prevent indefinite hanging
    let timeoutId: ReturnType<typeof setTimeout>;
    let timedOut = false;
    
    // Create timeout that will abort the request after 15 seconds
    timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        timedOut = true;
        // eslint-disable-next-line no-console
        console.log("[useDocuments] Request timeout reached (15s), aborting fetch");
        abortControllerRef.current.abort();
      }
    }, 15000); // 15 seconds timeout
    
    // eslint-disable-next-line no-console
    console.log("[useDocuments] Request timeout scheduled for 15 seconds");
    
    // Combine current filters with overrides
    const currentFilters = filterOverrides || filters;
    
    // Create effectiveFilters that ensures familyId is always set to the latest prop value
    const effectiveFilters = {
      ...currentFilters,
      familyId: familyId // Force use of the current familyId prop
    };
    
    // Set loading state
    // eslint-disable-next-line no-console
    console.log("[useDocuments] fetchDocuments called, setting isFetching: true. Current loading state:", loading);
    setLoading(prev => ({ ...prev, isFetching: true }));
    setErrors(prev => ({ ...prev, fetchError: null }));
    
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(effectiveFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Map searchQuery to search parameter for API compatibility
          const paramKey = key === 'searchQuery' ? 'search' : key;
          
          if (Array.isArray(value)) {
            // Handle array values (e.g., multiple types or tags)
            value.forEach(v => queryParams.append(paramKey, v.toString()));
          } else {
            queryParams.append(paramKey, value.toString());
          }
        }
      });
      
      // Make API request
      const response = await fetch(`/api/family/documents?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      
      const data = await response.json();

      // ------------------------------------------------------------------
      // Normalise payload: support `documents` or generic `items` key and
      // always have a pagination object.
      // ------------------------------------------------------------------
      const docs: FamilyDocumentWithDetails[] = Array.isArray(data.documents)
        ? data.documents
        : Array.isArray(data.items)
        ? data.items
        : [];

      const pagination =
        data.pagination || {
          ...defaultPagination,
          page: effectiveFilters.page || 1,
          limit: effectiveFilters.limit || 20,
          totalCount: docs.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        };

      // Helpful debug logging
      /* eslint-disable no-console */
      console.log(
        `[useDocuments] Fetched ${docs.length} docs. First 3:`,
        docs.slice(0, 3).map(d => ({ id: d.id, title: d.title })),
        "Pagination:",
        pagination
      );
      /* eslint-enable no-console */

      // Update state if component is still mounted
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          documents: docs,
          pagination
        }));
      }
    } catch (error) {
      // Handle errors if component is mounted
      if (isMounted.current) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            // Handle abort differently based on whether it was a timeout or manual abort
            // eslint-disable-next-line no-console
            console.log(`[useDocuments] Fetch aborted. Reason: ${timedOut ? 'timeout' : 'manual abort or component unmounted'}`);
            
            // Only show error for timeouts, not for manual aborts
            if (timedOut) {
              const timeoutError = 'Request timed out. Please try again.';
              setErrors(prev => ({ ...prev, fetchError: timeoutError }));
              toast.error(timeoutError);
              console.error('Fetch timeout:', error);
            }
            // For manual aborts (e.g., due to new fetch starting), silently ignore
          } else {
            // Handle other errors normally
            console.error('Error fetching documents:', error);
            setErrors(prev => ({ ...prev, fetchError: error.message }));
            toast.error(`Failed to load documents: ${error.message}`);
          }
        }
      }
    } finally {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);
      // eslint-disable-next-line no-console
      console.log("[useDocuments] Cleared request timeout");
      
      // Reset loading state if mounted
      if (isMounted.current) {
        // eslint-disable-next-line no-console
        console.log(
          "[useDocuments] fetchDocuments finally block, setting isFetching: false. Docs in state:",
          state.documents.length
        );
        setLoading(prev => ({ ...prev, isFetching: false }));
      }
    }
  }, [familyId, filters]);
  
  /**
   * Upload multiple documents with progress tracking
   */
  const uploadDocuments = useCallback(async (documents: FamilyDocumentUpload[]) => {
    if (!session?.user) {
      toast.error('You must be logged in to upload documents');
      return;
    }
    
    if (documents.length === 0) {
      toast.error('No documents to upload');
      return;
    }
    
    // Set loading state
    setLoading(prev => ({ ...prev, isUploading: true }));
    setErrors(prev => ({ ...prev, uploadError: null }));
    
    // Initialize progress tracking
    const progressMap: Record<string, number> = {
      overall: 0
    };
    
    // Create unique IDs for each document for tracking
    const documentIds = documents.map((_, index) => `upload-${Date.now()}-${index}`);
    documentIds.forEach(id => {
      progressMap[id] = 0;
    });
    
    setUploadProgress(progressMap);
    
    // Track successful uploads
    const successfulUploads: FamilyDocumentWithDetails[] = [];
    const failedUploads: string[] = [];
    
    try {
      // Upload each document sequentially
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const documentId = documentIds[i];
        
        // Create form data for this document
        const formData = new FormData();
        formData.append('familyId', document.familyId);
        formData.append('title', document.title);
        
        if (document.description) {
          formData.append('description', document.description);
        }
        
        formData.append('type', document.type);
        formData.append('isEncrypted', document.isEncrypted.toString());
        
        if (document.tags && document.tags.length > 0) {
          formData.append('tags', JSON.stringify(document.tags));
        }
        
        formData.append('file', document.file);
        
        // Create upload request with progress tracking
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && isMounted.current) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            
            // Update progress for this file
            setUploadProgress(prev => ({
              ...prev,
              [documentId]: percentComplete,
              // Calculate overall progress as average of all files
              overall: Object.keys(prev)
                .filter(key => key !== 'overall')
                .reduce((sum, key) => sum + (key === documentId ? percentComplete : prev[key]), 0) / documents.length
            }));
          }
        });
        
        // Wait for this upload to complete
        const uploadResult = await new Promise<{ success: boolean; document?: FamilyDocumentWithDetails; error?: string }>((resolve) => {
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve({ success: true, document: response.document });
                } catch (error) {
                  resolve({ success: false, error: 'Invalid server response' });
                }
              } else {
                let errorMessage = 'Upload failed';
                try {
                  const response = JSON.parse(xhr.responseText);
                  // --------------------------------------------------
                  // Debug: log the actual API error response so we can
                  // see exactly why the server returned 400/500.
                  // --------------------------------------------------
                  /* eslint-disable no-console */
                  console.log('API Error Response:', response);
                  // If the backend includes a `details` object (e.g. Zod
                  // validation errors), print it in a nicely formatted way
                  // so we can immediately see which fields failed.
                  if (response?.details) {
                    console.log(
                      'Validation Error Details:',
                      JSON.stringify(response.details, null, 2)
                    );
                  }
                  /* eslint-enable no-console */
                  errorMessage = response.error || errorMessage;
                } catch (e) {
                  // --------------------------------------------------
                  // If parsing fails, log the raw response text for
                  // further inspection.
                  // --------------------------------------------------
                  // eslint-disable-next-line no-console
                  console.log('Failed to parse error response:', xhr.responseText);
                  // Use default error message
                }
                resolve({ success: false, error: errorMessage });
              }
            }
          };
          
          xhr.open('POST', '/api/family/documents', true);
          xhr.send(formData);
        });
        
        // Handle result
        if (uploadResult.success && uploadResult.document) {
          successfulUploads.push(uploadResult.document);
          
          // Update progress to 100% for this file
          setUploadProgress(prev => ({
            ...prev,
            [documentId]: 100
          }));
        } else {
          failedUploads.push(document.title);
          
          // Show error for this file
          toast.error(`Failed to upload "${document.title}": ${uploadResult.error || 'Unknown error'}`);
        }
      }
      
      // Update documents list with new uploads
      if (successfulUploads.length > 0) {
        setState(prev => {
          // Deduplicate by ID in case SSE already inserted the same docs
          const existingIds = new Set(prev.documents.map(d => d.id));
          const newDocs = successfulUploads.filter(doc => !existingIds.has(doc.id));

          // If nothing new, return previous state unchanged
          if (newDocs.length === 0) return prev;

          return {
            ...prev,
            documents: [...newDocs, ...prev.documents],
            pagination: {
              ...prev.pagination,
              totalCount: prev.pagination.totalCount + newDocs.length
            }
          };
        });
        
        // Show success message
        /* eslint-disable no-console */
        console.log(
          `[useDocuments] Successfully uploaded ${successfulUploads.length} document${successfulUploads.length > 1 ? "s" : ""}`
        );
        /* eslint-enable no-console */
        if (successfulUploads.length === documents.length) {
          toast.success(`Successfully uploaded ${successfulUploads.length} document${successfulUploads.length > 1 ? 's' : ''}`);
        } else {
          toast.success(`Successfully uploaded ${successfulUploads.length} of ${documents.length} documents`);
        }
      }
      
      // Show error summary if any uploads failed
      if (failedUploads.length > 0) {
        setErrors(prev => ({ 
          ...prev, 
          uploadError: `Failed to upload ${failedUploads.length} document${failedUploads.length > 1 ? 's' : ''}` 
        }));
      }
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      setErrors(prev => ({ 
        ...prev, 
        uploadError: error instanceof Error ? error.message : 'Failed to upload documents' 
      }));
      toast.error('Failed to upload documents');
    } finally {
      // Reset loading state
      setLoading(prev => ({ ...prev, isUploading: false }));
      
      // Reset progress after a delay
      setTimeout(() => {
        if (isMounted.current) {
          setUploadProgress({ overall: 0 });
        }
      }, 2000);
    }
  }, [session, familyId]);
  
  /**
   * Update document metadata
   */
  const updateDocument = useCallback(async (id: string, updates: Partial<FamilyDocumentWithDetails>) => {
    if (!session?.user) {
      toast.error('You must be logged in to update documents');
      return;
    }
    
    // Set loading state
    setLoading(prev => ({ ...prev, isUpdating: true }));
    setErrors(prev => ({ ...prev, updateError: null }));
    
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === id ? { ...doc, ...updates } : doc
        ),
        selectedDocument: prev.selectedDocument?.id === id 
          ? { ...prev.selectedDocument, ...updates } 
          : prev.selectedDocument
      }));
      
      // Make API request
      const response = await fetch(`/api/family/documents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          ...updates
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update document');
      }
      
      const data = await response.json();
      
      // Update with server data
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === id ? data.document : doc
        ),
        selectedDocument: prev.selectedDocument?.id === id 
          ? data.document 
          : prev.selectedDocument
      }));
      
      toast.success('Document updated successfully');
      
    } catch (error) {
      console.error('Error updating document:', error);
      
      // Revert optimistic update
      fetchDocuments();
      
      setErrors(prev => ({ 
        ...prev, 
        updateError: error instanceof Error ? error.message : 'Failed to update document' 
      }));
      
      toast.error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(prev => ({ ...prev, isUpdating: false }));
    }
  }, [session, fetchDocuments]);
  
  /**
   * Delete a document
   */
  const deleteDocument = useCallback(async (id: string) => {
    if (!session?.user) {
      toast.error('You must be logged in to delete documents');
      return;
    }
    
    // Set loading state
    setLoading(prev => ({ ...prev, isDeleting: true }));
    setErrors(prev => ({ ...prev, deleteError: null }));
    
    try {
      // Find document to delete for optimistic UI update
      const documentToDelete = state.documents.find(doc => doc.id === id);
      
      if (!documentToDelete) {
        throw new Error('Document not found');
      }
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== id),
        selectedDocument: prev.selectedDocument?.id === id ? null : prev.selectedDocument,
        pagination: {
          ...prev.pagination,
          totalCount: Math.max(0, prev.pagination.totalCount - 1)
        }
      }));
      
      // Make API request
      const response = await fetch(`/api/family/documents?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      toast.success('Document deleted successfully');
      
    } catch (error) {
      console.error('Error deleting document:', error);
      
      // Revert optimistic update
      fetchDocuments();
      
      setErrors(prev => ({ 
        ...prev, 
        deleteError: error instanceof Error ? error.message : 'Failed to delete document' 
      }));
      
      toast.error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(prev => ({ ...prev, isDeleting: false }));
    }
  }, [session, state.documents, fetchDocuments]);
  
  /**
   * Get a document by ID from the current state
   */
  const getDocumentById = useCallback((id: string): FamilyDocumentWithDetails | null => {
    return state.documents.find(doc => doc.id === id) || null;
  }, [state.documents]);
  
  /**
   * Select a document
   */
  const selectDocument = useCallback((document: FamilyDocumentWithDetails | null) => {
    setState(prev => ({
      ...prev,
      selectedDocument: document
    }));
  }, []);
  
  /**
   * Pagination helpers
   */
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > state.pagination.totalPages) {
      return;
    }
    
    setFiltersState(prev => ({
      ...prev,
      page
    }));
    
    await fetchDocuments({
      ...filters,
      page
    });
  }, [filters, state.pagination.totalPages, fetchDocuments]);
  
  const nextPage = useCallback(async () => {
    if (!state.pagination.hasNextPage) {
      return;
    }
    
    const nextPage = state.pagination.page + 1;
    await goToPage(nextPage);
  }, [state.pagination, goToPage]);
  
  const prevPage = useCallback(async () => {
    if (!state.pagination.hasPreviousPage) {
      return;
    }
    
    const prevPage = state.pagination.page - 1;
    await goToPage(prevPage);
  }, [state.pagination, goToPage]);
  
  return {
    // Data
    documents: state.documents,
    pagination: state.pagination,
    selectedDocument: state.selectedDocument,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Upload progress
    uploadProgress,
    
    // Actions
    fetchDocuments,
    uploadDocuments,
    updateDocument,
    deleteDocument,
    getDocumentById,
    selectDocument,
    
    // Filters
    filters,
    setFilters,
    resetFilters,
    
    // Pagination
    goToPage,
    nextPage,
    prevPage
  };
}
