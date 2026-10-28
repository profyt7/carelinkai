'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'white' | 'neutral';
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

const colorStyles = {
  primary: 'border-[#3978FC] border-t-transparent',
  white: 'border-white border-t-transparent',
  neutral: 'border-neutral-400 border-t-transparent',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  color = 'primary',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizeStyles[size],
        colorStyles[color],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full page loading overlay
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-neutral-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Inline loading for buttons etc
export function InlineSpinner({ className = '' }: { className?: string }) {
  return <LoadingSpinner size="sm" className={className} />;
}
