'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiX,
  FiUpload,
  FiSave,
  FiTrash2,
  FiEdit,
  FiExternalLink,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiGrid,
  FiDownloadCloud,
} from 'react-icons/fi';

interface GalleryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  gallery: { id: string; title: string; coverPhotoUrl?: string | null };
  onPhotosAdded?: (added: number, firstThumbUrl?: string) => void;
  onPhotoUpdated?: (photo: any) => void;
  onPhotoDeleted?: (photoId: string) => void;
}

interface PhotoItem {
  id: string;
  fileUrl: string;
  thumbnailUrl: string;
  caption: string | null;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export default function GalleryDetailModal({
  isOpen,
  onClose,
  familyId,
  gallery,
  onPhotosAdded,
  onPhotoUpdated,
  onPhotoDeleted,
}: GalleryDetailModalProps) {
  // State
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  // Caption editing state
  const [editingCaptions, setEditingCaptions] = useState<Record<string, string>>({});
  const [savingCaptions, setSavingCaptions] = useState<Record<string, boolean>>({});
  const [deletingPhotos, setDeletingPhotos] = useState<Record<string, boolean>>({});
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Selection mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch photos when modal opens
  useEffect(() => {
    if (isOpen && gallery.id) {
      fetchPhotos();
    } else {
      // Reset state when modal closes
      setPhotos([]);
      setNextCursor(null);
      setError(null);
      setUploads([]);
      setEditingCaptions({});
      setSavingCaptions({});
      setDeletingPhotos({});
      setLightboxOpen(false);
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen, gallery.id]);
  
  // Keyboard event handlers for lightbox navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          navigateLightbox('next');
          break;
        case 'Escape':
          setLightboxOpen(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentIndex, photos.length]);

  // Fetch photos from API
  const fetchPhotos = async (cursor?: string) => {
    if (!gallery.id) return;
    
    const isInitialFetch = !cursor;
    if (isInitialFetch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const url = new URL(`/api/family/galleries/${gallery.id}/photos`, window.location.origin);
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }
      url.searchParams.set('limit', '20');
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch photos');
      }
      
      const data = await res.json();
      
      if (isInitialFetch) {
        setPhotos(data.photos || []);
      } else {
        setPhotos(prev => [...prev, ...(data.photos || [])]);
      }
      
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error fetching photos:', err);
      setError('Failed to load photos. Please try again.');
    } finally {
      if (isInitialFetch) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // Load more photos
  const loadMorePhotos = () => {
    if (nextCursor && !loadingMore) {
      fetchPhotos(nextCursor);
    }
  };

  // Handle file selection from input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      prepareFilesForUpload(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  // Handle drag and drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (files.length === 0) {
        setError('Please drop image files only.');
        return;
      }
      
