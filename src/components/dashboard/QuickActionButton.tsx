"use client";

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  href: string;
  color?: string;
}

export function QuickActionButton({
  label,
  icon: Icon,
  href,
  color = 'bg-primary-600 hover:bg-primary-700',
}: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className={`${color} text-white rounded-lg px-4 py-3 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
