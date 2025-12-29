"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiUser, FiCalendar, FiStar } from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { AssignResidentModal } from './AssignResidentModal';

interface AssignmentsTabProps {
  caregiverId: string;
}

type Assignment = {
  id: string;
  isPrimary: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  notes?: string | null;
  resident: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    photoUrl?: string | null;
  };
  createdAt: Date | string;
};

export function AssignmentsTab({ caregiverId }: AssignmentsTabProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, [caregiverId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/assignments`);
      if (!res.ok) throw new Error('Failed to fetch assignments');
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/assignments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove assignment');

      toast.success('Assignment removed successfully');
      fetchAssignments();
      router.refresh();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const handleSuccess = () => {
    fetchAssignments();
    setShowModal(false);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Resident Assignments</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Manage resident assignments for this caregiver
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.CAREGIVERS_ASSIGN}>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Assign Resident
          </button>
        </PermissionGuard>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <FiUser className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No assignments yet</h3>
          <p className="text-neutral-600 mb-6">
            Assign residents to this caregiver to manage their care responsibilities
          </p>
          <PermissionGuard permission={PERMISSIONS.CAREGIVERS_ASSIGN}>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Assign First Resident
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => {
            const { resident } = assignment;
            const residentName = `${resident.firstName} ${resident.lastName}`;
            const isActive = !assignment.endDate;

            return (
              <div
                key={assignment.id}
                className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
                  isActive ? 'border-neutral-200' : 'border-neutral-200 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <Link href={`/operator/residents/${resident.id}`}>
                    {resident.photoUrl ? (
                      <img
                        src={resident.photoUrl}
                        alt={residentName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200 hover:border-primary-300 transition-colors"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 transition-colors">
                        <FiUser className="w-8 h-8 text-neutral-500" />
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/operator/residents/${resident.id}`}
                          className="text-base font-semibold text-neutral-900 hover:text-primary-600 transition-colors"
                        >
                          {residentName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-600">{resident.status}</span>
                          {assignment.isPrimary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              <FiStar className="w-3 h-3" />
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1 mb-3">
                      {assignment.startDate && (
                        <div className="flex items-center gap-2 text-xs text-neutral-600">
                          <FiCalendar className="w-3 h-3" />
                          <span>
                            Started: {new Date(assignment.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {assignment.endDate && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <FiCalendar className="w-3 h-3" />
                          <span>Ended: {new Date(assignment.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {assignment.notes && (
                      <p className="text-sm text-neutral-700 mb-3 line-clamp-2">
                        {assignment.notes}
                      </p>
                    )}

                    {/* Actions */}
                    {isActive && (
                      <PermissionGuard permission={PERMISSIONS.CAREGIVERS_ASSIGN}>
                        <button
                          onClick={() => handleRemove(assignment.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <FiTrash2 className="w-3 h-3" />
                          Remove Assignment
                        </button>
                      </PermissionGuard>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <AssignResidentModal
          caregiverId={caregiverId}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
