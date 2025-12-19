'use client';

import { useState } from 'react';
import { useInquiryFollowUps } from '@/hooks/useInquiries';
import { Calendar, Clock, Mail, MessageSquare, Phone, CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { FollowUpScheduler } from './FollowUpScheduler';

interface FollowUpsTabProps {
  inquiryId: string;
}

export function FollowUpsTab({ inquiryId }: FollowUpsTabProps) {
  const { followUps, isLoading, error, mutate } = useInquiryFollowUps(inquiryId);
  const [showScheduler, setShowScheduler] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="w-5 h-5" />;
      case 'SMS':
        return <MessageSquare className="w-5 h-5" />;
      case 'PHONE_CALL':
        return <Phone className="w-5 h-5" />;
      case 'TASK':
      case 'REMINDER':
        return <Clock className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'SENT':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (followUp: any) => {
    if (followUp.status === 'COMPLETED' || followUp.status === 'CANCELLED') {
      return false;
    }
    return new Date(followUp.scheduledFor) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading follow-ups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error loading follow-ups</p>
        <p className="text-red-600 text-sm mt-1">{error.message || 'Please try again'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowScheduler(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* Follow-ups List */}
      <div className="space-y-4">
        {!followUps || followUps.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No follow-ups scheduled</p>
            <p className="text-sm text-gray-500 mt-1">
              Schedule a follow-up to track next actions
            </p>
          </div>
        ) : (
          followUps.map((followUp) => {
            const overdue = isOverdue(followUp);
            return (
              <div
                key={followUp.id}
                className={`bg-white border rounded-lg p-4 ${
                  overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={overdue ? 'text-red-600' : 'text-blue-600'}>
                      {getTypeIcon(followUp.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {followUp.subject || `${followUp.type} Follow-up`}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(followUp.scheduledFor), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(followUp.scheduledFor), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      overdue ? 'OVERDUE' : followUp.status
                    )}`}
                  >
                    {overdue ? 'OVERDUE' : followUp.status}
                  </span>
                </div>

                {/* Content */}
                {followUp.content && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {followUp.content}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {followUp.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}

                {/* Completion Info */}
                {followUp.completedAt && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    <p>
                      Completed on {format(new Date(followUp.completedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Follow-up Scheduler Modal */}
      {showScheduler && (
        <FollowUpScheduler
          inquiryId={inquiryId}
          onClose={() => {
            setShowScheduler(false);
            mutate(); // Refresh follow-ups after scheduling
          }}
        />
      )}
    </div>
  );
}
