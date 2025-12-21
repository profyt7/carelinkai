'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiFileText, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { DocumentType, ValidationStatus } from '@prisma/client';
import ClassificationBadge from '@/components/documents/ClassificationBadge';
import ConfidenceIndicator from '@/components/documents/ConfidenceIndicator';
import ValidationStatusComponent from '@/components/documents/ValidationStatus';

interface DocumentUploadModalProps {
  residentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'MEDICAL_RECORD', label: 'Medical Record' },
  { value: 'CARE_PLAN', label: 'Care Plan' },
  { value: 'INSURANCE', label: 'Insurance Document' },
  { value: 'ADVANCE_DIRECTIVE', label: 'Advance Directive' },
  { value: 'MEDICATION_LIST', label: 'Medication List' },
  { value: 'ASSESSMENT_REPORT', label: 'Assessment Report' },
  { value: 'INCIDENT_REPORT', label: 'Incident Report' },
  { value: 'PHOTO_ID', label: 'Photo ID' },
  { value: 'EMERGENCY_CONTACT', label: 'Emergency Contact Info' },
  { value: 'OTHER', label: 'Other' },
];

export function DocumentUploadModal({
  residentId,
  isOpen,
  onClose,
  onSuccess
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('MEDICAL_RECORD');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [classificationResult, setClassificationResult] = useState<{
    documentType: DocumentType;
    confidence: number;
    reasoning?: string;
    validationStatus?: ValidationStatus;
    validationErrors?: any;
  } | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setError('');
      }
    },
    onDropRejected: (rejections) => {
      if (rejections[0]?.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB.');
      } else {
        setError('Invalid file type. Please upload PDF, images, or Word documents.');
      }
    }
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadResponse.json();
      setUploadProgress(50);

      // Create document record
      const documentResponse = await fetch(`/api/operator/residents/${residentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: url,
          fileType: file.type,
          documentType,
          description,
          fileSize: file.size,
        }),
      });

      if (!documentResponse.ok) {
        throw new Error('Failed to save document');
      }

      const documentData = await documentResponse.json();
      setUploadProgress(100);
      
      // Show classification result if available
      if (documentData.document) {
        setClassificationResult({
          documentType: documentData.document.documentType,
          confidence: documentData.document.classificationConfidence || 0,
          reasoning: documentData.document.classificationReasoning,
          validationStatus: documentData.document.validationStatus,
          validationErrors: documentData.document.validationErrors,
        });
        
        // Wait 3 seconds to show result, then close
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 3000);
      } else {
        onSuccess();
        handleClose();
      }
    } catch (err) {
      setError('Failed to upload document. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDocumentType('MEDICAL_RECORD');
    setDescription('');
    setUploadProgress(0);
    setError('');
    setClassificationResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Upload Document</h3>
          <button 
            onClick={handleClose} 
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
            disabled={uploading}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-neutral-300 hover:border-neutral-400'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <FiUpload className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FiFileText className="w-5 h-5 text-primary-500" />
              <span className="text-sm font-medium text-neutral-900">{file.name}</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-600 mb-1">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-xs text-neutral-500">
                PDF, images, or Word documents (max 10MB)
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Document Type */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={uploading}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this document..."
            disabled={uploading}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Upload Progress */}
        {uploading && !classificationResult && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-neutral-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Classification Result */}
        {classificationResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <FiCheckCircle className="w-5 h-5" />
              <span>Upload Complete! AI Classification:</span>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Classified As:</label>
                <ClassificationBadge
                  documentType={classificationResult.documentType}
                  confidence={classificationResult.confidence}
                  reasoning={classificationResult.reasoning}
                  autoClassified={true}
                />
              </div>

              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Confidence:</label>
                <ConfidenceIndicator
                  confidence={classificationResult.confidence}
                  variant="bar"
                  size="sm"
                />
              </div>

              {classificationResult.validationStatus && (
                <div>
                  <label className="text-sm text-neutral-600 mb-1 block">Validation:</label>
                  <ValidationStatusComponent
                    status={classificationResult.validationStatus}
                    errors={classificationResult.validationErrors}
                    showDetails={true}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-600 mt-2">
              Closing automatically in 3 seconds...
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
