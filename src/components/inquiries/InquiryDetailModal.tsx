'use client';

import { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import { Inquiry } from '@/types/inquiry';
import { format } from 'date-fns';
import { CommunicationHistory } from './CommunicationHistory';
import { FollowUpsTab } from './FollowUpsTab';

interface InquiryDetailModalProps {
  inquiry: Inquiry;
  onClose: () => void;
}

export function InquiryDetailModal({ inquiry, onClose }: InquiryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'followups' | 'activity'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'communication', label: 'Communication' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-4xl sm:rounded-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {inquiry.contactName || 'Inquiry Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              for {inquiry.careRecipientName || 'Care Recipient'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-sm text-gray-900">{inquiry.contactName || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-900">{inquiry.contactEmail || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-sm text-gray-900">{inquiry.contactPhone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Home</p>
                      <p className="text-sm text-gray-900">
                        {inquiry.home?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Recipient Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Care Recipient
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-sm text-gray-900">{inquiry.careRecipientName || 'N/A'}</p>
                  </div>

                  {inquiry.careRecipientAge && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Age</p>
                      <p className="text-sm text-gray-900">{inquiry.careRecipientAge}</p>
                    </div>
                  )}

                  {inquiry.careNeeds && inquiry.careNeeds.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Care Needs</p>
                      <div className="flex flex-wrap gap-2">
                        {inquiry.careNeeds.map((need, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inquiry Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Inquiry Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className="text-sm text-gray-900">{inquiry.status.replace(/_/g, ' ')}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Urgency</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      inquiry.urgency === 'URGENT' ? 'bg-red-100 text-red-800' :
                      inquiry.urgency === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      inquiry.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {inquiry.urgency}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Source</p>
                    <p className="text-sm text-gray-900">{inquiry.source}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Created</p>
                    <p className="text-sm text-gray-900">
                      {format(new Date(inquiry.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {inquiry.tourDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tour Date</p>
                        <p className="text-sm text-gray-900">
                          {format(new Date(inquiry.tourDate), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}

                  {inquiry.assignedTo && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Assigned To</p>
                      <p className="text-sm text-gray-900">
                        {inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}
                      </p>
                    </div>
                  )}
                </div>

                {inquiry.message && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {inquiry.message}
                      </p>
                    </div>
                  </div>
                )}

                {inquiry.additionalInfo && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Info</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {inquiry.additionalInfo}
                      </p>
                    </div>
                  </div>
                )}

                {inquiry.internalNotes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Internal Notes</p>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {inquiry.internalNotes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <CommunicationHistory inquiryId={inquiry.id} />
          )}

          {activeTab === 'followups' && (
            <FollowUpsTab inquiryId={inquiry.id} />
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Activity log coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
