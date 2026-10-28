import Link from 'next/link';
import { ReactNode } from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export function QuickActionCard({ title, description, href, icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="block p-6 bg-white rounded-lg border border-neutral-200 hover:border-primary-500 hover:shadow-md transition-all"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </Link>
  );
}
