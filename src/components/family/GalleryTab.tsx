'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FiCamera, FiUpload, FiX, FiDownload, FiTrash2, FiMessageSquare, FiChevronLeft, FiChevronRight, FiImage, FiVideo, FiSearch, FiFilter, FiFolder } from 'react-icons/fi';
import Image from 'next/image';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

type Photo = {
  id: string;
  caption: string;
  fileUrl: string; // Changed from cloudinaryUrl to match API
  thumbnailUrl?: string;
  fileType?: string; // Optional: stored in metadata, not always available
  createdAt: string; // Changed from uploadedAt to match API
  uploader?: { // Changed from uploadedBy to match API, made optional for safety
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  galleryId?: string | null; // Changed from albumId to match API
  gallery?: { // Changed from album to match API
    id: string;
    title: string; // Changed from name to match API
  } | null;
  comments?: { // Optional: comments might not be loaded initially
    id: string;
    content: string;
    createdAt: string;
    author: {
      firstName?: string | null;
      lastName?: string | null;
    };
  }[];
};

type Album = {
  id: string;
  name: string;
  photoCount: number;
  createdAt: string;
};

interface GalleryTabProps {
  familyId: string | null;
  showMock?: boolean;
  isGuest?: boolean;
}

export default function GalleryTab({ familyId, showMock = false, isGuest = false }: GalleryTabProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    albumId: '',
    captions: {} as Record<string, string>,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showMock) {
        const now = Date.now();
        const mockPhotos: Photo[] = [
          {
            id: 'photo-1',
            caption: 'Beautiful day at the garden',
            fileUrl: 'https://images.unsplash.com/photo-1745096227004-875407b6561b?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            thumbnailUrl: 'https://pbs.twimg.com/media/G0T0qYMXoAALduG.jpg',
            fileType: 'image/jpeg',
            createdAt: new Date(now - 86400000).toISOString(),
            uploader: { id: 'user-1', firstName: 'Ava', lastName: 'Johnson' },
            galleryId: 'album-1',
            gallery: { id: 'album-1', title: 'Summer 2024' },
            comments: [
              {
                id: 'comment-1',
                content: 'What a lovely photo!',
                createdAt: new Date(now - 43200000).toISOString(),
                author: { firstName: 'Noah', lastName: 'Williams' },
              },
            ],
          },
          {
            id: 'photo-2',
            caption: 'Family gathering',
            fileUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
            thumbnailUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300',
            fileType: 'image/jpeg',
            createdAt: new Date(now - 2 * 86400000).toISOString(),
            uploader: { id: 'user-2', firstName: 'Sophia', lastName: 'Martinez' },
            galleryId: null,
            gallery: null,
            comments: [],
          },
        ];
        setPhotos(mockPhotos);
        setAlbums([
          { id: 'album-1', name: 'Summer 2024', photoCount: 1, createdAt: new Date(now - 7 * 86400000).toISOString() },
        ]);
        setLoading(false);
        return;
      }

      if (!familyId) {
        console.log('🔍 [GalleryTab] No familyId provided');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ familyId, limit: '50' });
      if (search) params.set('search', search);
      if (selectedAlbum) params.set('albumId', selectedAlbum);

      console.log('🔍 [GalleryTab] Fetching photos...', { familyId, search, selectedAlbum });
      const res = await fetch(`/api/family/gallery?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load photos');
      const json = await res.json();
      console.log('📸 [GalleryTab] Photos received:', {
        count: json.photos?.length || 0,
        photos: json.photos,
      });
      setPhotos(json.photos ?? []);
    } catch (err: any) {
      console.error('❌ [GalleryTab] Error fetching photos:', err);
      setError(err.message ?? 'Error loading photos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      if (showMock) return;
      if (!familyId) return;

      const res = await fetch(`/api/family/gallery/albums?familyId=${familyId}`);
      if (!res.ok) throw new Error('Failed to load albums');
      const json = await res.json();
      setAlbums(json.albums ?? []);
    } catch (err: any) {
      console.error('Error loading albums:', err);
    }
  };

  useEffect(() => {
    fetchPhotos();
    fetchAlbums();
  }, [search, selectedAlbum, familyId, showMock]);

  // SSE for real-time updates
  useEffect(() => {
    if (showMock || !familyId) return;

    const es = new EventSource(`/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`);

    const parseData = (e: MessageEvent) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('photo:uploaded', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.photo) {
        setPhotos((prev) => [data.photo, ...prev]);
      }
    });

    es.addEventListener('photo:deleted', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.photoId) {
        setPhotos((prev) => prev.filter((p) => p.id !== data.photoId));
      }
    });

    es.addEventListener('photo:commented', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.photoId && data?.comment) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === data.photoId ? { ...p, comments: [...(p.comments || []), data.comment] } : p
          )
        );
        if (selectedPhoto?.id === data.photoId) {
          setSelectedPhoto((prev) =>
            prev ? { ...prev, comments: [...(prev.comments || []), data.comment] } : null
          );
        }
      }
    });

    return () => es.close();
  }, [familyId, showMock, selectedPhoto]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadForm((prev) => ({ ...prev, files }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadForm((prev) => ({ ...prev, files }));
  };

  const handleUpload = async () => {
    if (uploadForm.files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    try {
      setUploading(true);

      for (const file of uploadForm.files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('familyId', familyId ?? '');
        formData.append('caption', uploadForm.captions[file.name] ?? file.name);
        if (uploadForm.albumId) formData.append('albumId', uploadForm.albumId);

        const res = await fetch('/api/family/gallery/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
      }

      setIsUploadOpen(false);
      setUploadForm({ files: [], albumId: '', captions: {} });
      fetchPhotos();
      fetchAlbums();
    } catch (err: any) {
      alert(err.message ?? 'Error uploading photos');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      alert('Please enter an album name');
      return;
    }

    try {
      const res = await fetch('/api/family/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, name: newAlbumName.trim() }),
      });

      if (!res.ok) throw new Error('Failed to create album');

      setIsCreateAlbumOpen(false);
      setNewAlbumName('');
      fetchAlbums();
    } catch (err: any) {
      alert(err.message ?? 'Error creating album');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const res = await fetch(`/api/family/gallery/${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete photo');

      setSelectedPhoto(null);
      fetchPhotos();
      fetchAlbums();
    } catch (err: any) {
      alert(err.message ?? 'Error deleting photo');
    }
  };

  const handleAddComment = async (photoId: string) => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/family/gallery/${photoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      setNewComment('');
      fetchPhotos();
    } catch (err: any) {
      alert(err.message ?? 'Error adding comment');
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < photos.length) {
      setSelectedPhoto(photos[newIndex]);
    }
  };

  console.log('🎨 [GalleryTab] Rendering with state:', {
    loading,
    error,
    photosCount: photos.length,
    search,
    selectedAlbum,
  });

  if (loading) {
    return <LoadingState type="grid" count={6} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading gallery</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Search and Actions */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 w-full lg:max-w-2xl flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos by caption..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div className="w-full sm:w-48">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
              >
                <option value="">All Photos</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name} ({album.photoCount})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isGuest && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateAlbumOpen(true)}
              className="inline-flex items-center gap-2 bg-white border-2 border-blue-600 text-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-50 hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              <FiFolder className="w-5 h-5" />
              New Album
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              <FiUpload className="w-5 h-5" />
              Upload Photos
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiCamera className="w-6 h-6 text-blue-600" />
                Upload Photos
              </h3>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadForm({ files: [], albumId: '', captions: {} });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
              >
                <FiUpload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drag and drop photos here
                </p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">Max 10MB per file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Album Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Album (Optional)
                </label>
                <select
                  value={uploadForm.albumId}
                  onChange={(e) => setUploadForm({ ...uploadForm, albumId: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Album</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Files */}
              {uploadForm.files.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Selected Files ({uploadForm.files.length})
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {uploadForm.files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {file.type.startsWith('image/') ? (
                          <FiImage className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <FiVideo className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <input
                          type="text"
                          placeholder="Add caption..."
                          value={uploadForm.captions[file.name] ?? ''}
                          onChange={(e) =>
                            setUploadForm({
                              ...uploadForm,
                              captions: { ...uploadForm.captions, [file.name]: e.target.value },
                            })
                          }
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() =>
                            setUploadForm({
                              ...uploadForm,
                              files: uploadForm.files.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadForm.files.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                </button>
                <button
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadForm({ files: [], albumId: '', captions: {} });
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      {isCreateAlbumOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiFolder className="w-6 h-6 text-blue-600" />
                Create Album
              </h3>
              <button
                onClick={() => {
                  setIsCreateAlbumOpen(false);
                  setNewAlbumName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Album Name</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Enter album name..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateAlbum}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  Create Album
                </button>
                <button
                  onClick={() => {
                    setIsCreateAlbumOpen(false);
                    setNewAlbumName('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full h-full max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 text-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedPhoto.uploader?.firstName?.[0] ?? ''}{selectedPhoto.uploader?.lastName?.[0] ?? ''}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedPhoto.uploader?.firstName ?? 'Unknown'} {selectedPhoto.uploader?.lastName ?? 'User'}
                  </p>
                  <p className="text-sm text-gray-300">
                    {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isGuest && (
                  <button
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    className="p-3 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                )}
                <a
                  href={selectedPhoto.fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiDownload className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image and Sidebar */}
            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Navigation and Image */}
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={() => navigatePhoto('prev')}
                  disabled={photos.findIndex((p) => p.id === selectedPhoto.id) === 0}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>

                <div className="flex-1 relative aspect-video bg-black/50 rounded-xl overflow-hidden">
                  {selectedPhoto.fileType?.startsWith('image/') || !selectedPhoto.fileType ? (
                    <img
                      src={selectedPhoto.fileUrl}
                      alt={selectedPhoto.caption ?? 'Photo'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video src={selectedPhoto.fileUrl} controls className="w-full h-full object-contain" />
                  )}
                </div>

                <button
                  onClick={() => navigatePhoto('next')}
                  disabled={photos.findIndex((p) => p.id === selectedPhoto.id) === photos.length - 1}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
                >
                  <FiChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Sidebar with Caption and Comments */}
              <div className="w-80 bg-white rounded-xl p-6 flex flex-col">
                <div className="mb-4">
                  <h4 className="font-bold text-lg text-gray-900 mb-2">Caption</h4>
                  <p className="text-gray-700">{selectedPhoto.caption ?? 'No caption'}</p>
                  {selectedPhoto.gallery && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-cyan-50 text-xs font-semibold text-blue-800 border border-blue-200">
                        <FiFolder className="w-3 h-3" />
                        {selectedPhoto.gallery.title}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 border-t border-gray-200 pt-4 flex flex-col">
                  <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                    <FiMessageSquare className="w-5 h-5" />
                    Comments ({selectedPhoto.comments?.length || 0})
                  </h4>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {!selectedPhoto.comments || selectedPhoto.comments.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                    ) : (
                      selectedPhoto.comments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {`${comment.author.firstName?.[0] || ''}${comment.author.lastName?.[0] || ''}`}
                            </div>
                            <span className="text-xs font-semibold text-gray-900">
                              {comment.author.firstName} {comment.author.lastName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  {!isGuest && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && !e.shiftKey && handleAddComment(selectedPhoto.id)
                        }
                        placeholder="Add a comment..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAddComment(selectedPhoto.id)}
                        className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-colors"
                      >
                        <FiMessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 && !search && !selectedAlbum ? (
        <EmptyState
          icon={FiCamera}
          title="No photos yet"
          description="Upload photos and videos to share precious moments with your family. Create albums to organize your memories."
          actionLabel="Upload First Photo"
          onAction={() => !isGuest && setIsUploadOpen(true)}
        />
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiCamera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No photos found matching your filters</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group cursor-pointer rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={photo.thumbnailUrl ?? photo.fileUrl}
                  alt={photo.caption ?? 'Photo'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="text-sm font-semibold line-clamp-2">{photo.caption ?? 'Untitled'}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                      {photo.uploader?.firstName?.[0] ?? ''}{photo.uploader?.lastName?.[0] ?? ''}
                    </div>
                    <span className="font-medium truncate">
                      {photo.uploader?.firstName ?? 'Unknown'} {photo.uploader?.lastName ?? 'User'}
                    </span>
                  </div>
                  <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                </div>
                {photo.gallery && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-100 to-cyan-50 text-[10px] font-semibold text-blue-800 border border-blue-200">
                      <FiFolder className="w-2.5 h-2.5" />
                      {photo.gallery.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
