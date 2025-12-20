'use client';

import { useState } from 'react';
import { useInquiryResponses } from '@/hooks/useInquiries';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { AIResponseGenerator } from './AIResponseGenerator';
import { ResponseItem } from './ResponseItem';

interface CommunicationHistoryProps {
  inquiryId: string;
}

export function CommunicationHistory({ inquiryId }: CommunicationHistoryProps) {
  const { responses, isLoading, error, mutate } = useInquiryResponses(inquiryId);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const handleResponseUpdate = () => {
    // Refresh the responses list after any update
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading communications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error loading communications</p>
        <p className="text-red-600 text-sm mt-1">{error.message || 'Please try again'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAIGenerator(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate AI Response
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {!responses || responses.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No communications yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start by generating an AI response
            </p>
          </div>
        ) : (
          responses.map((response) => (
            <ResponseItem
              key={response.id}
              response={response}
              onUpdate={handleResponseUpdate}
            />
          ))
        )}
      </div>

      {/* AI Response Generator Modal */}
      {showAIGenerator && (
        <AIResponseGenerator
          inquiryId={inquiryId}
          onClose={() => {
            setShowAIGenerator(false);
            handleResponseUpdate();
          }}
        />
      )}
    </div>
  );
}
