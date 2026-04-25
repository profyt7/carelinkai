'use client';

import React from 'react';
import { Document, DocumentType, ValidationStatus, ReviewStatus } from '@prisma/client';
import ClassificationBadge from './ClassificationBadge';
import ConfidenceIndicator from './ConfidenceIndicator';
import ValidationStatusComponent from './ValidationStatus';
import { formatDistanceToNow } from 'date-fns';

interface DocumentCardProps {
  document: Document & { classificationConfidence?: number | null; classificationReasoning?: string | null; autoClassified?: boolean | null; validationStatus?: ValidationStatus | null; validationErrors?: any; reviewStatus?: ReviewStatus | null };
  onReview?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  compact?: boolean;
}

export default function DocumentCard({
  document,
  onReview,
  onDownload,
  onDelete,
  compact = false,
}: DocumentCardProps) {
  const needsReview = document.reviewStatus === 'PENDING_REVIEW' || 
                      document.validationStatus === 'NEEDS_REVIEW' || 
                      (document.classificationConfidence && document.classificationConfidence < 80);

  const fileSize = document.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : 'Unknown size';
  const uploadedAgo = formatDistanceToNow(new Date(document.createdAt), { addSuffix: true });

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-lg hover:shadow-md transition-shadow">
        {/* File icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">📄</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-neutral-900 truncate">
              {document.fileName}
            </h4>
            {needsReview && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-error-700 bg-error-100 rounded-full">
                Review
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ClassificationBadge
              documentType={document.type}
              confidence={document.classificationConfidence || 0}
              size="sm"
            />
            {document.classificationConfidence !== null && document.classificationConfidence !== undefined && (
              <ConfidenceIndicator
                confidence={document.classificationConfidence}
                showLabel={false}
                size="sm"
                variant="badge"
              />
            )}
            <span className="text-xs text-neutral-500">{fileSize}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {needsReview && onReview && (
            <button
              onClick={() => onReview(document.id)}
              className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded hover:bg-primary-200"
            >
              Review
            </button>
          )}
          {onDownload && (
            <button
              onClick={() => onDownload(document.id)}
              className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 rounded"
              title="Download"
            >
              ⬇️
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header with review badge */}
      {needsReview && (
        <div className="bg-error-50 border-b border-error-200 px-4 py-2 flex items-center gap-2">
          <span className="text-error-600 font-semibold text-sm">⚠️ Needs Review</span>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 space-y-3">
        {/* File preview placeholder */}
        <div className="aspect-[4/3] bg-neutral-100 rounded-lg flex items-center justify-center">
          <span className="text-6xl">📄</span>
        </div>

        {/* File info */}
        <div>
          <h3 className="text-base font-semibold text-neutral-900 truncate" title={document.fileName ?? undefined}>
            {document.fileName}
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            {fileSize} • Uploaded {uploadedAgo}
          </p>
        </div>

        {/* Classification */}
        <div className="space-y-2">
          <ClassificationBadge
            documentType={document.type}
            confidence={document.classificationConfidence || 0}
            reasoning={document.classificationReasoning || undefined}
            autoClassified={document.autoClassified || false}
          />
          
          <ConfidenceIndicator
            confidence={document.classificationConfidence || 0}
            size="sm"
            variant="bar"
          />
        </div>

        {/* Validation status */}
        {document.validationStatus && (
          <ValidationStatusComponent
            status={document.validationStatus}
            errors={document.validationErrors}
            showDetails={true}
          />
        )}

        {/* Review status */}
        {document.reviewStatus && document.reviewStatus !== 'NOT_REQUIRED' && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border-l-4 ${
            document.reviewStatus === 'REVIEWED'
              ? 'bg-success-50 border-success-500 text-success-700'
              : 'bg-warning-50 border-warning-500 text-warning-700'
          }`}>
            <span className="text-base font-bold">
              {document.reviewStatus === 'REVIEWED' ? '✓' : '⏳'}
            </span>
            <div className="flex-1">
              <div className="font-semibold">
                {document.reviewStatus === 'REVIEWED' ? 'Reviewed' : 'Pending Review'}
              </div>
              {document.reviewStatus === 'REVIEWED' && document.reviewedAt && (
                <div className="text-xs opacity-75">
                  {formatDistanceToNow(new Date(document.reviewedAt), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {needsReview && onReview && (
            <button
              onClick={() => onReview(document.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Review Document
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={() => onDownload(document.id)}
              className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
              title="Download"
            >
              <span className="text-lg">⬇️</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(document.id)}
              className="p-2 text-neutral-600 hover:text-error-600 hover:bg-white rounded-lg transition-colors"
              title="Delete"
            >
              <span className="text-lg">🗑️</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
