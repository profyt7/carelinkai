import React from 'react';
import Link from 'next/link';
import { IconType } from 'react-icons';

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      {Icon && (
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-neutral-100 mb-4">
          <Icon className="h-8 w-8 text-neutral-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 max-w-md mx-auto mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
