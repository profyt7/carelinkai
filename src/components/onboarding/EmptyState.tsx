'use client';

import { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';
import Link from 'next/link';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
        {icon || <FiInbox className="text-neutral-400 text-4xl" />}
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600 text-center max-w-md mb-6">{description}</p>
      {(actionLabel && (actionLink || onAction)) && (
        <>
          {actionLink ? (
            <Link
              href={actionLink}
              className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
