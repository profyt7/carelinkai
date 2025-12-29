"use client";
import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FiTrash2, FiUpload } from 'react-icons/fi';
import { Camera } from 'lucide-react';
import Image from 'next/image';

interface ResidentPhotoUploadProps {
  residentId: string;
  residentName: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdated: (photoUrl: string | null) => void;
}

export function ResidentPhotoUpload({ 
  residentId, 
  residentName,
  currentPhotoUrl, 
  onPhotoUpdated 
}: ResidentPhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`/api/residents/${residentId}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setPhotoUrl(data.photoUrl);
      setPreview(null);
      onPhotoUpdated(data.photoUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to remove this photo?')) return;

    setUploading(true);
    try {
      const res = await fetch(`/api/residents/${residentId}/photo`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }

      setPhotoUrl(null);
      onPhotoUpdated(null);
      toast.success('Photo removed successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview || photoUrl;
  const initials = (residentName || '')
    .split(' ')
    .map(n => n[0] || '')
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Photo Display */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
          {displayUrl ? (
            <Image 
              src={displayUrl} 
              alt={residentName}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl font-semibold text-neutral-500">{initials}</span>
          )}
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <Camera size={16} />
          {photoUrl ? 'Change Photo' : 'Upload Photo'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        
        {photoUrl && !uploading && (
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            <FiTrash2 size={16} />
            Remove
          </button>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-neutral-500 text-center max-w-xs">
        Upload a photo (JPEG, PNG, or WebP). Maximum file size: 5MB.
      </p>
    </div>
  );
}
