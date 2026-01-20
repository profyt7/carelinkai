'use client';

import { ReactNode, useEffect, useState, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion, durations } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { FiLoader } from 'react-icons/fi';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles = {
  primary:
    'bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white hover:opacity-90 shadow-md hover:shadow-lg',
  secondary: 'bg-[#3978FC] text-white hover:bg-[#3167d4] shadow-sm hover:shadow-md',
  outline:
    'border-2 border-neutral-300 bg-white text-neutral-900 hover:border-[#3978FC] hover:bg-neutral-50',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-8 py-3.5 text-lg',
};

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  const baseStyles = cn(
    'inline-flex items-center justify-center font-semibold rounded-lg',
    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3978FC]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  const content = (
    <>
      {isLoading && (
        <FiLoader className="animate-spin mr-2 h-4 w-4" />
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  // Avoid hydration mismatch
  if (!mounted || reducedMotion) {
    return (
      <button className={baseStyles} disabled={disabled || isLoading} {...props}>
        {content}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ duration: durations.fast }}
      className={baseStyles}
      disabled={disabled || isLoading}
      type={props.type}
      onClick={props.onClick}
    >
      {content}
    </motion.button>
  );
}
