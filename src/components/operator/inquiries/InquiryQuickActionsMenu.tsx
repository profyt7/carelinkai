'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FiMoreVertical, 
  FiUserPlus, 
  FiCalendar, 
  FiEdit, 
  FiUsers, 
  FiBell, 
  FiFlag,
  FiMail 
} from 'react-icons/fi';
import { MessageSquare } from "lucide-react";
import { useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { ScheduleTourModal } from './modals/ScheduleTourModal';
import { UpdateStatusModal } from './modals/UpdateStatusModal';
import { AssignStaffModal } from './modals/AssignStaffModal';
import { AddNoteModal } from './modals/AddNoteModal';
import { SetReminderModal } from './modals/SetReminderModal';
import ConvertInquiryModal from './ConvertInquiryModal';

interface InquiryQuickActionsMenuProps {
  inquiryId: string;
  inquiryData: any;
  onUpdate?: () => void;
}

export function InquiryQuickActionsMenu({ 
  inquiryId, 
  inquiryData, 
  onUpdate 
}: InquiryQuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canConvert = useHasPermission(PERMISSIONS.INQUIRIES_CONVERT);
  const canUpdate = useHasPermission(PERMISSIONS.INQUIRIES_UPDATE);
  const canView = useHasPermission(PERMISSIONS.INQUIRIES_VIEW);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (actionId: string) => {
    setActiveModal(actionId);
    setIsOpen(false);
  };

  const handleModalClose = () => {
    setActiveModal(null);
    onUpdate?.();
  };

  const handleTogglePriority = async () => {
    setIsOpen(false);
    try {
      const response = await fetch(`/api/operator/inquiries/${inquiryId}/toggle-priority`, {
        method: 'PATCH',
      });
      
      if (!response.ok) throw new Error('Failed to toggle priority');
      
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling priority:', error);
    }
  };

  const actions = [
    { 
      id: 'convert', 
      label: 'Convert to Resident', 
      icon: <FiUserPlus className="w-4 h-4" />, 
      show: canConvert && inquiryData?.status !== 'CONVERTED',
      color: 'text-green-600'
    },
    { 
      id: 'schedule-tour', 
      label: 'Schedule Tour', 
      icon: <FiCalendar className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-blue-600'
    },
    { 
      id: 'update-status', 
      label: 'Update Status', 
      icon: <FiEdit className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-gray-700'
    },
    { 
      id: 'assign-staff', 
      label: 'Assign Staff', 
      icon: <FiUsers className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-purple-600'
    },
    { 
      id: 'add-note', 
      label: 'Add Note', 
      icon: <MessageSquare className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-gray-700'
    },
    { 
      id: 'set-reminder', 
      label: 'Set Reminder', 
      icon: <FiBell className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-orange-600'
    },
    { 
      id: 'toggle-priority', 
      label: inquiryData?.priority === 'HIGH' ? 'Remove Priority' : 'Mark as Priority', 
      icon: <FiFlag className="w-4 h-4" />, 
      show: canUpdate,
      color: 'text-red-600',
      action: handleTogglePriority
    },
  ].filter(action => action.show);

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Quick actions"
          aria-label="Quick actions menu"
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
            <div className="py-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => action.action ? action.action() : handleAction(action.id)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm ${action.color}`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'convert' && inquiryData && (
        <ConvertInquiryModal
          inquiry={inquiryData}
          onClose={handleModalClose}
          onSuccess={(residentId) => {
            handleModalClose();
          }}
        />
      )}
      
      {activeModal === 'schedule-tour' && (
        <ScheduleTourModal
          isOpen={true}
          onClose={handleModalClose}
          inquiryId={inquiryId}
          inquiryData={inquiryData}
        />
      )}
      
      {activeModal === 'update-status' && (
        <UpdateStatusModal
          isOpen={true}
          onClose={handleModalClose}
          inquiryId={inquiryId}
          currentStatus={inquiryData?.status}
        />
      )}
      
      {activeModal === 'assign-staff' && (
        <AssignStaffModal
          isOpen={true}
          onClose={handleModalClose}
          inquiryId={inquiryId}
          inquiryData={inquiryData}
        />
      )}
      
      {activeModal === 'add-note' && (
        <AddNoteModal
          isOpen={true}
          onClose={handleModalClose}
          inquiryId={inquiryId}
          inquiryData={inquiryData}
        />
      )}
      
      {activeModal === 'set-reminder' && (
        <SetReminderModal
          isOpen={true}
          onClose={handleModalClose}
          inquiryId={inquiryId}
          inquiryData={inquiryData}
        />
      )}
    </>
  );
}
