'use client';

import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import EmptyState from './EmptyState';

interface MessagesTabProps {
  familyId: string | null;
}

export default function MessagesTab({ familyId }: MessagesTabProps) {
  // Placeholder for now - will be completed in Phase 3
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <EmptyState
        icon={FiMessageSquare}
        title="Messages Coming Soon"
        description="Secure messaging with caregivers and operators will be available here. For now, please use the dedicated messages page."
        actionLabel="Open Messages Page"
        onAction={() => window.location.href = '/messages'}
      />
    </div>
  );
}
