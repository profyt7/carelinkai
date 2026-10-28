'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !isLoading && onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-md mx-4">
        <div className="bg-white rounded-xl shadow-modal p-6">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="absolute right-4 top-4 rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {variant === 'danger' && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
          )}

          <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
          <p className="text-sm text-neutral-500 mb-6">{description}</p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="inline-flex justify-center items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn(
                'inline-flex justify-center items-center px-4 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                variant === 'danger'
                  ? 'bg-error-600 hover:bg-error-700 focus:ring-error-500'
                  : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500'
              )}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
