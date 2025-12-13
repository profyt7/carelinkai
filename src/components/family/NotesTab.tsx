'use client';

import React from 'react';
import { FiEdit3 } from 'react-icons/fi';
import EmptyState from './EmptyState';

interface NotesTabProps {
  familyId: string | null;
  onAddNoteClick?: () => void;
}

export default function NotesTab({ familyId, onAddNoteClick }: NotesTabProps) {
  // Placeholder for now - will be completed in Phase 3
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <EmptyState
        icon={FiEdit3}
        title="No notes yet"
        description="Create notes to keep track of important information, care updates, and personal observations about your loved one."
        actionLabel="Create First Note"
        onAction={onAddNoteClick}
      />
    </div>
  );
}
