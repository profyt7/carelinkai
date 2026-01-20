'use client';

import { InputHTMLAttributes, useEffect, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion, durations } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, success, leftIcon, className = '', ...props }, ref) => {
    const [mounted, setMounted] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      setMounted(true);
      setReducedMotion(prefersReducedMotion());
    }, []);

    const inputStyles = cn(
      'w-full px-4 py-2.5 rounded-lg border bg-white',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      error
        ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
        : success
        ? 'border-green-500 focus:ring-green-200 focus:border-green-500'
        : 'border-neutral-300 focus:ring-[#3978FC]/20 focus:border-[#3978FC]',
      leftIcon && 'pl-10',
      className
    );

    // Simple render without animations
    if (!mounted || reducedMotion) {
      return (
        <div className="space-y-1.5">
          {label && (
            <label className="block text-sm font-medium text-neutral-700">
              {label}
            </label>
          )}
          <div className="relative">
            {leftIcon && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {leftIcon}
              </span>
            )}
            <input ref={ref} className={inputStyles} {...props} />
            {success && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <FiCheck />
              </span>
            )}
          </div>
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <FiAlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {label && (
          <motion.label
            className="block text-sm font-medium text-neutral-700"
            animate={{
              color: isFocused ? '#3978FC' : '#404040',
            }}
            transition={{ duration: durations.fast }}
          >
            {label}
          </motion.label>
        )}
        <div className="relative">
          {leftIcon && (
            <motion.span
              className="absolute left-3 top-1/2 -translate-y-1/2"
              animate={{
                color: isFocused ? '#3978FC' : '#9ca3af',
              }}
              transition={{ duration: durations.fast }}
            >
              {leftIcon}
            </motion.span>
          )}
          <input
            ref={ref}
            className={inputStyles}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          <AnimatePresence>
            {success && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              >
                <FiCheck />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="flex items-center gap-1 text-sm text-red-600 overflow-hidden"
            >
              <FiAlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

export default AnimatedInput;
