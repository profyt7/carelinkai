'use client';

import { Inquiry, InquiryUrgency, URGENCY_COLORS } from '@/types/inquiry';
import { format } from 'date-fns';
import { 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface InquiryCardProps {
  inquiry: Inquiry;
  onClick?: () => void;
}

export function InquiryCard({ inquiry, onClick }: InquiryCardProps) {
  const urgencyColor = URGENCY_COLORS[inquiry.urgency];
  
  const urgencyClasses = {
    red: 'border-l-4 border-l-red-500 bg-red-50',
    orange: 'border-l-4 border-l-orange-500 bg-orange-50',
    yellow: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    green: 'border-l-4 border-l-green-500 bg-green-50',
  };

  const urgencyBadgeClasses = {
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
  };

  const baseClasses = urgencyClasses[urgencyColor] || 'border-l-4 border-l-gray-300';
  const badgeClasses = urgencyBadgeClasses[urgencyColor] || 'bg-gray-100 text-gray-800';

  return (
    <div
      className={`${baseClasses} bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            {inquiry.contactName || 'Unknown Contact'}
          </h3>
          <p className="text-xs text-gray-600">
            for {inquiry.careRecipientName || 'Care Recipient'}
          </p>
        </div>
        <span className={`${badgeClasses} text-xs px-2 py-1 rounded-full font-medium`}>
          {inquiry.urgency}
        </span>
      </div>

      {/* Care Recipient Info */}
      {inquiry.careRecipientAge && (
        <div className="flex items-center gap-2 mb-2">
          <User className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600">
            Age {inquiry.careRecipientAge}
          </span>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-1 mb-3">
        {inquiry.contactEmail && (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600 truncate">
              {inquiry.contactEmail}
            </span>
          </div>
        )}
        {inquiry.contactPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {inquiry.contactPhone}
            </span>
          </div>
        )}
      </div>

      {/* Home Info */}
      {inquiry.home && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="truncate">{inquiry.home.name}</span>
        </div>
      )}

      {/* Tour Date */}
      {inquiry.tourDate && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-purple-50 rounded">
          <Calendar className="w-3 h-3 text-purple-600" />
          <span className="text-xs text-purple-700 font-medium">
            Tour: {format(new Date(inquiry.tourDate), 'MMM d, h:mm a')}
          </span>
        </div>
      )}

      {/* Care Needs */}
      {inquiry.careNeeds && inquiry.careNeeds.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {inquiry.careNeeds.slice(0, 2).map((need, idx) => (
              <span
                key={idx}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
              >
                {need}
              </span>
            ))}
            {inquiry.careNeeds.length > 2 && (
              <span className="text-xs text-gray-500">
                +{inquiry.careNeeds.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(inquiry.createdAt), 'MMM d')}</span>
        </div>
        
        {/* Assigned Operator */}
        {inquiry.assignedTo && (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              {inquiry.assignedTo.firstName[0]}{inquiry.assignedTo.lastName[0]}
            </div>
          </div>
        )}
        
        {/* Requires Attention Indicator */}
        {inquiry.urgency === InquiryUrgency.URGENT && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Source Badge */}
      <div className="mt-2">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {inquiry.source}
        </span>
      </div>
    </div>
  );
}
