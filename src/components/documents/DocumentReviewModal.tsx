'use client';

import React, { useState } from 'react';
import { Document, DocumentType, ValidationStatus } from '@prisma/client';
import ClassificationBadge from './ClassificationBadge';
import ConfidenceIndicator from './ConfidenceIndicator';
import ValidationStatusComponent from './ValidationStatus';
import { formatDistanceToNow } from 'date-fns';

interface DocumentReviewModalProps {
  document: Document & { 
    classificationConfidence?: number | null; 
    classificationReasoning?: string | null; 
    autoClassified?: boolean | null; 
    validationStatus?: ValidationStatus | null; 
    validationErrors?: any; 
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (documentId: string, newType?: DocumentType, notes?: string) => Promise<void>;
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'MEDICAL_RECORD', label: 'Medical Record' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'IDENTIFICATION', label: 'Identification' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'ASSESSMENT_FORM', label: 'Assessment Form' },
  { value: 'EMERGENCY_CONTACT', label: 'Emergency Contact' },
  { value: 'GENERAL', label: 'General' },
];

export default function DocumentReviewModal({
  document,
  isOpen,
  onClose,
  onSave,
}: DocumentReviewModalProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>(document.type);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (action: 'confirm' | 'override') => {
    setSaving(true);
    try {
      if (action === 'confirm') {
        await onSave(document.id, undefined, notes);
      } else {
        await onSave(document.id, selectedType, notes);
      }
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save review. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    setShowOverride(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Document Review</h2>
              <p className="text-sm text-gray-600 mt-1">{document.fileName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Document preview */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Document Preview</h3>
                  
                  {/* Document preview placeholder */}
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-6xl">📄</span>
                      <p className="text-sm text-gray-600 mt-2">
                        {document.mimeType || 'Document'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {document.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                  </div>

                  {/* Download button */}
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <span>⬇️</span>
                    <span>Download Original</span>
                  </a>
                </div>

                {/* Document metadata */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Uploaded</dt>
                      <dd className="text-gray-900 font-medium">
                        {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">File Type</dt>
                      <dd className="text-gray-900 font-medium">{document.mimeType || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">File Size</dt>
                      <dd className="text-gray-900 font-medium">
                        {document.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Right column: Classification and review */}
              <div className="space-y-4">
                {/* AI Classification */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">AI Classification</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Classified As:</label>
                      <ClassificationBadge
                        documentType={document.type}
                        confidence={document.classificationConfidence || 0}
                        reasoning={document.classificationReasoning || undefined}
                        autoClassified={document.autoClassified || false}
                        size="lg"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Confidence Score:</label>
                      <ConfidenceIndicator
                        confidence={document.classificationConfidence || 0}
                        variant="bar"
                        size="md"
                      />
                    </div>

                    {document.classificationReasoning && (
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">AI Reasoning:</label>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                          {document.classificationReasoning}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation Status */}
                {document.validationStatus && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Validation Status</h3>
                    <ValidationStatusComponent
                      status={document.validationStatus}
                      errors={document.validationErrors}
                      showDetails={true}
                    />
                  </div>
                )}

                {/* Classification Override */}
                {showOverride && (
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Override Classification</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Correct Document Type:
                        </label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {documentTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Reason for Override (Optional):
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Explain why you're changing the classification..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Review Notes */}
                {!showOverride && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Review Notes (Optional)</h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this document..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {!showOverride && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Incorrect Classification
                  </button>
                  <button
                    onClick={() => handleSave('confirm')}
                    disabled={saving}
                    className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Confirm & Approve'}
                  </button>
                </>
              )}

              {showOverride && (
                <>
                  <button
                    onClick={() => setShowOverride(false)}
                    disabled={saving}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleSave('override')}
                    disabled={saving}
                    className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Override'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
