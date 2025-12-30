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
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  // Confidence-based ring colors
  const confidenceRingClasses: Record<string, string> = {
    green: 'ring-2 ring-green-500 ring-offset-1',
    yellow: 'ring-2 ring-yellow-500 ring-offset-1',
    red: 'ring-2 ring-red-500 ring-offset-1',
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
            confColor === 'green' ? 'text-green-600' :
            confColor === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
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
      <div className="invisible group-hover:visible absolute z-50 w-64 p-3 mt-2 text-sm bg-gray-900 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="space-y-2">
          {score !== null ? (
            <div>
              <span className="font-semibold">Confidence:</span>{' '}
              <span className={`font-bold ${
                confColor === 'green' ? 'text-green-400' :
                confColor === 'yellow' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {score.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div>
              <span className="font-semibold text-gray-400">No confidence score available</span>
            </div>
          )}
          
          {reasoning && (
            <div>
              <span className="font-semibold">Reasoning:</span>
              <p className="mt-1 text-xs text-gray-300">{reasoning}</p>
            </div>
          )}
          
          <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
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
