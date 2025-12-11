'use client';

import { useState, useRef, useEffect } from 'react';
import { FiMoreVertical, FiUserPlus, FiCalendar, FiAlertTriangle, FiActivity, FiEdit, FiMessageSquare, FiUsers } from 'react-icons/fi';
import { useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { AssignCaregiverModal } from './modals/AssignCaregiverModal';
import { ScheduleAssessmentModal } from './modals/ScheduleAssessmentModal';
import { AddIncidentModal } from './modals/AddIncidentModal';
import { UpdateCareLevelModal } from './modals/UpdateCareLevelModal';
import { UpdateStatusModal } from './modals/UpdateStatusModal';
import { AddCareNoteModal } from './modals/AddCareNoteModal';

interface ResidentQuickActionsMenuProps {
  residentId: string;
  residentName: string;
  onUpdate?: () => void;
}

export function ResidentQuickActionsMenu({ residentId, residentName, onUpdate }: ResidentQuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canAssign = useHasPermission(PERMISSIONS.CAREGIVER_ASSIGNMENTS_CREATE);
  const canScheduleAssessment = useHasPermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const canAddIncident = useHasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const canUpdateCareLevel = useHasPermission(PERMISSIONS.RESIDENTS_UPDATE);
  const canUpdateStatus = useHasPermission(PERMISSIONS.RESIDENTS_UPDATE);
  const canAddNote = useHasPermission(PERMISSIONS.CARE_NOTES_CREATE);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (actionId: string) => {
    setActiveModal(actionId);
    setIsOpen(false);
  };

  const handleModalClose = () => {
    setActiveModal(null);
    onUpdate?.();
  };

  const actions = [
    { id: 'assign-caregiver', label: 'Assign Caregiver', icon: <FiUserPlus className="w-4 h-4" />, show: canAssign },
    { id: 'schedule-assessment', label: 'Schedule Assessment', icon: <FiCalendar className="w-4 h-4" />, show: canScheduleAssessment },
    { id: 'add-incident', label: 'Add Incident Report', icon: <FiAlertTriangle className="w-4 h-4" />, show: canAddIncident },
    { id: 'update-care-level', label: 'Update Care Level', icon: <FiActivity className="w-4 h-4" />, show: canUpdateCareLevel },
    { id: 'update-status', label: 'Update Status', icon: <FiEdit className="w-4 h-4" />, show: canUpdateStatus },
    { id: 'add-note', label: 'Add Care Note', icon: <FiMessageSquare className="w-4 h-4" />, show: canAddNote },
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
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
            <div className="py-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
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
      {activeModal === 'assign-caregiver' && (
        <AssignCaregiverModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
          residentName={residentName}
        />
      )}
      {activeModal === 'schedule-assessment' && (
        <ScheduleAssessmentModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
          residentName={residentName}
        />
      )}
      {activeModal === 'add-incident' && (
        <AddIncidentModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
          residentName={residentName}
        />
      )}
      {activeModal === 'update-care-level' && (
        <UpdateCareLevelModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
        />
      )}
      {activeModal === 'update-status' && (
        <UpdateStatusModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
        />
      )}
      {activeModal === 'add-note' && (
        <AddCareNoteModal
          isOpen={true}
          onClose={handleModalClose}
          residentId={residentId}
          residentName={residentName}
        />
      )}
    </>
  );
}
