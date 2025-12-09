"use client";

import Link from 'next/link';
import { FiPlus, FiDownload, FiEdit, FiTrash } from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface ResidentsListActionsProps {
  residentId?: string;
  showDelete?: boolean;
}

/**
 * Client component for Residents List Actions with permission guards
 */
export function NewResidentButton() {
  return (
    <PermissionGuard permission={PERMISSIONS.RESIDENTS_CREATE}>
      <Link 
        href="/operator/residents/new" 
        className="btn bg-primary-600 hover:bg-primary-700 text-white inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm"
      >
        <FiPlus className="w-4 h-4" />
        <span>New Resident</span>
      </Link>
    </PermissionGuard>
  );
}

/**
 * Export button with permission guard
 */
export function ExportResidentsButton({ 
  q, 
  status, 
  homeId, 
  familyId 
}: { 
  q?: string; 
  status?: string; 
  homeId?: string; 
  familyId?: string; 
}) {
  return (
    <PermissionGuard permission={PERMISSIONS.RESIDENTS_VIEW}>
      <a 
        className="btn btn-sm border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg inline-flex items-center gap-2" 
        download="residents.csv" 
        href={`/api/residents?limit=1000${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}${homeId ? `&homeId=${encodeURIComponent(homeId)}` : ''}${familyId ? `&familyId=${encodeURIComponent(familyId)}` : ''}&format=csv`}
      >
        <FiDownload className="w-4 h-4" />
        <span>Export</span>
      </a>
    </PermissionGuard>
  );
}

/**
 * Edit button with permission guard
 */
export function EditResidentButton({ residentId }: { residentId: string }) {
  return (
    <PermissionGuard 
      permission={PERMISSIONS.RESIDENTS_UPDATE}
      fallback={
        <span className="text-neutral-400 cursor-not-allowed inline-flex items-center gap-1" title="You don't have permission to edit">
          <FiEdit className="w-4 h-4" />
          Edit
        </span>
      }
    >
      <Link 
        href={`/operator/residents/${residentId}/edit`} 
        className="text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
      >
        <FiEdit className="w-4 h-4" />
        Edit
      </Link>
    </PermissionGuard>
  );
}

/**
 * Delete button with permission guard (for future implementation)
 */
export function DeleteResidentButton({ residentId }: { residentId: string }) {
  return (
    <PermissionGuard permission={PERMISSIONS.RESIDENTS_DELETE}>
      <button 
        className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
        onClick={() => {
          // TODO: Implement delete functionality
          console.log('Delete resident:', residentId);
        }}
      >
        <FiTrash className="w-4 h-4" />
        Delete
      </button>
    </PermissionGuard>
  );
}

/**
 * Row actions with permission-based rendering
 */
export function ResidentRowActions({ residentId }: { residentId: string }) {
  return (
    <div className="flex items-center gap-3 justify-end">
      <Link 
        href={`/operator/residents/${residentId}`} 
        className="text-primary-600 hover:text-primary-900"
      >
        View
      </Link>
      <EditResidentButton residentId={residentId} />
    </div>
  );
}
