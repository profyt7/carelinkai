"use client";

import Link from 'next/link';
import { FiEdit, FiFileText, FiEye } from 'react-icons/fi';
import { PermissionGuard, RoleGuard, useUserRole } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface ResidentDetailActionsProps {
  residentId: string;
  residentName: string;
  showArchiveButton?: boolean;
}

/**
 * Edit button with permission guard
 */
export function EditResidentDetailButton({ residentId }: { residentId: string }) {
  return (
    <PermissionGuard 
      permission={PERMISSIONS.RESIDENTS_UPDATE}
      fallback={
        <div className="relative group">
          <button 
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-400 bg-neutral-50 cursor-not-allowed"
          >
            <FiEye className="w-4 h-4" />
            <span>View Only</span>
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
            <div className="bg-neutral-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              You don't have permission to edit
            </div>
          </div>
        </div>
      }
    >
      <Link 
        href={`/operator/residents/${residentId}/edit`} 
        className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <FiEdit className="w-4 h-4" />
        <span>Edit</span>
      </Link>
    </PermissionGuard>
  );
}

/**
 * Summary PDF button (always visible)
 */
export function SummaryPDFButton({ residentId }: { residentId: string }) {
  return (
    <a 
      href={`/api/residents/${residentId}/summary`} 
      target="_blank" 
      className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
    >
      <FiFileText className="w-4 h-4" />
      <span>Summary PDF</span>
    </a>
  );
}

/**
 * Read-only badge for family members
 */
export function ReadOnlyBadge() {
  const userRole = useUserRole();
  
  if (userRole !== 'FAMILY') {
    return null;
  }
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-800">
      <FiEye className="w-4 h-4" />
      <span>View Only</span>
    </div>
  );
}

/**
 * Complete action bar for resident detail page
 */
export function ResidentDetailActionsBar({ residentId, residentName, showArchiveButton }: ResidentDetailActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <ReadOnlyBadge />
      <EditResidentDetailButton residentId={residentId} />
      <SummaryPDFButton residentId={residentId} />
      {showArchiveButton && (
        <PermissionGuard permission={PERMISSIONS.RESIDENTS_DELETE}>
          <span className="text-gray-400 text-sm">Archive button</span>
        </PermissionGuard>
      )}
    </div>
  );
}
