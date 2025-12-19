'use client';

import { useState } from 'react';
import { useInquiryResponses } from '@/hooks/useInquiries';
import { Mail, MessageSquare, Phone, Send, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AIResponseGenerator } from './AIResponseGenerator';

interface CommunicationHistoryProps {
  inquiryId: string;
}

export function CommunicationHistory({ inquiryId }: CommunicationHistoryProps) {
  const { responses, isLoading, error } = useInquiryResponses(inquiryId);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-5 h-5" />;
      case 'SMS':
        return <MessageSquare className="w-5 h-5" />;
      case 'PHONE':
        return <Phone className="w-5 h-5" />;
      default:
        return <Send className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'FAILED':
      case 'BOUNCED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            <div key={response.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    {getChannelIcon(response.channel)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {response.subject || `${response.channel} ${response.type}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {response.sentAt
                        ? format(new Date(response.sentAt), 'MMM d, yyyy h:mm a')
                        : 'Not sent yet'}
                    </p>
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(response.status)}`}>
                  {response.status}
                </span>
              </div>

              {/* Content */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {response.content}
                </p>
              </div>

              {/* Metadata */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>Type: {response.type}</span>
                <span>Channel: {response.channel}</span>
                {response.toAddress && <span>To: {response.toAddress}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Response Generator Modal */}
      {showAIGenerator && (
        <AIResponseGenerator
          inquiryId={inquiryId}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
}