      prepareFilesForUpload(files);
    }
  };

  // Prepare files for upload
  const prepareFilesForUpload = (files: File[]) => {
    // Filter out non-image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please select image files only.');
      return;
    }
    
    // Add files to uploads state
    setUploads(prev => [
      ...prev,
      ...imageFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }))
    ]);
    
    // Start uploading each file
    imageFiles.forEach(file => uploadFile(file));
  };

  // Upload file with progress tracking
  const uploadFile = (file: File) => {
    const xhr = new XMLHttpRequest();
    
    // Update uploads state to 'uploading'
    setUploads(prev => prev.map(u => 
      u.file === file ? { ...u, status: 'uploading' } : u
    ));
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploads(prev => prev.map(u => 
          u.file === file ? { ...u, progress: percentComplete } : u
        ));
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          
          // Update uploads state to 'complete'
          setUploads(prev => prev.map(u => 
            u.file === file ? { ...u, status: 'complete' } : u
          ));
          
          // Add new photos to the grid
          if (response.photos && response.photos.length > 0) {
            setPhotos(prev => [...response.photos, ...prev]);
            
            // Call onPhotosAdded callback
            if (onPhotosAdded) {
              const firstThumb = response.photos[0]?.thumbnailUrl || response.photos[0]?.fileUrl;
              onPhotosAdded(response.photos.length, firstThumb);
            }
          }
        } catch (err) {
          console.error('Error parsing upload response:', err);
          setUploads(prev => prev.map(u => 
            u.file === file ? { ...u, status: 'error', error: 'Failed to process server response' } : u
          ));
        }
      } else {
        let errorMessage = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.error || errorMessage;
        } catch (e) {
          // Use default error message
        }
        
        setUploads(prev => prev.map(u => 
          u.file === file ? { ...u, status: 'error', error: errorMessage } : u
        ));
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
      setUploads(prev => prev.map(u => 
        u.file === file ? { ...u, status: 'error', error: 'Network error occurred' } : u
      ));
    });
    
    // Handle aborts
    xhr.addEventListener('abort', () => {
      setUploads(prev => prev.map(u => 
        u.file === file ? { ...u, status: 'error', error: 'Upload aborted' } : u
      ));
    });
    
    // Send the request
    xhr.open('POST', `/api/family/galleries/${gallery.id}/photos`);
    
    const formData = new FormData();
    formData.append('familyId', familyId);
    formData.append('setAsCover', (!gallery.coverPhotoUrl).toString());
    formData.append('photos', file);
    
    xhr.send(formData);
  };

  // Clear completed uploads
  const clearCompletedUploads = () => {
    setUploads(prev => prev.filter(u => u.status !== 'complete'));
  };

  // Clear failed uploads
  const clearFailedUploads = () => {
    setUploads(prev => prev.filter(u => u.status !== 'error'));
  };

  // Start caption editing
  const startEditingCaption = (photo: PhotoItem) => {
    if (selectMode) return; // Don't allow editing in select mode
    
    setEditingCaptions(prev => ({
      ...prev,
      [photo.id]: photo.caption || ''
    }));
  };

  // Handle caption change
  const handleCaptionChange = (photoId: string, value: string) => {
    setEditingCaptions(prev => ({
      ...prev,
      [photoId]: value
    }));
  };

  // Save caption
  const saveCaption = async (photoId: string) => {
    const caption = editingCaptions[photoId];
    
    // Skip if not editing this photo
    if (caption === undefined) return;
    
    setSavingCaptions(prev => ({ ...prev, [photoId]: true }));
    
    try {
      const res = await fetch(`/api/family/galleries/${gallery.id}/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update caption');
      }
      
      const updatedPhoto = await res.json();
      
      // Update photo in state
      setPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, caption: updatedPhoto.caption } : p
      ));
      
      // Call onPhotoUpdated callback
      if (onPhotoUpdated) {
        onPhotoUpdated(updatedPhoto);
      }
      
      // Clear editing state
      setEditingCaptions(prev => {
        const newState = { ...prev };
        delete newState[photoId];
        return newState;
      });
    } catch (err) {
      console.error('Error updating caption:', err);
      setError('Failed to update caption. Please try again.');
    } finally {
      setSavingCaptions(prev => {
        const newState = { ...prev };
        delete newState[photoId];
        return newState;
      });
    }
  };

  // Delete photo
  const deletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) {
      return;
    }
    
    setDeletingPhotos(prev => ({ ...prev, [photoId]: true }));
    
    try {
      const res = await fetch(`/api/family/galleries/${gallery.id}/photos/${photoId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete photo');
      }
      
      // Remove photo from state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      // Remove from selected IDs if in selection mode
      if (selectedIds.has(photoId)) {
        const newSelectedIds = new Set(selectedIds);
        newSelectedIds.delete(photoId);
        setSelectedIds(newSelectedIds);
      }
      
      // Call onPhotoDeleted callback
      if (onPhotoDeleted) {
        onPhotoDeleted(photoId);
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo. Please try again.');
    } finally {
      setDeletingPhotos(prev => {
        const newState = { ...prev };
        delete newState[photoId];
        return newState;
      });
    }
  };
  
  // Lightbox navigation
  const openLightbox = (index: number) => {
    if (selectMode) return; // Don't open lightbox in select mode
    setCurrentIndex(index);
    setLightboxOpen(true);
  };
  
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (photos.length === 0) return;
    
    if (direction === 'prev') {
      setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    } else {
      setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  };
  
  // Selection mode handlers
  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    if (selectMode) {
      // Clear selection when exiting select mode
      setSelectedIds(new Set());
    }
  };
  
  const togglePhotoSelection = (photoId: string) => {
    if (!selectMode) return;
    
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(photoId)) {
      newSelectedIds.delete(photoId);
    } else {
      newSelectedIds.add(photoId);
    }
    setSelectedIds(newSelectedIds);
  };
  
  // Bulk actions
  const handleDownloadAll = async () => {
    if (!gallery.id || photos.length === 0) return;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/family/galleries/${gallery.id}/photos/zip`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download photos');
      }
      
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or use default
      let filename = `gallery-${gallery.id}.zip`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading photos:', err);
      setError('Failed to download photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleDownloadSelected = async () => {
    if (!gallery.id || selectedIds.size === 0) return;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/family/galleries/${gallery.id}/photos/zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photoIds: Array.from(selectedIds)
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to download selected photos');
      }
      
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or use default
      let filename = `gallery-${gallery.id}-selected.zip`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading selected photos:', err);
      setError('Failed to download selected photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected photo${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }
    
    setIsDeletingBulk(true);
    setError(null);
    
    try {
      const selectedIdsArray = Array.from(selectedIds);
      let deleteCount = 0;
      
      // Delete photos one by one
      for (const photoId of selectedIdsArray) {
        try {
          setDeletingPhotos(prev => ({ ...prev, [photoId]: true }));
          
          const res = await fetch(`/api/family/galleries/${gallery.id}/photos/${photoId}`, {
            method: 'DELETE'
          });
          
          if (res.ok) {
            deleteCount++;
            
            // Call onPhotoDeleted callback
            if (onPhotoDeleted) {
              onPhotoDeleted(photoId);
            }
          }
        } catch (err) {
          console.error(`Error deleting photo ${photoId}:`, err);
        } finally {
          setDeletingPhotos(prev => {
            const newState = { ...prev };
            delete newState[photoId];
            return newState;
          });
        }
      }
      
      // Update photos state to remove deleted photos
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      
      // Clear selection
      setSelectedIds(new Set());
      
      if (deleteCount === 0) {
        setError('Failed to delete any photos. Please try again.');
      } else if (deleteCount < selectedIdsArray.length) {
        setError(`Only deleted ${deleteCount} of ${selectedIdsArray.length} photos. Some photos could not be deleted.`);
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
      setError('An error occurred during deletion. Some photos may not have been deleted.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="relative w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {gallery.title}
              </h3>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto p-6">
            {/* Error display */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Upload section */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-gray-700">Upload Photos</h4>
              
              {/* Drag and drop area */}
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-dashed border-gray-300 bg-gray-50'
                } p-6 transition-colors`}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="mb-1 text-sm text-gray-600">
                  Drag and drop images here, or click to select files
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              
              {/* Upload progress */}
              {uploads.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Uploads</h5>
                    <div className="flex gap-2">
                      {uploads.some(u => u.status === 'complete') && (
                        <button
                          type="button"
                          onClick={clearCompletedUploads}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Clear completed
                        </button>
                      )}
                      {uploads.some(u => u.status === 'error') && (
                        <button
                          type="button"
                          onClick={clearFailedUploads}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Clear failed
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <ul className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
                    {uploads.map((upload, index) => (
                      <li
                        key={`${upload.file.name}-${index}`}
                        className="flex items-center justify-between border-b border-gray-200 p-2 last:border-b-0"
                      >
                        <div className="flex flex-1 items-center overflow-hidden">
                          <span className="mr-2 truncate text-xs">{upload.file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(upload.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        
                        <div className="ml-4 flex w-32 items-center">
                          {upload.status === 'pending' && (
                            <span className="text-xs text-gray-500">Pending</span>
                          )}
                          
                          {upload.status === 'uploading' && (
                            <div className="flex w-full items-center">
                              <div className="relative h-1 w-full rounded-full bg-gray-200">
                                <div
                                  className="absolute h-1 rounded-full bg-primary-500"
                                  style={{ width: `${upload.progress}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs">{upload.progress}%</span>
                            </div>
                          )}
                          
                          {upload.status === 'complete' && (
                            <span className="text-xs text-green-600">Complete</span>
                          )}
                          
                          {upload.status === 'error' && (
                            <span className="text-xs text-red-600" title={upload.error}>
                              Failed
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Photos grid */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Gallery Photos</h4>
                
                {/* Selection mode toolbar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectMode}
                    className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${
                      selectMode 
                        ? 'bg-primary-100 text-primary-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiGrid className="mr-1 h-3 w-3" />
                    {selectMode ? 'Exit Selection' : 'Select Photos'}
                  </button>
                  
                  {selectMode && (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadSelected}
                        disabled={selectedIds.size === 0 || isDownloading}
                        className="inline-flex items-center rounded-md bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiDownload className="mr-1 h-3 w-3" />
                        Download Selected ({selectedIds.size})
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0 || isDeletingBulk}
                        className="inline-flex items-center rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiTrash2 className="mr-1 h-3 w-3" />
                        Delete Selected ({selectedIds.size})
                      </button>
                    </>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={photos.length === 0 || isDownloading}
                    className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiDownloadCloud className="mr-1 h-3 w-3" />
                    Download All
                  </button>
                </div>
              </div>
              
              {loading ? (
                <p className="text-center text-sm text-gray-500">Loading photos...</p>
              ) : photos.length === 0 ? (
                <p className="text-center text-sm text-gray-500">No photos in this gallery yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`overflow-hidden rounded-lg border ${
                          selectedIds.has(photo.id) 
                            ? 'border-primary-500 ring-2 ring-primary-500' 
                            : 'border-gray-200'
                        } bg-white shadow-sm transition-all`}
                      >
                        {/* Photo */}
                        <div 
                          className="relative aspect-w-4 aspect-h-3 bg-gray-100 cursor-pointer"
                          onClick={() => selectMode ? togglePhotoSelection(photo.id) : openLightbox(index)}
                        >
                          {/* Selection indicator */}
                          {selectMode && selectedIds.has(photo.id) && (
                            <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                              <FiCheck className="h-4 w-4" />
                            </div>
                          )}
                          
                          {!selectMode && (
                            <a
                              href={photo.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block h-full w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.thumbnailUrl || photo.fileUrl}
                                alt={photo.caption || 'Gallery photo'}
                                className="h-full w-full object-cover"
                              />
                            </a>
                          )}
                          
                          {/* When in select mode, just show the image without link */}
                          {selectMode && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={photo.thumbnailUrl || photo.fileUrl}
                              alt={photo.caption || 'Gallery photo'}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        
                        {/* Caption and controls */}
                        <div className="p-3">
                          {/* Caption display or edit */}
                          {editingCaptions[photo.id] !== undefined ? (
                            <div className="mb-2 flex">
                              <input
                                type="text"
                                value={editingCaptions[photo.id]}
                                onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                                className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                placeholder="Add a caption..."
                                disabled={savingCaptions[photo.id]}
                              />
                              <button
                                type="button"
                                onClick={() => saveCaption(photo.id)}
                                disabled={savingCaptions[photo.id]}
                                className="ml-2 inline-flex items-center rounded-md bg-primary-600 px-2 py-1 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                              >
                                <FiSave className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="mb-2 flex items-start justify-between">
                              <p className="text-sm text-gray-700">
                                {photo.caption || <span className="text-gray-400">No caption</span>}
                              </p>
                              {!selectMode && (
                                <button
                                  type="button"
                                  onClick={() => startEditingCaption(photo)}
                                  className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                                >
                                  <FiEdit className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* View / Download row */}
                          <div className="mb-1 flex items-center gap-3 text-xs">
                            <a
                              href={photo.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary-600 hover:text-primary-700"
                            >
                              <FiExternalLink className="mr-1 h-3 w-3" />
                              View
                            </a>
                            <a
                              href={photo.fileUrl}
                              download
                              className="inline-flex items-center text-primary-600 hover:text-primary-700"
                            >
                              <FiDownload className="mr-1 h-3 w-3" />
                              Download
                            </a>
                          </div>
                          
                          {/* uploader / date + delete */}
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              {photo.uploader.firstName} {photo.uploader.lastName}
                              <br />
                              {new Date(photo.createdAt).toLocaleDateString()}
                            </div>
                            {!selectMode && (
                              <button
                                type="button"
                                onClick={() => deletePhoto(photo.id)}
                                disabled={deletingPhotos[photo.id]}
                                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Load more button */}
                  {nextCursor && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={loadMorePhotos}
                        disabled={loadingMore}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70"
          >
            <FiX className="h-6 w-6" />
          </button>
          
          <button
            type="button"
            onClick={() => navigateLightbox('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70"
          >
            <FiChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            type="button"
            onClick={() => navigateLightbox('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70"
          >
            <FiChevronRight className="h-6 w-6" />
          </button>
          
          <div className="max-h-[90vh] max-w-[90vw] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[currentIndex]?.fileUrl}
              alt={photos[currentIndex]?.caption || 'Gallery photo'}
              className="max-h-[80vh] max-w-[80vw] object-contain"
            />
            
            {photos[currentIndex]?.caption && (
              <div className="mt-4 text-center">
                <p className="text-white">{photos[currentIndex].caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
