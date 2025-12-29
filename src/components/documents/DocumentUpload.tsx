'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  formatFileSize,
} from '@/lib/types/documents';

interface DocumentUploadProps {
  residentId?: string;
  inquiryId?: string;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function DocumentUpload({
  residentId,
  inquiryId,
  onUploadComplete,
  onClose,
}: DocumentUploadProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('GENERAL');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validate files
      const validFiles = acceptedFiles.filter((file) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: File too large (max 10MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setIsUploading(true);

      // Initialize uploading files
      const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadingFiles(newUploadingFiles);

      // Upload files one by one
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', documentType);
          if (residentId) formData.append('residentId', residentId);
          if (inquiryId) formData.append('inquiryId', inquiryId);

          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          // Update status to success
          setUploadingFiles((prev) =>
            prev.map((uf, idx) =>
              idx === i ? { ...uf, progress: 100, status: 'success' } : uf
            )
          );

          toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
          console.error('Upload error:', error);
          setUploadingFiles((prev) =>
            prev.map((uf, idx) =>
              idx === i
                ? { ...uf, status: 'error', error: 'Upload failed' }
                : uf
            )
          );
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      setIsUploading(false);

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Clear uploading files after a delay
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);
    },
    [documentType, residentId, inquiryId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      {/* Document Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop files here...</p>
        ) : (
          <>
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported: PDF, JPG, PNG, GIF, WebP (max 10MB)
            </p>
          </>
        )}
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Uploading Files</h3>
          {uploadingFiles.map((uf, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <FileText className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uf.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uf.file.size)}
                </p>
              </div>
              {uf.status === 'uploading' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {uf.status === 'success' && (
                <span className="text-green-600 text-sm font-medium">✓</span>
              )}
              {uf.status === 'error' && (
                <span className="text-red-600 text-sm font-medium">✗</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
