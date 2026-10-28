'use client';

import React from 'react';
import { DocumentType } from '@prisma/client';

interface ClassificationBadgeProps {
  documentType: DocumentType;
  confidence: number | null | undefined;
  reasoning?: string;
  autoClassified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showConfidence?: boolean;
}

const documentTypeConfig: Record<DocumentType, { label: string; icon: string; color: string }> = {
  MEDICAL_RECORD: { label: 'Medical Record', icon: '🏥', color: 'blue' },
  INSURANCE: { label: 'Insurance', icon: '🛡️', color: 'green' },
  IDENTIFICATION: { label: 'Identification', icon: '🪪', color: 'purple' },
  FINANCIAL: { label: 'Financial', icon: '💰', color: 'yellow' },
  LEGAL: { label: 'Legal', icon: '⚖️', color: 'red' },
  ASSESSMENT_FORM: { label: 'Assessment Form', icon: '📋', color: 'indigo' },
  EMERGENCY_CONTACT: { label: 'Emergency Contact', icon: '🚨', color: 'orange' },
  GENERAL: { label: 'General', icon: '📄', color: 'gray' },
};

const confidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'green';
  if (confidence >= 60) return 'yellow';
  return 'red';
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2',
};

export default function ClassificationBadge({
  documentType,
  confidence,
  reasoning,
  autoClassified = false,
  size = 'md',
  showConfidence = true,
}: ClassificationBadgeProps) {
  const config = documentTypeConfig[documentType];
  
  // Handle null/undefined confidence
  const score = confidence !== null && confidence !== undefined ? Math.max(0, Math.min(100, confidence)) : null;
  const confColor = score !== null ? confidenceColor(score) : 'gray';
  
  // Base document type colors
  const typeColorClasses: Record<string, string> = {
    blue: 'bg-primary-100 text-primary-800 border-primary-300',
    green: 'bg-success-100 text-success-800 border-success-300',
    purple: 'bg-secondary-100 text-secondary-800 border-secondary-300',
    yellow: 'bg-warning-100 text-warning-800 border-warning-300',
    red: 'bg-error-100 text-error-800 border-error-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    orange: 'bg-warning-100 text-warning-800 border-warning-300',
    gray: 'bg-neutral-100 text-neutral-800 border-neutral-300',
  };

  // Confidence-based ring colors
  const confidenceRingClasses: Record<string, string> = {
    green: 'ring-2 ring-success-500 ring-offset-1',
    yellow: 'ring-2 ring-warning-500 ring-offset-1',
    red: 'ring-2 ring-error-500 ring-offset-1',
    gray: '',
  };

  // Get confidence icon
  const getConfidenceIcon = () => {
    if (score === null) return null;
    if (score >= 80) return '✓';
    if (score >= 60) return '⚠';
    return '!';
  };

  const confidenceIcon = getConfidenceIcon();

  return (
    <div className="group relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-md border font-medium
          ${typeColorClasses[config.color]}
          ${confidenceRingClasses[confColor]}
          ${sizeClasses[size]}
          transition-all duration-200 hover:shadow-md cursor-help
        `}
        title={`${config.label}${score !== null ? ` - Confidence: ${score.toFixed(0)}%` : ''}${autoClassified ? ' (AI Classified)' : ''}`}
      >
        <span className="text-base">{config.icon}</span>
        <span>{config.label}</span>
        {showConfidence && confidenceIcon && (
          <span className={`ml-0.5 font-bold ${
            confColor === 'green' ? 'text-success-600' :
            confColor === 'yellow' ? 'text-warning-600' :
            'text-error-600'
          }`}>
            {confidenceIcon}
          </span>
        )}
        {autoClassified && (
          <span className="text-xs opacity-70" title="Auto-classified by AI">
            🤖
          </span>
        )}
      </div>

      {/* Tooltip */}
      <div className="invisible group-hover:visible absolute z-50 w-64 p-3 mt-2 text-sm bg-neutral-900 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="space-y-2">
          {score !== null ? (
            <div>
              <span className="font-semibold">Confidence:</span>{' '}
              <span className={`font-bold ${
                confColor === 'green' ? 'text-success-400' :
                confColor === 'yellow' ? 'text-warning-400' : 'text-error-400'
              }`}>
                {score.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div>
              <span className="font-semibold text-neutral-400">No confidence score available</span>
            </div>
          )}
          
          {reasoning && (
            <div>
              <span className="font-semibold">Reasoning:</span>
              <p className="mt-1 text-xs text-neutral-300">{reasoning}</p>
            </div>
          )}
          
          <div className="text-xs text-neutral-400 border-t border-neutral-700 pt-2">
            {autoClassified ? (
              <span>✨ Auto-classified by AI</span>
            ) : (
              <span>👤 Manually classified</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
