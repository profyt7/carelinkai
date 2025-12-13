'use client';

import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import EmptyState from './EmptyState';

interface EmergencyTabProps {
  familyId: string | null;
  isGuest?: boolean;
}

export default function EmergencyTab({ familyId, isGuest = false }: EmergencyTabProps) {
  // Placeholder for now - will be completed in Phase 3
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <EmptyState
        icon={FiAlertCircle}
        title="Emergency Contacts"
        description="Configure who we contact in case of emergencies. Set up your emergency contact list and notification preferences."
        actionLabel="Configure Preferences"
        onAction={() => window.location.href = '/family/emergency'}
      />
      {isGuest && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 border border-gray-200 text-center">
          🚫 Note: As a guest, you can view but not modify emergency preferences.
        </div>
      )}
    </div>
  );
}
