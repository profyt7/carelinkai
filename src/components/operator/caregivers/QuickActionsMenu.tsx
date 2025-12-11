"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiMoreVertical,
  FiUserPlus,
  FiMail,
  FiEdit,
  FiCalendar,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { SendMessageModal } from './SendMessageModal';
import { AssignResidentModal } from './AssignResidentModal';
import { useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface QuickActionsMenuProps {
  caregiver: {
    id: string;
    userId: string;
    employmentStatus: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  onUpdate?: () => void;
}

export function QuickActionsMenu({ caregiver, onUpdate }: QuickActionsMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = useHasPermission(PERMISSIONS.CAREGIVERS_UPDATE);
  const canAssign = useHasPermission(PERMISSIONS.CAREGIVER_ASSIGNMENTS_CREATE);

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

  const handleToggleStatus = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to update caregiver status');
      return;
    }

    const newStatus = caregiver.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this caregiver?`)) {
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`/api/operator/caregivers/${caregiver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employmentStatus: newStatus }),
      });

      if (!res.ok) throw new Error(`Failed to ${action} caregiver`);

      toast.success(`Caregiver ${action}d successfully`);
      onUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error(`Error ${action}ing caregiver:`, error);
      toast.error(`Failed to ${action} caregiver`);
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    router.push(`/operator/caregivers/${caregiver.id}`);
    setIsOpen(false);
  };

  const handleViewSchedule = () => {
    router.push(`/operator/schedule?caregiver=${caregiver.id}`);
    setIsOpen(false);
  };

  const handleSendMessage = () => {
    setShowMessageModal(true);
    setIsOpen(false);
  };

  const handleAssign = () => {
    setShowAssignModal(true);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          title="Quick actions"
        >
          <FiMoreVertical className="w-5 h-5 text-neutral-600" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-neutral-200 shadow-lg z-50">
            <div className="py-1">
              {canAssign && (
                <button
                  onClick={handleAssign}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
                >
                  <FiUserPlus className="w-4 h-4" />
                  Assign to Resident
                </button>
              )}

              <button
                onClick={handleSendMessage}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
              >
                <FiMail className="w-4 h-4" />
                Send Message
              </button>

              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
                >
                  <FiEdit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}

              <button
                onClick={handleViewSchedule}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3"
              >
                <FiCalendar className="w-4 h-4" />
                View Schedule
              </button>

              {canEdit && (
                <>
                  <div className="border-t border-neutral-200 my-1"></div>
                  
                  <button
                    onClick={handleToggleStatus}
                    disabled={updating}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${
                      caregiver.employmentStatus === 'ACTIVE'
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {caregiver.employmentStatus === 'ACTIVE' ? (
                      <>
                        <FiUserX className="w-4 h-4" />
                        {updating ? 'Deactivating...' : 'Deactivate'}
                      </>
                    ) : (
                      <>
                        <FiUserCheck className="w-4 h-4" />
                        {updating ? 'Activating...' : 'Activate'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showMessageModal && (
        <SendMessageModal
          recipientId={caregiver.userId}
          recipientName={`${caregiver.user.firstName} ${caregiver.user.lastName}`}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {showAssignModal && (
        <AssignResidentModal
          caregiverId={caregiver.id}
          caregiverName={`${caregiver.user.firstName} ${caregiver.user.lastName}`}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            onUpdate?.();
            setShowAssignModal(false);
          }}
        />
      )}
    </>
  );
}
