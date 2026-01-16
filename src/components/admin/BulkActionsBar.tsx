'use client';

import { useState } from 'react';
import { FiTrash2, FiCheck, FiX, FiChevronDown, FiAlertTriangle } from 'react-icons/fi';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  requireConfirmation?: boolean;
  confirmationMessage?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onAction: (actionId: string) => Promise<void>;
  onClearSelection: () => void;
  loading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  actions,
  onAction,
  onClearSelection,
  loading = false,
}: BulkActionsBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: BulkAction) => {
    setShowDropdown(false);
    
    if (action.requireConfirmation) {
      setConfirmAction(action);
      return;
    }
    
    await executeAction(action.id);
  };

  const executeAction = async (actionId: string) => {
    setActionLoading(true);
    try {
      await onAction(actionId);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const getVariantClasses = (variant: string = 'default') => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50';
      case 'success':
        return 'text-green-600 hover:bg-green-50';
      case 'warning':
        return 'text-amber-600 hover:bg-amber-50';
      default:
        return 'text-neutral-700 hover:bg-neutral-100';
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-blue-800 font-medium">
            {selectedCount} of {totalCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Clear selection
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading || actionLoading}
            className="bg-white border border-neutral-300 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                Bulk Actions
                <FiChevronDown className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 ${getVariantClasses(action.variant)}`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <FiAlertTriangle className="text-red-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Confirm Action</h3>
            </div>
            <p className="text-neutral-600 mb-6">
              {confirmAction.confirmationMessage || 
                `Are you sure you want to ${confirmAction.label.toLowerCase()} ${selectedCount} item(s)? This action cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction(confirmAction.id)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BulkActionsBar;
