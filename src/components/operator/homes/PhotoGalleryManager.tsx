"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiTrash2, FiStar, FiUpload } from 'react-icons/fi';

type Photo = {
  id: string;
  url: string;
  caption?: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type PhotoGalleryManagerProps = {
  homeId: string;
  photos: Photo[];
  onPhotosChange: () => void;
};

export default function PhotoGalleryManager({
  homeId,
  photos,
  onPhotosChange,
}: PhotoGalleryManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrimary', photos.length === 0 ? 'true' : 'false');

      const res = await fetch(`/api/operator/homes/${homeId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload photo');
      }

      toast.success('Photo uploaded successfully');
      onPhotosChange();
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete photo');
      }

      toast.success('Photo deleted');
      onPhotosChange();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    setSettingPrimaryId(photoId);
    try {
      const res = await fetch(`/api/operator/homes/${homeId}/photos/${photoId}`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to set primary photo');
      }

      toast.success('Primary photo updated');
      onPhotosChange();
    } catch (e: any) {
      toast.error(e.message || 'Failed to set primary photo');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">Photo Gallery</h3>
      
      <div className="text-sm text-neutral-600">
        <p>Upload photos of your home to help families visualize the space.</p>
        <ul className="mt-2 list-disc list-inside text-xs text-neutral-500">
          <li>Maximum file size: 10MB</li>
          <li>Supported formats: JPG, PNG, WebP</li>
          <li>First photo will be set as primary by default</li>
          <li>Click the star icon to set a photo as primary</li>
        </ul>
      </div>

      {/* Upload Button */}
      <div>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 cursor-pointer transition disabled:bg-neutral-400">
          <FiUpload className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 aspect-square"
            >
              {/* Photo */}
              <img
                src={photo.url}
                alt={photo.caption || 'Home photo'}
                className="w-full h-full object-cover"
              />

              {/* Primary Badge */}
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                  <FiStar className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => handleSetPrimary(photo.id)}
                  disabled={photo.isPrimary || settingPrimaryId === photo.id}
                  className="p-1.5 bg-white/90 rounded-md hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Set as primary"
                >
                  <FiStar
                    className={`h-4 w-4 ${
                      photo.isPrimary ? 'fill-primary-600 text-primary-600' : 'text-neutral-700'
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deletingId === photo.id}
                  className="p-1.5 bg-white/90 rounded-md hover:bg-red-50 transition disabled:opacity-50"
                  title="Delete photo"
                >
                  <FiTrash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>

              {/* Loading Overlay */}
              {(deletingId === photo.id || settingPrimaryId === photo.id) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
          <FiUpload className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 mb-1">No photos yet</p>
          <p className="text-xs text-neutral-500">Upload your first photo to get started</p>
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-neutral-500">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} uploaded
        </p>
      )}
    </div>
  );
}
